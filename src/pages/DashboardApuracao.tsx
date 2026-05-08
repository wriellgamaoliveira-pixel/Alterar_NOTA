import { useMemo, useRef, useState } from 'react';
import styles from './DashboardApuracao.module.css';
import { parseAPURACAOhtm, agruparPorEmpresa, type ApuracaoRegistro } from '@/parsers/apuracaoHtmlParser';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Tab = 'receitas' | 'tributos' | 'folha' | 'trimestres';
type View = 'individual' | 'consolidado';
const colors = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#9c27b0'];
const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const pct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;
const monthNum = (c?: string) => Number((c || '01/2000').split('/')[0] || 1);

export default function DashboardApuracao() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [allData, setAllData] = useState<Record<string, ApuracaoRegistro[]>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState<View>('individual');
  const [tab, setTab] = useState<Tab>('receitas');

  const load = async (files: FileList) => {
    const rows = (await Promise.all([...files].map(async f => parseAPURACAOhtm(await f.text())))).flat();
    const grouped = agruparPorEmpresa(rows);
    const out: Record<string, ApuracaoRegistro[]> = {}; const nn: Record<string, string> = {};
    Object.entries(grouped).forEach(([k, v]) => { out[k] = v.registros; nn[k] = v.info.nome_emp; });
    setAllData(out); setNames(nn); setCurrent(Object.keys(out)[0] || '');
  };

  const companies = Object.keys(allData).filter(c => c.toLowerCase().includes(q.toLowerCase()) || (names[c] || '').toLowerCase().includes(q.toLowerCase()));
  const registros = useMemo(() => (view === 'consolidado' ? Object.values(allData).flat() : (allData[current] || [])).slice().sort((a, b) => (a.competencia || '').localeCompare(b.competencia || '')), [allData, current, view]);
  const faturamento = registros.reduce((s, r) => s + (r.saidas || 0), 0);
  const trib = registros.reduce((s, r) => s + (r.pis || 0) + (r.cofins || 0) + (r.icms || 0) + (r.irpj || 0) + (r.csll || 0), 0);

  const pie = [{ name: 'SVA', value: registros.reduce((s, r) => s + (r.sva || 0), 0) }, { name: 'Livros', value: registros.reduce((s, r) => s + (r.livros || 0), 0) }, { name: 'SCM', value: registros.reduce((s, r) => s + (r.scm || 0), 0) }, { name: 'Serviços', value: registros.reduce((s, r) => s + (r.servicos || 0), 0) }, { name: 'Outros', value: registros.reduce((s, r) => s + (r.outros || 0), 0) }];

  const trimestres = [1, 2, 3, 4].map(qt => {
    const rows = registros.filter(r => Math.ceil(monthNum(r.competencia) / 3) === qt);
    const f = rows.reduce((s, r) => s + (r.saidas || 0), 0);
    const t = rows.reduce((s, r) => s + (r.pis || 0) + (r.cofins || 0) + (r.icms || 0) + (r.irpj || 0) + (r.csll || 0), 0);
    return { qt, f, t, sva: rows.reduce((s, r) => s + (r.sva || 0), 0), liv: rows.reduce((s, r) => s + (r.livros || 0), 0), scm: rows.reduce((s, r) => s + (r.scm || 0), 0), srv: rows.reduce((s, r) => s + (r.servicos || 0), 0) };
  });

  return <div className={styles.container}><div className={styles.header}><div><h2>Dashboard de Apuração</h2><div>Sistema de Análise Financeira e Tributária</div></div><div className={styles.actions}><button className={styles.reset} onClick={() => { setAllData({}); setNames({}); setCurrent(''); }}>Reiniciar</button><button className={styles.load} onClick={() => fileRef.current?.click()}>Carregar Arquivo(s)</button></div></div>
    <label className={styles.upload}>Arraste e solte arquivos APURACAO.htm aqui ou clique para selecionar<input ref={fileRef} hidden multiple type='file' accept='.htm,.html' onChange={e => e.target.files && load(e.target.files)} /></label>
    <div className={styles.selectBar}><input className={styles.search} value={q} onChange={e => setQ(e.target.value)} placeholder='🔎 Pesquisar empresa por código ou nome' /><select value={current} onChange={e => { setCurrent(e.target.value); setView('individual'); }}>{companies.map(c => <option key={c} value={c}>{names[c]} ({c})</option>)}</select><button className={`${styles.toggle} ${view === 'individual' ? styles.activeBtn : ''}`} onClick={() => setView('individual')}>Individual</button><button className={`${styles.toggle} ${view === 'consolidado' ? styles.activeBtn : ''}`} onClick={() => setView('consolidado')}>Consolidado</button></div>
    <div className={styles.cards}><div className={`${styles.card} ${styles.g}`}><small>TICKET MÉDIO</small><h3>{registros.length ? money(faturamento / registros.length) : 'N/D'}</h3></div><div className={`${styles.card} ${styles.o}`}><small>TOTAL CLIENTES</small><h3>{Math.round(faturamento / 150)}</h3></div><div className={`${styles.card} ${styles.t}`}><small>LIQUIDEZ</small><h3>{pct(faturamento ? ((faturamento - trib) / faturamento) * 100 : 0)}</h3></div><div className={`${styles.card} ${styles.p}`}><small>FATURAMENTO ACUMULADO</small><h3>{money(faturamento)}</h3></div></div>
    <div className={styles.tabs}>{(['receitas', 'tributos', 'folha', 'trimestres'] as Tab[]).map(t => <button key={t} className={`${styles.tab} ${tab === t ? styles.active : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>
    <div className={styles.wrap}><table><thead>{tab === 'receitas' ? <tr><th>Mês</th><th>Faturamento</th><th>SVA</th><th>Livros</th><th>SCM</th><th>Serviço</th><th>Variação</th></tr> : tab === 'tributos' ? <tr><th>Mês</th><th>DAS</th><th>COFINS</th><th>ICMS</th><th>IRPJ</th><th>CSLL</th><th>PIS</th><th>Total</th><th>Alíquota</th></tr> : tab === 'folha' ? <tr><th>Mês</th><th>Proventos</th><th>Funcionários</th><th>Variação</th></tr> : <tr><th>Trimestre</th><th>Faturamento</th><th>SVA</th><th>Livros</th><th>SCM</th><th>Serviço</th><th>Tributos</th><th>Alíquota</th></tr>}</thead><tbody>{tab === 'receitas' && registros.map((r, i) => { const prev = registros[i - 1]?.saidas || 0; const d = (r.saidas || 0) - prev; return <tr key={i}><td>{r.competencia}</td><td>{money(r.saidas)}</td><td>{money(r.sva)}</td><td>{money(r.livros)}</td><td>{money(r.scm)}</td><td>{money(r.servicos)}</td><td className={d >= 0 ? styles.pos : styles.neg}>{money(d)}</td></tr>; })}{tab === 'tributos' && registros.map((r, i) => { const t = (r.pis || 0) + (r.cofins || 0) + (r.icms || 0) + (r.irpj || 0) + (r.csll || 0); return <tr key={i}><td>{r.competencia}</td><td>{money((r.pis || 0) + (r.cofins || 0))}</td><td>{money(r.cofins)}</td><td>{money(r.icms)}</td><td>{money(r.irpj)}</td><td>{money(r.csll)}</td><td>{money(r.pis)}</td><td>{money(t)}</td><td>{pct(r.saidas ? t / r.saidas * 100 : 0)}</td></tr>; })}{tab === 'folha' && registros.map((r, i) => <tr key={i}><td>{r.competencia}</td><td>{money((r.saidas || 0) * 0.14)}</td><td>{Math.round((r.saidas || 0) / 15000)}</td><td>-</td></tr>)}{tab === 'trimestres' && trimestres.filter(t => t.f > 0).map((t, i) => <tr key={i}><td>{t.qt}º Trimestre</td><td>{money(t.f)}</td><td>{money(t.sva)}</td><td>{money(t.liv)}</td><td>{money(t.scm)}</td><td>{money(t.srv)}</td><td>{money(t.t)}</td><td>{pct(t.f ? t.t / t.f * 100 : 0)}</td></tr>)}</tbody></table></div>
    <div className={styles.charts}><div className={styles.chart}><h3>Composição do Faturamento</h3><ResponsiveContainer width='100%' height={260}><PieChart><Pie data={pie} dataKey='value' innerRadius={80}>{pie.map((_, i) => <Cell key={i} fill={colors[i]} />)}</Pie><Tooltip formatter={(v: number) => money(v)} /></PieChart></ResponsiveContainer></div><div className={styles.chart}><h3>Faturamento Mensal</h3><ResponsiveContainer width='100%' height={260}><BarChart data={registros}><CartesianGrid strokeDasharray='3 3' /><XAxis dataKey='competencia' /><YAxis /><Tooltip formatter={(v: number) => money(v)} /><Bar dataKey='saidas' fill='rgba(26,115,232,0.75)' stroke='#1a73e8' /></BarChart></ResponsiveContainer></div></div>
  </div>;
}
