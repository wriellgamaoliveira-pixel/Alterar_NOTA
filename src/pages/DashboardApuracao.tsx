import { useMemo, useState } from 'react';
import styles from './DashboardApuracao.module.css';
import { parseAPURACAOhtm, agruparPorEmpresa, type ApuracaoRegistro } from '@/parsers/apuracaoHtmlParser';
import { Chart as ChartJS, ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
ChartJS.register(ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

export default function DashboardApuracao() {
  const [data, setData] = useState<Record<string, ApuracaoRegistro[]>>({});
  const [currentCompanyCode, setCurrentCompanyCode] = useState('');
  const [tab, setTab] = useState<'receitas'|'tributos'|'folha'|'trim'>('receitas');
  const [folhaData, setFolhaData] = useState<Record<string,{competencia:string;proventos:number;num:number}[]>>({});
  const regs = data[currentCompanyCode] || [];
  const ordered = [...regs].sort((a,b)=>a.competencia.localeCompare(b.competencia));
  const parse = async (f: File)=>{const html=await f.text(); const g=agruparPorEmpresa(parseAPURACAOhtm(html)); const out:Record<string,ApuracaoRegistro[]>={}; Object.entries(g).forEach(([k,v])=>out[k]=v.registros); setData(out); setCurrentCompanyCode(Object.keys(out)[0]||'');};
  const fatTotal = ordered.reduce((a,b)=>a+b.saidas,0);
  const tribTotal = ordered.reduce((a,b)=>a+b.pis+b.cofins+b.icms+b.irpj+b.csll,0);
  const liq = fatTotal?((fatTotal-tribTotal)/fatTotal)*100:0;
  const addFolhaRow=()=>{if(!currentCompanyCode) return; const c=prompt('Competência MM/AAAA'); const p=Number(prompt('Proventos')||0); const n=Number(prompt('Funcionários')||0); if(!c) return; setFolhaData(s=>({...s,[currentCompanyCode]:[...(s[currentCompanyCode]||[]),{competencia:c,proventos:p,num:n}]}));};
  const labels = ordered.map(r=>r.competencia);
  const compVals = useMemo(()=>{const sva=ordered.reduce((a,b)=>a+b.sva,0),liv=ordered.reduce((a,b)=>a+b.livros,0),scm=ordered.reduce((a,b)=>a+b.scm,0),serv=ordered.reduce((a,b)=>a+b.servicos,0),out=ordered.reduce((a,b)=>a+b.outros,0); return [sva,liv,scm,serv,out];},[ordered]);
  const fmt=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
  const perc=(a:number,b:number)=>b?((a/b)*100).toFixed(2):'0.00';
  return <div className={styles.page}><div className={styles.header}><h2>Portal Fiscal XML</h2><small>Sistema de Análise Fiscal</small></div>
    <label className={styles.upload}>Upload APURACAO .HTM<input type='file' accept='.htm,.html' hidden onChange={e=>e.target.files?.[0]&&parse(e.target.files[0])}/></label>
    <div className={styles.selectBar}><select value={currentCompanyCode} onChange={e=>setCurrentCompanyCode(e.target.value)}>{Object.keys(data).map(c=><option key={c} value={c}>{c}</option>)}</select><button onClick={addFolhaRow}>Adicionar Folha</button></div>
    <div className={styles.cards}><div className={styles.card}><small>Ticket Médio</small><h3>{fmt(ordered.length?fatTotal/ordered.length:0)}</h3></div><div className={`${styles.card} ${styles.ok}`}><small>Total Clientes</small><h3>{Math.round((fatTotal/120)||0)}</h3></div><div className={`${styles.card} ${styles.teal}`}><small>Liquidez</small><h3>{liq.toFixed(2)}%</h3></div><div className={`${styles.card} ${styles.bad}`}><small>Faturamento Acumulado</small><h3>{fmt(fatTotal)}</h3></div></div>
    <div className={styles.tabs}>{['receitas','tributos','folha','trim'].map(t=><button key={t} className={`${styles.tab} ${tab===t?styles.active:''}`} onClick={()=>setTab(t as any)}>{t}</button>)}</div>
    <div className={styles.tableWrap}><table className={styles.table}><thead>{tab==='receitas'?<tr><th>Mês</th><th>Faturamento</th><th>SVA</th><th>SCM</th><th>Variação</th></tr>:tab==='tributos'?<tr><th>Mês</th><th>COFINS</th><th>ICMS</th><th>PIS</th><th>Total</th><th>Alíquota</th></tr>:tab==='folha'?<tr><th>Mês</th><th>Proventos</th><th>Funcionários</th></tr>:<tr><th>Trimestre</th><th>Faturamento</th><th>Tributos</th></tr>}</thead><tbody>{tab==='receitas'&&ordered.map((r,i)=>{const p=ordered[i-1]?.saidas||0;const v=r.saidas-p;const pc=p?((v/p)*100):0;return <tr key={r.competencia}><td>{r.competencia}</td><td>{fmt(r.saidas)}</td><td>{fmt(r.sva)} ({perc(r.sva,r.saidas)}%)</td><td>{fmt(r.scm)} ({perc(r.scm,r.saidas)}%)</td><td className={v>=0?styles.pos:styles.neg}>{fmt(v)} ({pc.toFixed(2)}%)</td></tr>})}{tab==='tributos'&&ordered.map(r=>{const t=r.pis+r.cofins+r.icms+r.irpj+r.csll;return <tr key={r.competencia}><td>{r.competencia}</td><td>{fmt(r.cofins)}</td><td>{fmt(r.icms)}</td><td>{fmt(r.pis)}</td><td>{fmt(t)}</td><td>{perc(t,r.saidas)}%</td></tr>})}{tab==='folha'&&((folhaData[currentCompanyCode]||[]).map(r=><tr key={r.competencia}><td>{r.competencia}</td><td>{fmt(r.proventos)}</td><td>{r.num}</td></tr>))}{tab==='trim'&&['1','2','3','4'].map(q=>{const rows=ordered.filter(r=>Math.ceil(Number(r.competencia.split('/')[0])/3)===Number(q)); const f=rows.reduce((a,b)=>a+b.saidas,0); const t=rows.reduce((a,b)=>a+b.pis+b.cofins+b.icms+b.irpj+b.csll,0); return <tr key={q}><td>{q}º Trimestre</td><td>{fmt(f)}</td><td>{fmt(t)}</td></tr>})}</tbody></table></div>
    <div className={styles.charts}><div className={styles.chartCard}><h4>Composição de Receita</h4><Doughnut data={{labels:['SVA','Livros','SCM','Serviços','Outros'],datasets:[{data:compVals,backgroundColor:['#4285f4','#34a853','#fbbc04','#ea4335','#9c27b0']}]}} /></div><div className={styles.chartCard}><h4>Faturamento Mensal</h4><Bar data={{labels,datasets:[{label:'Faturamento',data:ordered.map(r=>r.saidas),backgroundColor:'rgba(26,115,232,0.75)',borderColor:'#1a73e8',borderRadius:8}]}} /></div><div className={styles.chartCard}><h4>Evolução Tributária</h4><Line data={{labels,datasets:[{label:'Tributos',data:ordered.map(r=>r.pis+r.cofins+r.icms+r.irpj+r.csll),borderColor:'#d93025',backgroundColor:'rgba(217,48,37,.2)',fill:true,tension:.4,pointRadius:6}]}} /></div></div>
  </div>;
}
