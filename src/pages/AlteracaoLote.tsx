import { useEffect, useMemo, useRef, useState } from 'react';
import { useModule } from '@/context/ModuleContext';
import UploadDropzone from '@/components/shared/UploadDropzone';
import ProgressBar from '@/components/shared/ProgressBar';
import { Download, AlertCircle, CheckCircle } from 'lucide-react';

type AlteracaoTipo = 'cclass' | 'descricao' | 'icms' | 'cclass_remove';
type OpStatus = 'idle' | 'processing' | 'completed' | 'error';

interface SessionState {
  status: OpStatus;
  progress: number;
  message: string;
  sessionId?: string;
  error?: string;
}

const initialSession: SessionState = { status: 'idle', progress: 0, message: '' };

export default function AlteracaoLote() {
  const { activeModule } = useModule();
  const [tipoAlteracao, setTipoAlteracao] = useState<AlteracaoTipo>('cclass');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [removerDesconto, setRemoverDesconto] = useState(false);
  const [removerOutros, setRemoverOutros] = useState(false);
  const [regrasCclassCfop, setRegrasCclassCfop] = useState('');
  const [regrasDescricaoCclass, setRegrasDescricaoCclass] = useState('');
  const [icmsTipo, setIcmsTipo] = useState('ICMS90');
  const [listaCclass, setListaCclass] = useState('');
  const [session, setSession] = useState<SessionState>(initialSession);
  const pollingRef = useRef<number | null>(null);

  const endpointMap = useMemo(
    () => ({
      cclass: '/api/lote',
      descricao: '/api/csv',
      icms: '/api/sessao',
      cclass_remove: '/api/cclass-remove',
    }),
    [],
  );

  useEffect(() => () => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const setError = (error: string) => setSession({ status: 'error', progress: 0, message: '', error });

  const handleZip = (files: File[]) => {
    const file = files.find((f) => f.name.toLowerCase().endsWith('.zip')) ?? null;
    setZipFile(file);
    if (!file) setError('Selecione um arquivo .zip válido.');
  };

  const pollStatus = (tipo: AlteracaoTipo, sessionId: string) => {
    const base = endpointMap[tipo];
    stopPolling();

    pollingRef.current = window.setInterval(async () => {
      try {
        const statusUrl =
          tipo === 'descricao'
            ? `/lote-descricao/status?session_id=${encodeURIComponent(sessionId)}`
            : `${base}/status/${encodeURIComponent(sessionId)}`;

        const res = await fetch(statusUrl);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || data?.error || 'Erro ao consultar status.');

        const progress = Number(data.progress ?? 0);
        const status = String(data.status ?? 'processing');

        setSession((prev) => ({
          ...prev,
          status: status === 'completed' ? 'completed' : 'processing',
          progress,
          message: data.message || `Processando ${progress.toFixed(0)}%...`,
        }));

        if (status === 'completed') stopPolling();
        if (status === 'error') {
          stopPolling();
          setError(data.error || data.message || 'Falha no processamento.');
        }
      } catch (error) {
        stopPolling();
        setError((error as Error).message);
      }
    }, 1500);
  };

  const onSubmit = async () => {
    try {
      if (!zipFile) {
        setError('Selecione um ZIP com XMLs.');
        return;
      }
      if (tipoAlteracao === 'cclass' && !regrasCclassCfop.trim()) return setError('Informe regras cClass;CFOP.');
      if (tipoAlteracao === 'descricao' && !regrasDescricaoCclass.trim()) return setError('Informe regras descricao;cClass.');
      if (tipoAlteracao === 'icms') {
        const upper = icmsTipo.trim().toUpperCase();
        if (!upper.startsWith('ICMS')) return setError('ICMS deve iniciar com ICMS. Ex: ICMS90');
        setIcmsTipo(upper);
      }
      if (tipoAlteracao === 'cclass_remove' && !listaCclass.trim()) return setError('Informe ao menos uma cClass.');

      const formData = new FormData();
      formData.append('zip_xmls', zipFile);

      if (tipoAlteracao === 'cclass') {
        formData.append('remover_desconto', String(removerDesconto));
        formData.append('remover_outros', String(removerOutros));
        formData.append('regras_cclass_cfop', regrasCclassCfop);
      }
      if (tipoAlteracao === 'descricao') formData.append('regras_descricao_cclass', regrasDescricaoCclass);
      if (tipoAlteracao === 'icms') formData.append('icms_tipo', icmsTipo.trim().toUpperCase());
      if (tipoAlteracao === 'cclass_remove') formData.append('lista_cclass', listaCclass);

      setSession({ status: 'processing', progress: 5, message: 'Enviando arquivo...' });

      const res = await fetch(`${endpointMap[tipoAlteracao]}/processar`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || 'Falha ao iniciar processamento.');

      const sessionId = data.session_id as string;
      setSession({ status: 'processing', progress: 10, message: 'Processamento iniciado...', sessionId });
      pollStatus(tipoAlteracao, sessionId);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const onDownload = () => {
    if (!session.sessionId) return;
    const base = endpointMap[tipoAlteracao];
    window.open(`${base}/baixar/${encodeURIComponent(session.sessionId)}`, '_blank');
  };

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Alteração em Lote</h1>
        <p className="text-sm text-[#94a3b8]">Processamento de XML em lote por sessão ({activeModule})</p>
      </div>

      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5 space-y-4">
        <div>
          <label htmlFor="tipoAlteracao" className="mb-1 block text-xs text-[#94a3b8]">Tipo de Alteração</label>
          <select id="tipoAlteracao" value={tipoAlteracao} onChange={(e) => setTipoAlteracao(e.target.value as AlteracaoTipo)} className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#f1f5f9]">
            <option value="cclass">Alteração por cClass / CFOP</option>
            <option value="descricao">Alteração por Descrição</option>
            <option value="icms">Remover CFOP por ICMS</option>
            <option value="cclass_remove">Remover CFOP por cClass</option>
          </select>
        </div>

        <UploadDropzone onFilesSelected={handleZip} accept=".zip" label="Arraste o ZIP com XMLs" sublabel={zipFile ? `Selecionado: ${zipFile.name}` : 'Somente .zip'} />

        <div id="bloco-cclass" className={tipoAlteracao === 'cclass' ? 'space-y-3' : 'hidden'}>
          <div className="flex gap-4">
            <label className="text-sm text-[#cbd5e1]"><input type="checkbox" checked={removerDesconto} onChange={(e) => setRemoverDesconto(e.target.checked)} /> Remover vDesc</label>
            <label className="text-sm text-[#cbd5e1]"><input type="checkbox" checked={removerOutros} onChange={(e) => setRemoverOutros(e.target.checked)} /> Remover vOutro</label>
          </div>
          <textarea value={regrasCclassCfop} onChange={(e) => setRegrasCclassCfop(e.target.value)} rows={6} placeholder="0600601;5102" className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#f1f5f9]" />
        </div>

        <div id="bloco-descricao" className={tipoAlteracao === 'descricao' ? 'space-y-3' : 'hidden'}>
          <textarea value={regrasDescricaoCclass} onChange={(e) => setRegrasDescricaoCclass(e.target.value)} rows={6} placeholder="INTERNET DEDICADA;0700707" className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#f1f5f9]" />
        </div>

        <div id="bloco-icms" className={tipoAlteracao === 'icms' ? 'space-y-3' : 'hidden'}>
          <input value={icmsTipo} onChange={(e) => setIcmsTipo(e.target.value.toUpperCase())} placeholder="ICMS90" className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#f1f5f9]" />
        </div>

        <div id="bloco-cclass-remove" className={tipoAlteracao === 'cclass_remove' ? 'space-y-3' : 'hidden'}>
          <textarea value={listaCclass} onChange={(e) => setListaCclass(e.target.value)} rows={6} placeholder={'0600601\n0700707'} className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#f1f5f9]" />
        </div>

        <button onClick={onSubmit} className="rounded-lg bg-[#38bdf8] px-4 py-2 text-sm font-semibold text-[#0f172a] hover:bg-[#0ea5e9]">Processar ZIP</button>

        {session.status === 'processing' && <ProgressBar progress={session.progress} message={session.message} status="processing" />}
        {session.status === 'completed' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#22c55e]"><CheckCircle className="h-4 w-4" />Processamento concluído.</div>
            <button onClick={onDownload} className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a]"><Download className="h-4 w-4" />Baixar ZIP processado</button>
          </div>
        )}
        {session.status === 'error' && <div className="flex items-center gap-2 text-sm text-[#ef4444]"><AlertCircle className="h-4 w-4" />{session.error}</div>}
      </div>
    </div>
  );
}
