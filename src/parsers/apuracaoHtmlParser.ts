export interface HeaderInfo {
  empresa: string;
  codigo: string;
  regime: string;
  estado: string;
  sistema: string;
  ticketMedio: number;
  totalClientes: number;
  liquidez: number;
  faturamento: number;
}

export interface ReceitaRow { mes: string; faturamento: number; sva: number; livros: number; scm: number; servico: number; variacao: number; }
export interface TributoRow { mes: string; das: number; cofins: number; icms: number; fust: number; funcep: number; funttel: number; irpj: number; csll: number; total: number; aliquotaEfetiva: number; variacao: number; }
export interface FolhaRow { mes: string; proventos: number; funcionarios: number; variacao: number; }

export interface ApuracaoData { header: HeaderInfo; receitas: ReceitaRow[]; tributos: TributoRow[]; folha: FolhaRow[]; }

const numberFromText = (v: string) => {
  const cleaned = v.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const text = (el?: Element | null) => el?.textContent?.trim() || '';

export function parseApuracaoHtml(html: string): ApuracaoData {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cells = Array.from(doc.querySelectorAll('td,th,p,span,div'));
  const findValue = (label: string) => {
    const idx = cells.findIndex(c => text(c).toLowerCase() === label.toLowerCase());
    if (idx >= 0) return text(cells[idx + 1]);
    const byRegex = cells.find(c => text(c).toLowerCase().startsWith(`${label.toLowerCase()}:`));
    if (byRegex) return text(byRegex).split(':').slice(1).join(':').trim();
    return '';
  };

  const tables = Array.from(doc.querySelectorAll('table'));
  const [t1, t2, t3] = tables;

  const rowsFrom = (table?: Element) => Array.from(table?.querySelectorAll('tr') || []).slice(1).map(r => Array.from(r.querySelectorAll('td,th')).map(c => text(c)));

  const receitas = rowsFrom(t1).map(cols => ({
    mes: cols[0] || '', faturamento: numberFromText(cols[1] || '0'), sva: numberFromText(cols[2] || '0'), livros: numberFromText(cols[4] || '0'), scm: numberFromText(cols[6] || '0'), servico: numberFromText(cols[8] || '0'), variacao: numberFromText(cols[10] || '0'),
  })).filter(r => r.mes);

  const tributos = rowsFrom(t2).map(cols => ({
    mes: cols[0] || '', das: numberFromText(cols[1] || '0'), cofins: numberFromText(cols[2] || '0'), icms: numberFromText(cols[3] || '0'), fust: numberFromText(cols[4] || '0'), funcep: numberFromText(cols[5] || '0'), funttel: numberFromText(cols[6] || '0'), irpj: numberFromText(cols[7] || '0'), csll: numberFromText(cols[8] || '0'), total: numberFromText(cols[9] || '0'), aliquotaEfetiva: numberFromText(cols[10] || '0'), variacao: numberFromText(cols[11] || '0'),
  })).filter(r => r.mes);

  const folha = rowsFrom(t3).map(cols => ({ mes: cols[0] || '', proventos: numberFromText(cols[1] || '0'), funcionarios: numberFromText(cols[2] || '0'), variacao: numberFromText(cols[3] || '0') })).filter(r => r.mes);

  return {
    header: {
      empresa: findValue('Empresa'), codigo: findValue('Código') || findValue('Codigo'), regime: findValue('Regime'), estado: findValue('Estado'), sistema: findValue('Sistema'),
      ticketMedio: numberFromText(findValue('Ticket Médio') || findValue('Ticket Medio')),
      totalClientes: numberFromText(findValue('Total Clientes')),
      liquidez: numberFromText(findValue('Liquidez')),
      faturamento: numberFromText(findValue('Faturamento')),
    },
    receitas,
    tributos,
    folha,
  };
}
