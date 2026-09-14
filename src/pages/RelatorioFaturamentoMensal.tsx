import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Search } from 'lucide-react';
import { useBK } from '@/context/BKContext';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fiscalStatuses = [
  { value: 'autorizada', label: 'Autorizadas' },
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'pendente', label: 'Pendentes' },
] as const;

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
  const [statusInput, setStatusInput] = useState<string[]>(['autorizada']);
  const [cfopInput, setCfopInput] = useState<string[]>([]);
  const [query, setQuery] = useState(() => ({ start: defaultStart(), end: dateInput(new Date()), statuses: ['autorizada'], cfops: [] as string[] }));
  const invalidPeriod = startInput > endInput;
  const availableCfops = useMemo(() => [...new Set(documents.filter((document) => document.category === 'exportacao').flatMap((document) => document.cfops))].sort(), [documents]);

  const rows = useMemo(() => {
    const grouped = new Map<string, { month: string; invoices: number; total: number }>();
    monthsInRange(query.start, query.end).forEach((month) => grouped.set(month, { month, invoices: 0, total: 0 }));
    documents
      .filter((document) => document.category === 'exportacao' && query.statuses.includes(document.fiscalStatus) && (query.cfops.length === 0 || document.cfops.some((cfop) => query.cfops.includes(cfop))) && document.invoiceValue > 0 && document.issueDate.slice(0, 10) >= query.start && document.issueDate.slice(0, 10) <= query.end)
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

    <section className="rounded-xl border border-sky-500/30 bg-slate-900/70 p-5"><div className="flex flex-wrap items-end gap-4"><label className="bk-label">Data inicial<input type="date" value={startInput} onChange={(event) => setStartInput(event.target.value)} className="bk-input" /></label><label className="bk-label">Data final<input type="date" value={endInput} onChange={(event) => setEndInput(event.target.value)} className="bk-input" /></label><button disabled={invalidPeriod || statusInput.length === 0} onClick={() => setQuery({ start: startInput, end: endInput, statuses: statusInput, cfops: cfopInput })} className="bk-button disabled:cursor-not-allowed disabled:opacity-50"><Search className="h-4 w-4" />Consultar</button></div><fieldset className="mt-4"><legend className="mb-2 text-sm font-medium text-slate-200">Situação fiscal</legend><div className="flex flex-wrap gap-2">{fiscalStatuses.map((status) => <label key={status.value} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${statusInput.includes(status.value) ? 'border-sky-400/60 bg-sky-500/15 text-sky-200' : 'border-slate-700 text-slate-400'}`}><input type="checkbox" className="mr-2 accent-sky-400" checked={statusInput.includes(status.value)} onChange={() => setStatusInput((current) => current.includes(status.value) ? current.filter((value) => value !== status.value) : [...current, status.value])} />{status.label}</label>)}</div></fieldset><fieldset className="mt-4"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><legend className="text-sm font-medium text-slate-200">CFOP de Exportação</legend><button type="button" onClick={() => setCfopInput([])} className="text-xs text-sky-300 hover:text-sky-200">Todos</button><span className="text-xs text-slate-500">{cfopInput.length ? `${cfopInput.length} selecionado(s)` : 'Todos os CFOPs'}</span></div><div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">{availableCfops.length ? availableCfops.map((cfop) => <label key={cfop} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${cfopInput.includes(cfop) ? 'border-sky-400/60 bg-sky-500/15 text-sky-200' : 'border-slate-700 text-slate-400'}`}><input type="checkbox" className="mr-2 accent-sky-400" checked={cfopInput.includes(cfop)} onChange={() => setCfopInput((current) => current.includes(cfop) ? current.filter((value) => value !== cfop) : [...current, cfop])} />{cfop}</label>) : <p className="text-sm text-slate-500">Os CFOPs aparecerão após a importação de notas de Exportação.</p>}</div></fieldset><div className="mt-4 flex gap-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-xs text-slate-400"><CalendarDays className="h-4 w-4 shrink-0 text-sky-300" /><p>O período inicial já vem preenchido com os últimos 12 meses. Escolha uma ou mais situações e, se necessário, os CFOPs que devem ser consultados na base central de documentos.</p></div>{invalidPeriod && <p className="mt-2 text-sm text-red-300">A data inicial deve ser anterior ou igual à data final.</p>}{statusInput.length === 0 && <p className="mt-2 text-sm text-red-300">Selecione ao menos uma situação fiscal.</p>}</section>

    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Período consultado" value={query.start && query.end ? `${new Intl.DateTimeFormat('pt-BR').format(new Date(`${query.start}T12:00:00`))} a ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${query.end}T12:00:00`))}` : '—'} /><Metric label="Notas encontradas" value={String(totals.invoices)} /><Metric label="Faturamento de exportação" value={money(totals.total)} highlight /></section>

    <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70"><div className="border-b border-slate-700 p-4"><h2 className="font-semibold text-white">Faturamento mensal</h2><p className="text-xs text-slate-400">Valores das NF-e de Exportação conforme as situações e CFOPs selecionados.</p></div><div className="overflow-x-auto"><table className="bk-table min-w-[620px]"><thead><tr><th>Mês de emissão</th><th>Notas encontradas</th><th>Faturamento</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.month}><td className="capitalize font-medium text-white">{monthLabel(row.month)}</td><td>{row.invoices}</td><td className="font-semibold text-sky-300">{money(row.total)}</td></tr>) : <tr><td colSpan={3} className="py-12 text-center text-slate-500">Não há meses no período informado.</td></tr>}</tbody><tfoot>{rows.length > 0 && <tr className="border-t-2 border-slate-600 font-semibold text-white"><td>Total</td><td>{totals.invoices}</td><td className="text-sky-300">{money(totals.total)}</td></tr>}</tfoot></table></div>{storageReady && totals.invoices === 0 && <p className="p-4 text-center text-sm text-slate-500">Nenhuma NF-e de Exportação foi encontrada para os filtros selecionados.</p>}</section>
  </div>;
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`rounded-xl border p-4 ${highlight ? 'border-sky-400/60 bg-sky-500/10' : 'border-slate-700 bg-slate-900/70'}`}><p className="text-xs text-slate-400">{label}</p><p className={`mt-1 text-xl font-bold ${highlight ? 'text-sky-300' : 'text-white'}`}>{value}</p></div>;
}
