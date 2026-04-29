// src/parsers/apuracaoHtmlParser.ts

export interface ApuracaoRegistro {
  codi_emp: string;
  nome_emp: string;
  competencia: string; // formato "MM/AAAA"
  saidas: number;
  servicos: number;
  outros: number;
  pis: number;
  cofins: number;
  icms: number;
  sva: number;
  livros: number;
  scm: number;
  irpj: number;
  csll: number;
  difal: number;
}

export interface DadosEmpresa {
  info: {
    codi_emp: string;
    nome_emp: string;
    regime?: string;
    estado?: string;
    sistema?: string;
    ticketMedio?: number;
    totalClientes?: number;
    liquidez?: number;
  };
  registros: ApuracaoRegistro[];
}

export function parseAPURACAOhtm(htmlString: string): ApuracaoRegistro[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const tables = doc.querySelectorAll('table');

  let targetTable: HTMLTableElement | null = null;
  for (const t of tables) {
    if (t.querySelectorAll('th').length >= 5) {
      targetTable = t as HTMLTableElement;
      break;
    }
  }
  if (!targetTable && tables.length > 0) {
    targetTable = tables[0] as HTMLTableElement;
  }
  if (!targetTable) {
    throw new Error('Nenhuma tabela com dados encontrada no arquivo HTM.');
  }

  const headerRow = targetTable.querySelector('tr:has(th)');
  if (!headerRow) throw new Error('Cabeçalho da tabela não encontrado.');

  const ths = headerRow.querySelectorAll('th');
  const colMap: Record<string, number> = {};

  ths.forEach((th, i) => {
    let key = th.textContent?.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || '';

    if (key === 'codi_emp' || key === 'cod_emp' || key === 'codigo') key = 'codi_emp';
    if (key === 'nome_emp' || key === 'nome' || key === 'empresa') key = 'nome_emp';
    if (key === 'saidas' || key === 'saidas_') key = 'saidas';
    if (key === 'competencia' || key === 'mes' || key === 'comp') key = 'competencia';

    colMap[key] = i;
  });

  const dataRows = targetTable.querySelectorAll('tr:has(td)');
  const registros: ApuracaoRegistro[] = [];

  dataRows.forEach(row => {
    const tds = row.querySelectorAll('td');
    if (tds.length < 5) return;

    const obj: Record<string, string> = {};
    for (const [key, idx] of Object.entries(colMap)) {
      if (idx < tds.length) {
        obj[key] = tds[idx].textContent?.trim() || '';
      }
    }

    if (!obj.codi_emp || !obj.competencia) return;

    const parseNum = (val: string) => {
      const cleaned = val.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    registros.push({
      codi_emp: obj.codi_emp,
      nome_emp: obj.nome_emp || `Empresa ${obj.codi_emp}`,
      competencia: obj.competencia,
      saidas: parseNum(obj.saidas || '0'),
      servicos: parseNum(obj.servicos || '0'),
      outros: parseNum(obj.outros || '0'),
      pis: parseNum(obj.pis || '0'),
      cofins: parseNum(obj.cofins || '0'),
      icms: parseNum(obj.icms || '0'),
      sva: parseNum(obj.sva || '0'),
      livros: parseNum(obj.livros || '0'),
      scm: parseNum(obj.scm || '0'),
      irpj: parseNum(obj.irpj || '0'),
      csll: parseNum(obj.csll || '0'),
      difal: parseNum(obj.difal || '0'),
    });
  });

  if (registros.length === 0) {
    throw new Error('Nenhum registro de dados válido encontrado.');
  }
  return registros;
}

export function agruparPorEmpresa(registros: ApuracaoRegistro[]): Record<string, DadosEmpresa> {
  const grouped: Record<string, DadosEmpresa> = {};
  registros.forEach(r => {
    const cod = r.codi_emp;
    if (!grouped[cod]) {
      grouped[cod] = {
        info: {
          codi_emp: cod,
          nome_emp: r.nome_emp,
          regime: 'N/D',
          estado: 'N/D',
          sistema: 'N/D',
        },
        registros: [],
      };
    }
    grouped[cod].registros.push(r);
  });

  for (const cod in grouped) {
    grouped[cod].registros.sort((a, b) => {
      const [ma, aa] = a.competencia.split('/').map(Number);
      const [mb, ab] = b.competencia.split('/').map(Number);
      return aa !== ab ? aa - ab : ma - mb;
    });
  }
  return grouped;
}