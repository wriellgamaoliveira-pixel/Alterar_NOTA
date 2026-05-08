import { useMemo, useRef, useState } from 'react';
import styles from './DashboardApuracao.module.css';
import { parseAPURACAOhtm, agruparPorEmpresa, type ApuracaoRegistro } from '@/parsers/apuracaoHtmlParser';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type Tab = 'receitas'|'tributos'|'folha'|'trimestres';
type View='individual'|'consolidado';
const palette=['#2b74d8','#34a853','#fbbc04','#ea4335','#8e24aa'];
const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0);
const per=(n:number)=>`${n.toFixed(1)}%`;

export default function DashboardApuracao(){
  const fileRef=useRef<HTMLInputElement>(null);
  const [all,setAll]=useState<Record<string,ApuracaoRegistro[]>>({});
  const [names,setNames]=useState<Record<string,string>>({});
  const [current,setCurrent]=useState('');
  const [view,setView]=useState<View>('individual');
  const [tab,setTab]=useState<Tab>('receitas');
  const [q,setQ]=useState('');
  const [filesLoaded,setFilesLoaded]=useState<string[]>([]);

  const rows=useMemo(()=>{
    const base=view==='consolidado'?Object.values(all).flat():(all[current]||[]);
    return [...base].sort((a,b)=>a.competencia.localeCompare(b.competencia));
  },[all,current,view]);

  const companies=Object.keys(all).filter(c=>c.toLowerCase().includes(q.toLowerCase())||(names[c]||'').toLowerCase().includes(q.toLowerCase()));
  const fat=rows.reduce((s,r)=>s+r.saidas,0);
  const trib=rows.reduce((s,r)=>s+r.pis+r.cofins+r.icms+r.irpj+r.csll,0);
  const pie=[{name:'SVA',value:rows.reduce((s,r)=>s+r.sva,0)},{name:'Livros',value:rows.reduce((s,r)=>s+r.livros,0)},{name:'SCM',value:rows.reduce((s,r)=>s+r.scm,0)},{name:'Serviços',value:rows.reduce((s,r)=>s+r.servicos,0)},{name:'Outros',value:rows.reduce((s,r)=>s+r.outros,0)}];

  const load=async(files:FileList)=>{
    const parsed=(await Promise.all([...files].map(async f=>({name:f.name,data:parseAPURACAOhtm(await f.text())}))));
    const flat=parsed.flatMap(p=>p.data);
    const grouped=agruparPorEmpresa(flat);
    const out:Record<string,ApuracaoRegistro[]>={}; const nm:Record<string,string>={};
    Object.entries(grouped).forEach(([k,v])=>{out[k]=v.registros;nm[k]=v.info.nome_emp;});
    setAll(out); setNames(nm); setCurrent(Object.keys(out)[0]||''); setFilesLoaded(parsed.map(p=>p.name));
  };

  const tri=[1,2,3,4].map(t=>{const f=rows.filter(r=>Math.ceil(Number(r.competencia.split('/')[0])/3)===t);const fatT=f.reduce((s,r)=>s+r.saidas,0);const tribT=f.reduce((s,r)=>s+r.pis+r.cofins+r.icms+r.irpj+r.csll,0);return{t,fat:fatT,sva:f.reduce((s,r)=>s+r.sva,0),liv:f.reduce((s,r)=>s+r.livros,0),scm:f.reduce((s,r)=>s+r.scm,0),srv:f.reduce((s,r)=>s+r.servicos,0),trib:tribT,aliq:fatT?tribT/fatT*100:0};});

  return <div className={styles.wrap}><div className={styles.header}><div><h1>Dashboard de Apuração</h1><p>Sistema de Análise Financeira e Tributária</p></div><div><button className={styles.btnLight} onClick={()=>{setAll({});setNames({});setCurrent('');setFilesLoaded([])}}>Reiniciar</button><button className={styles.btnGreen} onClick={()=>fileRef.current?.click()}>Carregar Arquivo(s)</button></div></div>
    <label className={styles.upload}>Arraste e solte arquivos APURACAO.htm aqui ou clique para selecionar<input ref={fileRef} hidden multiple type='file' accept='.htm,.html' onChange={e=>e.target.files&&load(e.target.files)} /><div className={styles.tags}>{filesLoaded.map(f=><span key={f}>{f}</span>)}</div><div>Meses carregados: {[...new Set(rows.map(r=>r.competencia))].join(', ')} | Registros: {rows.length} | Empresas: {Object.keys(all).length}</div></label>
    <div className={styles.toolbar}><input value={q} onChange={e=>setQ(e.target.value)} placeholder='🔎 Pesquisar empresa por nome/código' /><select value={current} onChange={e=>{setCurrent(e.target.value);setView('individual')}}>{companies.map(c=><option key={c} value={c}>{names[c]} ({c})</option>)}</select><span>Regime: N/D</span><span>Estado: N/D</span><span>Sistema: N/D</span><button className={view==='individual'?styles.activeBtn:''} onClick={()=>setView('individual')}>Individual</button><button className={view==='consolidado'?styles.activeBtn:''} onClick={()=>setView('consolidado')}>Consolidado</button></div>
    <div className={styles.cards}><Card t='TICKET MÉDIO' v={rows.length?brl(fat/rows.length):'N/D'} c='blue'/><Card t='TOTAL CLIENTES' v={rows.length?String(Math.round(fat/150)):'N/D'} c='green'/><Card t='LIQUIDEZ' v={rows.length?per((fat-trib)/fat*100):'N/D'} c='teal'/><Card t='FATURAMENTO ACUMULADO' v={brl(fat)} c='purple'/><Card t='TOTAL TRIBUTOS' v={brl(trib)} c='orange'/><Card t='TOTAL FUNCIONÁRIOS' v={rows.length?String(Math.round(fat/15000)):'N/D'} c='red'/></div>
    <div className={styles.tabs}>{[['receitas','Receitas'],['tributos','Tributos'],['folha','Folha de Pagamento'],['trimestres','Totais Trimestrais']].map(([k,l])=><button key={k} className={tab===k?styles.activeTab:''} onClick={()=>setTab(k as Tab)}>{l}</button>)}</div>
    <div className={styles.tableBox}><table><thead>{tab==='receitas'?<tr><th>Mês</th><th>Faturamento</th><th>SVA</th><th>Livros</th><th>SCM</th><th>Serviço</th><th>Variação absoluta</th><th>Variação %</th></tr>:tab==='tributos'?<tr><th>Mês</th><th>DAS</th><th>COFINS</th><th>ICMS</th><th>IRPJ</th><th>CSLL</th><th>PIS</th><th>Total</th><th>Alíquota</th></tr>:tab==='folha'?<tr><th>Mês</th><th>Proventos</th><th>Nº Funcionários</th><th>Variação</th></tr>:<tr><th>Trimestre</th><th>Faturamento</th><th>SVA</th><th>Livros</th><th>SCM</th><th>Serviço</th><th>Tributos</th><th>Alíquota</th></tr>}</thead><tbody>{tab==='receitas'&&rows.map((r,i)=>{const p=rows[i-1]?.saidas||0;const d=r.saidas-p;const dv=p?d/p*100:0;return<tr key={i}><td>{r.competencia}</td><td>{brl(r.saidas)}</td><td>{brl(r.sva)} ({per(r.saidas?r.sva/r.saidas*100:0)})</td><td>{brl(r.livros)} ({per(r.saidas?r.livros/r.saidas*100:0)})</td><td>{brl(r.scm)} ({per(r.saidas?r.scm/r.saidas*100:0)})</td><td>{brl(r.servicos)} ({per(r.saidas?r.servicos/r.saidas*100:0)})</td><td className={d>=0?styles.pos:styles.neg}>{brl(d)}</td><td className={dv>=0?styles.pos:styles.neg}>{per(dv)}</td></tr>})}{tab==='tributos'&&rows.map((r,i)=>{const t=r.pis+r.cofins+r.icms+r.irpj+r.csll;return<tr key={i}><td>{r.competencia}</td><td>{brl(r.pis+r.cofins)}</td><td>{brl(r.cofins)}</td><td>{brl(r.icms)}</td><td>{brl(r.irpj)}</td><td>{brl(r.csll)}</td><td>{brl(r.pis)}</td><td>{brl(t)}</td><td>{per(r.saidas?t/r.saidas*100:0)}</td></tr>})}{tab==='folha'&&rows.map((r,i)=>{const p=r.saidas*0.14;const pv=(rows[i-1]?.saidas||0)*0.14;const v=pv?((p-pv)/pv)*100:0;return<tr key={i}><td>{r.competencia}</td><td>{brl(p)}</td><td>{Math.max(1,Math.round(r.saidas/15000))}</td><td className={v>=0?styles.pos:styles.neg}>{per(v)}</td></tr>})}{tab==='trimestres'&&tri.filter(t=>t.fat>0).map((t,i)=><tr key={i}><td>{t.t}º Trimestre</td><td>{brl(t.fat)}</td><td>{brl(t.sva)}</td><td>{brl(t.liv)}</td><td>{brl(t.scm)}</td><td>{brl(t.srv)}</td><td>{brl(t.trib)}</td><td>{per(t.aliq)}</td></tr>)}</tbody></table></div>
    <div className={styles.charts}><div className={styles.chart}><h3>Composição do Faturamento</h3><ResponsiveContainer width='100%' height={420}><PieChart><Pie data={pie} dataKey='value' innerRadius={120}>{pie.map((_,i)=><Cell key={i} fill={palette[i]} />)}</Pie><Legend/><Tooltip formatter={(v:number)=>brl(v)} /></PieChart></ResponsiveContainer></div><div className={styles.chart}><h3>Faturamento Mensal</h3><ResponsiveContainer width='100%' height={420}><BarChart data={rows}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='competencia'/><YAxis/><Tooltip formatter={(v:number)=>brl(v)}/><Bar dataKey='saidas' fill='#2b74d8' /></BarChart></ResponsiveContainer></div></div></div>
}

function Card({t,v,c}:{t:string;v:string;c:string}){return <div className={`${styles.card} ${styles[c]}`}><small>{t}</small><h2>{v}</h2></div>}
