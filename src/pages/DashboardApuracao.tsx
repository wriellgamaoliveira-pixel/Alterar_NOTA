import { useMemo, useState } from 'react';
import styles from './DashboardApuracao.module.css';
import { parseAPURACAOhtm, agruparPorEmpresa, type ApuracaoRegistro } from '@/parsers/apuracaoHtmlParser';

export default function DashboardApuracao() {
  const [allData, setAllData] = useState<Record<string, ApuracaoRegistro[]>>({});
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');

  const registros = useMemo(() => (allData[current] || []).slice().sort((a, b) => (a.competencia || '').localeCompare(b.competencia || '')), [allData, current]);

  const onFiles = async (files: FileList) => {
    try {
      setError('');
      const all = (await Promise.all([...files].map(async f => parseAPURACAOhtm(await f.text())))).flat();
      const grouped = agruparPorEmpresa(all);
      const out: Record<string, ApuracaoRegistro[]> = {};
      Object.entries(grouped).forEach(([k, v]) => (out[k] = v.registros));
      setAllData(out);
      setCurrent(Object.keys(out)[0] || '');
    } catch (e: any) {
      setError(e?.message || 'Falha ao processar os arquivos');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}><div><h2>Dashboard de Apuração</h2><div>Sistema de Análise Financeira e Tributária</div></div></div>
      <label className={styles.upload}>
        Upload APURACAO.HTM (múltiplos)
        <input hidden type="file" multiple accept=".htm,.html" onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </label>

      {error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div>}

      <div className={styles.selectBar}>
        <select value={current} onChange={(e) => setCurrent(e.target.value)}>
          {Object.keys(allData).map((cod) => <option key={cod} value={cod}>{cod}</option>)}
        </select>
      </div>

      <div className={styles.wrap}>
        <table>
          <thead><tr><th>Mês</th><th>Faturamento</th><th>SVA</th><th>SCM</th><th>PIS</th><th>COFINS</th><th>ICMS</th><th>IRPJ</th><th>CSLL</th></tr></thead>
          <tbody>
            {registros.map((r, i) => (
              <tr key={`${r.codi_emp}-${r.competencia}-${i}`}>
                <td>{r.competencia}</td>
                <td>{r.saidas?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{r.sva?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{r.scm?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{r.pis?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{r.cofins?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{r.icms?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{r.irpj?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{r.csll?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
