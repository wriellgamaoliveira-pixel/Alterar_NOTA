import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Search } from 'lucide-react';
import { useBK } from '@/context/BKContext';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function dateInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function defaultStart() {
  const now = new Date();
  return dateInput(new Date(now.getFullYear(), now.getMonth() - 11, 1));
}

function monthsInRange(start: string, end: string) {
  if (!start || !end || start > end) return [];
  const cursor = new Date(`${start}T12:00:00`);
  const final = new Date(`${end}T12:00:00`);
  cursor.setDate(1); final.setDate(1);
  const months: string[] = [];
  while (cursor <= final) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

const monthLabel = (month: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`));

export default function RelatorioFaturamentoMensal() {
  const { documents, storageReady } = useBK();
  const [startInput, setStartInput] = useState(defaultStart);
  const [endInput, setEndInput] = useState(() => dateInput(new Date()));
  const [query, setQuery] = useState(() => ({ start: defaultStart(), end: dateInput(new Date()) }));
  const invalidPeriod = startInput > endInput;

  const rows = useMemo(() => {
    const grouped = new Map<string, { month: string; invoices: number; total: number }>();
    monthsInRange(query.start, query.end).forEach((month) => grouped.set(month, { month, invoices: 0, total: 0 }));
    documents
      .filter((document) => document.category === 'exportacao' && document.fiscalStatus === 'autorizada' && document.invoiceValue > 0 && document.issueDate.slice(0, 10) >= query.start && document.issueDate.slice(0, 10) <= query.end)
      .forEach((document) => {
        const month = document.issueDate.slice(0, 7);
        const current = grouped.get(month) || { month, invoices: 0, total: 0 };
        current.invoices += 1;
        current.total += document.invoiceValue;
        grouped.set(month, current);
      });
    return [...grouped.values()].sort((a, b) => b.month.localeCompare(a.month));
  }, [documents, query]);

  const totals = useMemo(() => rows.reduce((sum, row) => ({ invoices: sum.invoices + row.invoices, total: sum.total + row.total }), { invoices: 0, total: 0 }), [rows]);

  return <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold text-white"><BarChart3 className="h-6 w-6 text-sky-400" />Relatórios</h1><p className="mt-1 text-sm text-slate-400">Faturamento mensal de notas fiscais de Exportação.</p></div>

    <section className="rounded-xl border border-sky-500/30 bg-slate-900/70 p-5"><div className="flex flex-wrap items-end gap-4"><label className="bk-label">Data inicial<input type="date" value={startInput} onChange={(event) => setStartInput(event.target.value)} className="bk-input" /></label><label className="bk-label">Data final<input type="date" value={endInput} onChange={(event) => setEndInput(event.target.value)} className="bk-input" /></label><button disabled={invalidPeriod} onClick={() => setQuery({ start: startInput, end: endInput })} className="bk-button disabled:cursor-not-allowed disabled:opacity-50"><Search className="h-4 w-4" />Consultar</button></div><div className="mt-4 flex gap-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-xs text-slate-400"><CalendarDays className="h-4 w-4 shrink-0 text-sky-300" /><p>O período inicial já vem preenchido com os últimos 12 meses. São somadas somente notas da categoria <strong className="text-sky-300">Exportação</strong>, autorizadas e com valor maior que zero. Notas canceladas e pendentes não entram no faturamento.</p></div>{invalidPeriod && <p className="mt-2 text-sm text-red-300">A data inicial deve ser anterior ou igual à data final.</p>}</section>

    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Período consultado" value={query.start && query.end ? `${new Intl.DateTimeFormat('pt-BR').format(new Date(`${query.start}T12:00:00`))} a ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${query.end}T12:00:00`))}` : '—'} /><Metric label="Notas aptas" value={String(totals.invoices)} /><Metric label="Faturamento de exportação" value={money(totals.total)} highlight /></section>

    <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70"><div className="border-b border-slate-700 p-4"><h2 className="font-semibold text-white">Faturamento mensal</h2><p className="text-xs text-slate-400">Valores das NF-e de exportação realmente autorizadas no período.</p></div><div className="overflow-x-auto"><table className="bk-table min-w-[620px]"><thead><tr><th>Mês de emissão</th><th>Notas aptas</th><th>Faturamento</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.month}><td className="capitalize font-medium text-white">{monthLabel(row.month)}</td><td>{row.invoices}</td><td className="font-semibold text-sky-300">{money(row.total)}</td></tr>) : <tr><td colSpan={3} className="py-12 text-center text-slate-500">Não há meses no período informado.</td></tr>}</tbody><tfoot>{rows.length > 0 && <tr className="border-t-2 border-slate-600 font-semibold text-white"><td>Total</td><td>{totals.invoices}</td><td className="text-sky-300">{money(totals.total)}</td></tr>}</tfoot></table></div>{storageReady && totals.invoices === 0 && <p className="p-4 text-center text-sm text-slate-500">Nenhuma NF-e de exportação autorizada foi encontrada para este período.</p>}</section>
  </div>;
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-xl border p-4 ${highlight ? 'border-sky-400/60 bg-sky-500/10' : 'border-slate-700 bg-slate-900/70'}`}><p className="text-xs text-slate-400">{label}</p><p className={`mt-1 text-xl font-bold ${highlight ? 'text-sky-300' : 'text-white'}`}>{value}</p></div>;
}
