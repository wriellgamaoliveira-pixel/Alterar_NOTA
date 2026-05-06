import { useMemo, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseAPURACAOhtm, agruparPorEmpresa, type ApuracaoRegistro } from '@/parsers/apuracaoHtmlParser';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const nf = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pf = (n: number) => `${n.toFixed(2)}%`;
const normalizeComp = (comp: string) => {
  const [m, y] = comp.split('/').map(Number);
  return y * 100 + m;
};

function parseQuarter(comp: string) {
  const [m, y] = comp.split('/').map(Number);
  return `${Math.ceil(m / 3)}º tri/${y}`;
}

export default function DashboardApuracao() {
  const [allCompaniesData, setAllCompaniesData] = useState<Record<string, { nome: string; registros: ApuracaoRegistro[] }>>({});
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [error, setError] = useState<string>('');

  const onFile = async (file: File) => {
    try {
      setError('');
      const html = await file.text();
      const grouped = agruparPorEmpresa(parseAPURACAOhtm(html));
      const payload: Record<string, { nome: string; registros: ApuracaoRegistro[] }> = {};
      Object.entries(grouped).forEach(([codi_emp, d]) => {
        payload[codi_emp] = { nome: d.info.nome_emp, registros: d.registros };
      });
      setAllCompaniesData(payload);
      setSelectedCompany(Object.keys(payload)[0] || '');
    } catch (e: any) {
      setError(e.message || 'Falha ao processar arquivo .HTM');
    }
  };

  const current = selectedCompany ? allCompaniesData[selectedCompany] : undefined;
  const registros = useMemo(() => (current?.registros || []).slice().sort((a, b) => normalizeComp(a.competencia) - normalizeComp(b.competencia)), [current]);

  const rowsReceita = registros.map((r, i) => {
    const faturamento = r.saidas;
    const servico = Math.max(0, faturamento - (r.sva + r.livros + r.scm));
    const prev = registros[i - 1]?.saidas ?? 0;
    const variacao = prev > 0 ? ((faturamento - prev) / prev) * 100 : 0;
    return { ...r, faturamento, servico, variacao };
  });

  const rowsTributos = rowsReceita.map((r, i) => {
    const das = r.pis + r.cofins;
    const fust = r.sva * 0.01;
    const funcep = r.icms * 0.02;
    const funttel = r.scm * 0.005;
    const total = das + r.cofins + r.icms + fust + funcep + funttel + r.irpj + r.csll;
    const aliq = r.faturamento ? (total / r.faturamento) * 100 : 0;
    const prevTotal = i > 0 ? (rowsReceita[i - 1].pis + rowsReceita[i - 1].cofins + rowsReceita[i - 1].icms + rowsReceita[i - 1].irpj + rowsReceita[i - 1].csll) : 0;
    const variacao = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0;
    return { ...r, das, fust, funcep, funttel, total, aliq, variacao };
  });

  const ticketMedio = rowsReceita.length ? rowsReceita.reduce((a, b) => a + b.faturamento, 0) / rowsReceita.length : 0;
  const totalClientes = Math.round(ticketMedio / 120);
  const liquidez = rowsTributos.length ? ((rowsReceita.reduce((a, b) => a + b.faturamento, 0) - rowsTributos.reduce((a, b) => a + b.total, 0)) / Math.max(rowsReceita.reduce((a, b) => a + b.faturamento, 0), 1)) * 100 : 0;
  const faturamentoAcumulado = rowsReceita.reduce((a, b) => a + b.faturamento, 0);

  const pieData = useMemo(() => {
    const t = rowsReceita.reduce((acc, r) => ({ sva: acc.sva + r.sva, livros: acc.livros + r.livros, scm: acc.scm + r.scm, servico: acc.servico + r.servico }), { sva: 0, livros: 0, scm: 0, servico: 0 });
    return [
      { name: 'SVA', value: t.sva, color: '#1a73e8' },
      { name: 'Livros', value: t.livros, color: '#0d904f' },
      { name: 'SCM', value: t.scm, color: '#1a6e8e' },
      { name: 'Serviços', value: t.servico, color: '#d93025' },
    ];
  }, [rowsReceita]);

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#1a3c5e] to-[#1a6e8e] text-white shadow">
        <div className="mx-auto max-w-[1500px] px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard de Apuração</h1>
          <div className="text-sm opacity-90">Upload .HTM + análise multiempresa</div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] p-6 space-y-6">
        <label className="block border-2 border-dashed border-[#1a73e8] rounded-xl p-10 text-center cursor-pointer bg-white">
          <UploadCloud className="mx-auto h-8 w-8 text-[#1a73e8]" />
          <p className="mt-2 font-medium">Arraste o arquivo .HTM aqui ou clique para enviar</p>
          <input type="file" className="hidden" accept=".htm,.html" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {error && <p className="text-[#d93025] font-medium">{error}</p>}

        {Object.keys(allCompaniesData).length > 0 && (
          <Card>
            <CardHeader><CardTitle>Empresa</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(allCompaniesData).map(([cod, data]) => <SelectItem key={cod} value={cod}>{cod} - {data.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            ['Ticket Médio', nf.format(ticketMedio), '#1a73e8'],
            ['Total Clientes', totalClientes.toString(), '#0d904f'],
            ['Liquidez', pf(liquidez), '#1a6e8e'],
            ['Faturamento Acumulado', nf.format(faturamentoAcumulado), '#d93025'],
          ].map(([t, v, c]) => <Card key={t} className="border-l-4" style={{ borderLeftColor: c as string }}><CardContent className="p-4"><p className="text-sm text-slate-500">{t}</p><p className="text-xl font-bold">{v}</p></CardContent></Card>)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Composição de Receita</CardTitle></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer><PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}>{pieData.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader><CardTitle>Faturamento Mensal</CardTitle></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer><BarChart data={rowsReceita}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="competencia" /><YAxis /><Tooltip /><Bar dataKey="faturamento" fill="#1a73e8" /></BarChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader><CardTitle>Tributos Acumulados</CardTitle></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer><BarChart data={rowsTributos}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="competencia" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#d93025" /></BarChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader><CardTitle>Evolução Tributária</CardTitle></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer><LineChart data={rowsTributos}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="competencia" /><YAxis /><Tooltip /><Line dataKey="aliq" stroke="#0d904f" /></LineChart></ResponsiveContainer></CardContent></Card>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl p-4"><h3 className="font-semibold mb-2">Receitas</h3><table className="min-w-full text-sm"><thead><tr>{['Mês','Faturamento','SVA','Livros','SCM','Serviço','Variação mensal','Trimestre'].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{rowsReceita.map(r => <tr key={r.competencia}><td className="p-2">{r.competencia}</td><td className="p-2">{nf.format(r.faturamento)}</td><td className="p-2">{nf.format(r.sva)} ({pf(r.faturamento ? (r.sva/r.faturamento)*100 : 0)})</td><td className="p-2">{nf.format(r.livros)} ({pf(r.faturamento ? (r.livros/r.faturamento)*100 : 0)})</td><td className="p-2">{nf.format(r.scm)} ({pf(r.faturamento ? (r.scm/r.faturamento)*100 : 0)})</td><td className="p-2">{nf.format(r.servico)} ({pf(r.faturamento ? (r.servico/r.faturamento)*100 : 0)})</td><td className="p-2">{pf(r.variacao)}</td><td className="p-2">{parseQuarter(r.competencia)}</td></tr>)}</tbody></table></div>

        <div className="overflow-x-auto bg-white rounded-xl p-4"><h3 className="font-semibold mb-2">Tributos</h3><table className="min-w-full text-sm"><thead><tr>{['Mês','DAS','COFINS','ICMS','FUST','FUNCEP','FUNTTEL','IRPJ','CSLL','Total','Alíquota efetiva','Variação %'].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{rowsTributos.map(r => <tr key={`t-${r.competencia}`}><td className="p-2">{r.competencia}</td><td className="p-2">{nf.format(r.das)}</td><td className="p-2">{nf.format(r.cofins)}</td><td className="p-2">{nf.format(r.icms)}</td><td className="p-2">{nf.format(r.fust)}</td><td className="p-2">{nf.format(r.funcep)}</td><td className="p-2">{nf.format(r.funttel)}</td><td className="p-2">{nf.format(r.irpj)}</td><td className="p-2">{nf.format(r.csll)}</td><td className="p-2">{nf.format(r.total)}</td><td className="p-2">{pf(r.aliq)}</td><td className="p-2">{pf(r.variacao)}</td></tr>)}</tbody></table></div>

        <div className="overflow-x-auto bg-white rounded-xl p-4"><h3 className="font-semibold mb-2">Folha</h3><table className="min-w-full text-sm"><thead><tr>{['Mês','Proventos','Nº Funcionários','Variação'].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{rowsReceita.map((r,i) => { const proventos=r.faturamento*0.14; const funcionarios=Math.max(1,Math.round(r.faturamento/15000)); const prev=i>0?rowsReceita[i-1].faturamento*0.14:0; const v=prev?((proventos-prev)/prev)*100:0; return <tr key={`f-${r.competencia}`}><td className="p-2">{r.competencia}</td><td className="p-2">{nf.format(proventos)}</td><td className="p-2">{funcionarios}</td><td className="p-2">{pf(v)}</td></tr>;})}</tbody></table></div>
      </div>
    </div>
  );
}
