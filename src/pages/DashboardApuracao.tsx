import { useMemo, useState } from 'react';
import styles from './DashboardApuracao.module.css';
import { parseAPURACAOhtm, agruparPorEmpresa, type ApuracaoRegistro } from '@/parsers/apuracaoHtmlParser';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Tab = 'receitas' | 'tributos' | 'folha' | 'trimestres';
const cores = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#9c27b0'];
const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const pct = (v: number) => `${v.toFixed(2)}%`;

export default function DashboardApuracao() {
  const [allData, setAllData] = useState<Record<string, ApuracaoRegistro[]>>({});
  const [currentCompanyCode, setCurrentCompanyCode] = useState('');
  const [tab, setTab] = useState<Tab>('receitas');
  const [folhaData, setFolhaData] = useState<Record<string, { competencia: string; proventos: number; funcionarios: number }[]>>({});
  const [fileNames, setFileNames] = useState<string[]>([]);

  const parseHTMLFiles = async (files: FileList) => {
    const parsed = await Promise.all([...files].map(async (f) => parseAPURACAOhtm(await f.text())));
    const flat = parsed.flat();
    const uniq = new Map<string, ApuracaoRegistro>();
    flat.forEach((r) => uniq.set(`${r.codi_emp}-${r.competencia}`, r));
    const grouped = agruparPorEmpresa([...uniq.values()]);
    const out: Record<string, ApuracaoRegistro[]> = {};
    Object.entries(grouped).forEach(([cod, data]) => (out[cod] = data.registros));
    setAllData(out);
    setFileNames([...files].map(f=>f.name));
    setCurrentCompanyCode(Object.keys(out)[0] || '');
  };

  const registros = useMemo(() => [...(allData[currentCompanyCode] || [])].sort((a, b) => a.competencia.localeCompare(b.competencia)), [allData, currentCompanyCode]);
  const faturamentoTotal = registros.reduce((s, r) => s + r.saidas, 0);
  const totalTributos = registros.reduce((s, r) => s + r.pis + r.cofins + r.icms + r.irpj + r.csll, 0);
  const liquidez = faturamentoTotal ? ((faturamentoTotal - totalTributos) / faturamentoTotal) * 100 : 0;
  const ticketMedio = registros.length ? faturamentoTotal / registros.length : 0;

  const receitaPizza = useMemo(() => {
    const sum = (k: keyof ApuracaoRegistro) => registros.reduce((s, r) => s + Number(r[k] || 0), 0);
    return [{ name: 'SVA', value: sum('sva') }, { name: 'Livros', value: sum('livros') }, { name: 'SCM', value: sum('scm') }, { name: 'Serviços', value: sum('servicos') }, { name: 'Outros', value: sum('outros') }];
  }, [registros]);

  const tribPorTipo = [{ tipo: 'PIS', v: registros.reduce((s, r) => s + r.pis, 0) }, { tipo: 'COFINS', v: registros.reduce((s, r) => s + r.cofins, 0) }, { tipo: 'ICMS', v: registros.reduce((s, r) => s + r.icms, 0) }, { tipo: 'IRPJ', v: registros.reduce((s, r) => s + r.irpj, 0) }, { tipo: 'CSLL', v: registros.reduce((s, r) => s + r.csll, 0) }];

  const addFolhaRow = () => {
    if (!currentCompanyCode) return;
    const competencia = prompt('Competência (MM/AAAA):') || '';
    const proventos = Number(prompt('Total proventos:') || 0);
    const funcionarios = Number(prompt('Nº funcionários:') || 0);
    if (!competencia) return;
    setFolhaData((s) => ({ ...s, [currentCompanyCode]: [...(s[currentCompanyCode] || []), { competencia, proventos, funcionarios }] }));
  };

  return (<div className={styles.container}><div className={styles.header}><h2>Portal Fiscal XML</h2><small>Sistema de Análise Fiscal</small></div>
    <label className={styles.upload}><strong>Upload APURACAO.HTM (múltiplos)</strong><div>Selecione vários arquivos usando Ctrl/Shift.</div>
      <input hidden multiple type="file" accept=".htm,.html" onChange={(e) => e.target.files && parseHTMLFiles(e.target.files)} />
      {fileNames.length>0 && <div>{fileNames.join(' • ')}</div>}
    </label>
    <div className={styles.selectBar}><select value={currentCompanyCode} onChange={(e) => setCurrentCompanyCode(e.target.value)}>{Object.keys(allData).map((cod) => <option key={cod} value={cod}>{cod}</option>)}</select></div>
    <div className={styles.cards}><div className={`${styles.card} ${styles.g}`}><small>Ticket Médio</small><h3>{money(ticketMedio)}</h3></div><div className={`${styles.card} ${styles.o}`}><small>Total Clientes</small><h3>{Math.round(ticketMedio / 120)}</h3></div><div className={`${styles.card} ${styles.t}`}><small>Liquidez</small><h3>{pct(liquidez)}</h3></div><div className={`${styles.card} ${styles.r}`}><small>Faturamento Acumulado</small><h3>{money(faturamentoTotal)}</h3></div></div>
    <div className={styles.tabs}>{(['receitas', 'tributos', 'folha', 'trimestres'] as Tab[]).map((t) => <button key={t} className={`${styles.tab} ${tab === t ? styles.active : ''}`} onClick={() => setTab(t)}>{t}</button>)}<button onClick={addFolhaRow}>+ Folha</button></div>
    <div className={styles.wrap}><table><thead>{tab === 'receitas' ? <tr><th>Mês</th><th>Faturamento</th><th>SVA</th><th>SCM</th><th>Variação</th></tr> : tab === 'tributos' ? <tr><th>Mês</th><th>DAS</th><th>COFINS</th><th>ICMS</th><th>IRPJ</th><th>CSLL</th><th>PIS</th><th>Total</th><th>Alíquota</th></tr> : tab === 'folha' ? <tr><th>Mês</th><th>Proventos</th><th>Funcionários</th></tr> : <tr><th>Trimestre</th><th>Faturamento</th><th>Tributos</th></tr>}</thead><tbody>{tab === 'receitas' && registros.map((r, i) => { const p = registros[i - 1]?.saidas || 0; const d = r.saidas - p; const dv = p ? (d / p) * 100 : 0; return <tr key={r.competencia}><td>{r.competencia}</td><td>{money(r.saidas)}</td><td>{money(r.sva)} ({pct(r.saidas ? (r.sva / r.saidas) * 100 : 0)})</td><td>{money(r.scm)} ({pct(r.saidas ? (r.scm / r.saidas) * 100 : 0)})</td><td className={d >= 0 ? styles.pos : styles.neg}>{money(d)} ({pct(dv)})</td></tr>; })}{tab === 'tributos' && registros.map((r) => { const total = r.pis + r.cofins + r.icms + r.irpj + r.csll; return <tr key={r.competencia}><td>{r.competencia}</td><td>{money(r.pis + r.cofins)}</td><td>{money(r.cofins)}</td><td>{money(r.icms)}</td><td>{money(r.irpj)}</td><td>{money(r.csll)}</td><td>{money(r.pis)}</td><td>{money(total)}</td><td>{pct(r.saidas ? (total / r.saidas) * 100 : 0)}</td></tr>; })}{tab === 'folha' && (folhaData[currentCompanyCode] || []).map((r) => <tr key={r.competencia}><td>{r.competencia}</td><td>{money(r.proventos)}</td><td>{r.funcionarios}</td></tr>)}{tab === 'trimestres' && [1, 2, 3, 4].map((q) => { const rows = registros.filter((r) => Math.ceil(Number(r.competencia.split('/')[0]) / 3) === q); const fat = rows.reduce((s, r) => s + r.saidas, 0); const trib = rows.reduce((s, r) => s + r.pis + r.cofins + r.icms + r.irpj + r.csll, 0); return <tr key={q}><td>{q}º Trimestre</td><td>{money(fat)}</td><td>{money(trib)}</td></tr>; })}</tbody></table></div>
    <div className={styles.charts}><div className={styles.chart}><h4>Composição de Receita</h4><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={receitaPizza} dataKey="value">{receitaPizza.map((_, i) => <Cell key={i} fill={cores[i]} />)}</Pie><Tooltip formatter={(v: number) => money(v)} /></PieChart></ResponsiveContainer></div><div className={styles.chart}><h4>Faturamento Mensal</h4><ResponsiveContainer width="100%" height={260}><BarChart data={registros}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="competencia" /><YAxis /><Tooltip formatter={(v: number) => money(v)} /><Bar dataKey="saidas" fill="rgba(26,115,232,0.75)" stroke="#1a73e8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div><div className={styles.chart}><h4>Tributos por Tipo (Acumulado)</h4><ResponsiveContainer width="100%" height={260}><BarChart data={tribPorTipo}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="tipo" /><YAxis /><Tooltip formatter={(v: number) => money(v)} /><Bar dataKey="v">{tribPorTipo.map((_, i) => <Cell key={i} fill={cores[i]} />)}</Bar></BarChart></ResponsiveContainer></div><div className={styles.chart}><h4>Evolução Tributária</h4><ResponsiveContainer width="100%" height={260}><LineChart data={registros.map(r => ({ ...r, trib: r.pis + r.cofins + r.icms + r.irpj + r.csll }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="competencia" /><YAxis /><Tooltip formatter={(v: number) => money(v)} /><Line dataKey="trib" stroke="#d93025" strokeWidth={2} dot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></div>
  </div>);
}
