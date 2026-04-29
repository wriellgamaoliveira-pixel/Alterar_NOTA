import { useMemo, useState } from 'react';
import UploadDropzone from '@/components/shared/UploadDropzone';
import { parseApuracaoHtml } from '@/parsers/apuracaoHtmlParser';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR');
const colors = ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardApuracao() {
  const [data, setData] = useState<ReturnType<typeof parseApuracaoHtml> | null>(null);

  const onUpload = async (files: File[]) => {
    const file = files.find(f => f.name.toLowerCase().endsWith('.html'));
    if (!file) return;
    const html = await file.text();
    setData(parseApuracaoHtml(html));
  };

  const resumo = useMemo(() => {
    if (!data) return null;
    const totalAnual = data.receitas.reduce((s, r) => s + r.faturamento, 0);
    const q1 = data.receitas.slice(0, 3).reduce((s, r) => s + r.faturamento, 0);
    const q2 = data.receitas.slice(3, 6).reduce((s, r) => s + r.faturamento, 0);
    const q3 = data.receitas.slice(6, 9).reduce((s, r) => s + r.faturamento, 0);
    return { totalAnual, q1, q2, q3 };
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const lines = ['tipo;mes;campo;valor'];
    data.receitas.forEach(r => Object.entries(r).forEach(([k, v]) => lines.push(`receitas;${r.mes};${k};${v}`)));
    data.tributos.forEach(r => Object.entries(r).forEach(([k, v]) => lines.push(`tributos;${r.mes};${k};${v}`)));
    data.folha.forEach(r => Object.entries(r).forEach(([k, v]) => lines.push(`folha;${r.mes};${k};${v}`)));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'dashboard_apuracao.csv'; a.click();
  };

  const pieData = data ? [
    { name: 'SVA', value: data.receitas.reduce((s, r) => s + r.sva, 0) },
    { name: 'Livros', value: data.receitas.reduce((s, r) => s + r.livros, 0) },
    { name: 'SCM', value: data.receitas.reduce((s, r) => s + r.scm, 0) },
    { name: 'Serviço', value: data.receitas.reduce((s, r) => s + r.servico, 0) },
  ] : [];

  return <div className="mx-auto max-w-[1200px] px-6 py-8 space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-[#f1f5f9]">Dashboard de Apuração</h1>
      <p className="text-sm text-[#94a3b8]">Análise financeira e tributária a partir de HTML</p>
    </div>
    <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5"><UploadDropzone onFilesSelected={onUpload} accept=".html" label="Arraste APURACAO.html aqui" sublabel="Upload de arquivo HTML" /></div>

    {data && resumo && <>
      <div className="grid gap-4 md:grid-cols-4">{[
        ['Total anual', BRL.format(resumo.totalAnual)], ['1º trimestre', BRL.format(resumo.q1)], ['2º trimestre', BRL.format(resumo.q2)], ['3º trimestre', BRL.format(resumo.q3)],
      ].map(([k,v]) => <div key={String(k)} className="rounded-xl border border-[#334155] bg-[#1e293b] p-4"><p className="text-xs text-[#94a3b8]">{k}</p><p className="text-lg font-semibold text-[#f1f5f9]">{v}</p></div>)}</div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4"><p className="text-sm text-[#94a3b8]">Empresa: <span className="text-[#f1f5f9]">{data.header.empresa}</span></p><p className="text-sm text-[#94a3b8]">Código: <span className="text-[#f1f5f9]">{data.header.codigo}</span></p><p className="text-sm text-[#94a3b8]">Regime: <span className="text-[#f1f5f9]">{data.header.regime}</span></p><p className="text-sm text-[#94a3b8]">Estado: <span className="text-[#f1f5f9]">{data.header.estado}</span></p></div>
        <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4"><p className="text-sm text-[#94a3b8]">Sistema: <span className="text-[#f1f5f9]">{data.header.sistema}</span></p><p className="text-sm text-[#94a3b8]">Ticket médio: <span className="text-[#f1f5f9]">{BRL.format(data.header.ticketMedio)}</span></p><p className="text-sm text-[#94a3b8]">Total clientes: <span className="text-[#f1f5f9]">{NUM.format(data.header.totalClientes)}</span></p><p className="text-sm text-[#94a3b8]">Liquidez: <span className="text-[#f1f5f9]">{data.header.liquidez.toFixed(2)}</span></p></div>
      </div>

      <button onClick={exportCsv} className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white">Exportar CSV</button>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4 h-[300px]"><ResponsiveContainer><LineChart data={data.receitas}><CartesianGrid stroke="#334155"/><XAxis dataKey="mes"/><YAxis/><Tooltip/><Line type="monotone" dataKey="faturamento" stroke="#38bdf8"/></LineChart></ResponsiveContainer></div>
        <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4 h-[300px]"><ResponsiveContainer><BarChart data={data.tributos}><CartesianGrid stroke="#334155"/><XAxis dataKey="mes"/><YAxis/><Tooltip/><Bar dataKey="total" fill="#f59e0b"/></BarChart></ResponsiveContainer></div>
      </div>
      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4 h-[320px]"><ResponsiveContainer><PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>{pieData.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie></PieChart></ResponsiveContainer></div>
    </>}
  </div>;
}
