import { useState, useCallback, useMemo } from 'react';
import { useModule } from '@/context/ModuleContext';
import { processZipFile } from '@/parsers/zipProcessor';
import { parseNFEItensFlat } from '@/parsers/nfeParser';
import { parseNFCEItensFlat } from '@/parsers/nfceParser';
import UploadDropzone from '@/components/shared/UploadDropzone';
import ProgressBar from '@/components/shared/ProgressBar';
import KpiCard from '@/components/shared/KpiCard';
import {
  FileText,
  FolderOpen,
  DollarSign,
  BarChart3,
  Search,
  Printer,
  Download,
  AlertCircle,
} from 'lucide-react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

interface CSTItem {
  cst: string;
  ncm: string;
  cfop: string;
  produto: string;
  baseCalc: number;
  icms: number;
  icmsST: number;
  valorTotal: number;
  aliquota: number;
  cClass: string;
}

interface CSTSummary {
  cst: string;
  descricao: string;
  quantidade: number;
  baseCalc: number;
  icms: number;
  icmsST: number;
  valorTotal: number;
}

export default function RelatorioCST() {
  const { activeModule } = useModule();
  const [items, setItems] = useState<CSTItem[]>([]);
  const [notasCount, setNotasCount] = useState(0);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string; status: 'idle' | 'processing' | 'completed' | 'error' }>({ current: 0, total: 0, message: '', status: 'idle' });
  const [filter, setFilter] = useState('');

  if (activeModule !== 'nfe' && activeModule !== 'nfce') {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#f59e0b]" />
        <h1 className="text-xl font-bold text-[#f1f5f9]">Módulo não suportado</h1>
        <p className="mt-2 text-[#94a3b8]">O relatório CST está disponível apenas para NF-e e NFC-e. Selecione um desses módulos no navbar.</p>
      </div>
    );
  }

  const handleFiles = useCallback(async (files: File[]) => {
    const zipFile = files.find(f => f.name.endsWith('.zip'));
    if (!zipFile) {
      setProgress({ current: 0, total: 0, message: 'Selecione um ZIP', status: 'idle' });
      return;
    }
    setProgress({ current: 0, total: 100, message: 'Iniciando...', status: 'idle' });

    try {
      const result = await processZipFile(zipFile, activeModule, (current, total, message) => {
        setProgress({ current, total, message, status: 'idle' });
      });

      const allItems: CSTItem[] = [];
      result.notas.forEach(nota => {
        if (nota.xmlContent) {
          const flat = activeModule === 'nfe'
            ? parseNFEItensFlat(nota.xmlContent)
            : parseNFCEItensFlat(nota.xmlContent);
          allItems.push(...flat);
        }
      });

      setItems(allItems);
      setNotasCount(result.processedFiles);
      setProgress({ current: result.processedFiles, total: result.totalFiles, message: 'Concluido!', status: 'completed' as const });
    } catch (err) {
      setProgress({ current: 0, total: 0, message: (err as Error).message, status: 'idle' });
    }
  }, [activeModule]);

  const cstSummary = useMemo<CSTSummary[]>(() => {
    const map = new Map<string, CSTSummary>();
    items.forEach(item => {
      if (!map.has(item.cst)) {
        map.set(item.cst, { cst: item.cst, descricao: getCSTDesc(item.cst), quantidade: 0, baseCalc: 0, icms: 0, icmsST: 0, valorTotal: 0 });
      }
      const s = map.get(item.cst)!;
      s.quantidade++;
      s.baseCalc += item.baseCalc;
      s.icms += item.icms;
      s.icmsST += item.icmsST;
      s.valorTotal += item.valorTotal;
    });
    return Array.from(map.values()).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [items]);

  const totalValor = useMemo(() => items.reduce((s, i) => s + i.valorTotal, 0), [items]);
  const totalICMS = useMemo(() => items.reduce((s, i) => s + i.icms, 0), [items]);

  const filteredItems = useMemo(() => {
    let data = items;
    if (filter) {
      const f = filter.toLowerCase();
      data = data.filter(i =>
        i.cst.includes(f) || i.ncm.includes(f) || i.cfop.includes(f) ||
        i.produto.toLowerCase().includes(f) || i.cClass.toLowerCase().includes(f)
      );
    }
    return data;
  }, [items, filter]);

  const exportCSV = () => {
    const csv = Papa.unparse(items, { delimiter: ';' });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `relatorio_cst_${activeModule}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#f1f5f9]">
            Relatório CST {activeModule === 'nfe' ? 'NF-e' : 'NFC-e'}
          </h1>
          <p className="text-sm text-[#94a3b8]">Faça upload de um ZIP com XMLs para análise de CST</p>
        </div>
        <UploadDropzone onFilesSelected={handleFiles} accept=".zip" label="Arraste um ZIP com XMLs aqui" sublabel={`XMLs de ${activeModule === 'nfe' ? 'NF-e modelo 55' : 'NFC-e modelo 65'}`} />
        {progress.total > 0 && (
          <div className="mt-6">
            <ProgressBar progress={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} message={progress.message} status="processing" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">
            Relatório CST {activeModule === 'nfe' ? 'NF-e' : 'NFC-e'}
          </h1>
          <p className="text-sm text-[#94a3b8]">{notasCount} notas, {items.length} itens</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1e293b] px-4 py-2 text-sm text-[#f1f5f9] hover:bg-[#334155]">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg bg-[#38bdf8] px-4 py-2 text-sm font-medium text-[#0f172a] hover:bg-[#0ea5e9]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={() => { setItems([]); setProgress({ current: 0, total: 0, message: '', status: 'idle' }); }} className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1e293b] px-4 py-2 text-sm text-[#f1f5f9] hover:bg-[#334155]">
            Novo Upload
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FolderOpen} label="Total Notas" value={notasCount} color="#38bdf8" />
        <KpiCard icon={DollarSign} label="Valor Total" value={formatCurrency(totalValor)} color="#22c55e" />
        <KpiCard icon={BarChart3} label="Total ICMS" value={formatCurrency(totalICMS)} color="#f59e0b" />
        <KpiCard icon={FileText} label="Total Itens" value={items.length} color="#8b5cf6" />
      </div>

      <div className="mb-6 rounded-xl border border-[#334155] bg-[#1e293b] p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#f1f5f9]">Resumo por CST</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="py-2 text-left text-[#94a3b8]">CST</th>
                <th className="py-2 text-left text-[#94a3b8]">Descrição</th>
                <th className="py-2 text-right text-[#94a3b8]">Qtd</th>
                <th className="py-2 text-right text-[#94a3b8]">Base Calc</th>
                <th className="py-2 text-right text-[#94a3b8]">ICMS</th>
                <th className="py-2 text-right text-[#94a3b8]">ICMS ST</th>
                <th className="py-2 text-right text-[#94a3b8]">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {cstSummary.map((s, idx) => (
                <tr key={idx} className="border-b border-[#334155]/50 hover:bg-[#0f172a]/50">
                  <td className="py-2 font-mono font-medium text-[#f59e0b]">{s.cst}</td>
                  <td className="py-2 text-[#94a3b8]">{s.descricao}</td>
                  <td className="py-2 text-right text-[#f1f5f9]">{s.quantidade}</td>
                  <td className="py-2 text-right text-[#f1f5f9]">{formatCurrency(s.baseCalc)}</td>
                  <td className="py-2 text-right font-medium text-[#ef4444]">{formatCurrency(s.icms)}</td>
                  <td className="py-2 text-right text-[#f59e0b]">{formatCurrency(s.icmsST)}</td>
                  <td className="py-2 text-right font-medium text-[#22c55e]">{formatCurrency(s.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-[#f1f5f9]">Itens Detalhados ({filteredItems.length})</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input type="text" placeholder="Filtrar..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full rounded-lg border border-[#334155] bg-[#0f172a] py-2 pl-9 pr-3 text-sm text-[#f1f5f9] placeholder-[#475569] focus:border-[#38bdf8] focus:outline-none sm:w-72" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="py-2 text-left text-[#94a3b8]">Produto</th>
                <th className="py-2 text-left text-[#94a3b8]">NCM</th>
                <th className="py-2 text-left text-[#94a3b8]">CFOP</th>
                <th className="py-2 text-left text-[#94a3b8]">cClass</th>
                <th className="py-2 text-center text-[#94a3b8]">CST</th>
                <th className="py-2 text-right text-[#94a3b8]">Alíq</th>
                <th className="py-2 text-right text-[#94a3b8]">Base Calc</th>
                <th className="py-2 text-right text-[#94a3b8]">ICMS</th>
                <th className="py-2 text-right text-[#94a3b8]">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.slice(0, 200).map((item, idx) => (
                <tr key={idx} className="border-b border-[#334155]/50 hover:bg-[#0f172a]/50">
                  <td className="max-w-[200px] truncate py-2 text-[#f1f5f9]">{item.produto}</td>
                  <td className="py-2 font-mono text-[#94a3b8]">{item.ncm}</td>
                  <td className="py-2 font-mono text-[#f59e0b]">{item.cfop}</td>
                  <td className="py-2 text-[#38bdf8]">{item.cClass}</td>
                  <td className="py-2 text-center font-mono font-medium text-[#ef4444]">{item.cst}</td>
                  <td className="py-2 text-right text-[#94a3b8]">{item.aliquota.toFixed(2)}%</td>
                  <td className="py-2 text-right text-[#f1f5f9]">{formatCurrency(item.baseCalc)}</td>
                  <td className="py-2 text-right font-medium text-[#ef4444]">{formatCurrency(item.icms)}</td>
                  <td className="py-2 text-right font-medium text-[#22c55e]">{formatCurrency(item.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredItems.length > 200 && (
          <p className="mt-3 text-center text-xs text-[#94a3b8]">Exibindo 200 de {filteredItems.length} itens.</p>
        )}
      </div>
    </div>
  );
}

function getCSTDesc(cst: string): string {
  const map: Record<string, string> = {
    '00': 'Tributada integralmente',
    '10': 'Tributada com ICMS ST',
    '20': 'Com reducao de base calc',
    '30': 'Isenta ou nao tributada ST',
    '40': 'Isenta',
    '41': 'Nao tributada',
    '50': 'Suspensao',
    '51': 'Diferimento',
    '60': 'ICMS cobrado por ST',
    '70': 'Com reducao de BC e ICMS ST',
    '90': 'Outras',
    '101': 'Tributada SN com permissao credito',
    '102': 'Tributada SN sem permissao credito',
    '103': 'Isencao SN para faixa receita bruta',
    '201': 'Tributada SN com permissao credito e ST',
    '202': 'Tributada SN sem permissao credito e ST',
    '203': 'Isencao SN para faixa receita bruta e ST',
    '300': 'Imune',
    '400': 'Nao tributada SN',
    '500': 'ICMS cobrado por ST ou FCP',
    '900': 'Outros SN',
  };
  return map[cst] || 'CST ' + cst;
}
