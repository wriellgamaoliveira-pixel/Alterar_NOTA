export interface RegistroApuracao {
  competencia: string;
  saidas: string;
  servicos: string;
  outros: string;
  pis: string;
  cofins: string;
  icms: string;
  sva: string;
  livros: string;
  scm: string;
  irpj: string;
  csll: string;
  difal: string;
}

export interface InfoEmpresa {
  codi_emp: string;
  nome_emp: string;
  regime?: string;
  estado?: string;
  sistema?: string;
  ticketMedio?: number;
  totalClientes?: number;
  liquidez?: number;
}

export interface RegistroFolha {
  competencia: string;
  proventos: string;
  numFunc: number;
}

export interface AgrupamentoEmpresa {
  info: InfoEmpresa;
  registros: RegistroApuracao[];
  folha: RegistroFolha[];
}

export function parseApuracaoHtml(html: string): Record<string, AgrupamentoEmpresa> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  
  if (tables.length === 0) throw new Error('Nenhuma tabela encontrada');
  
  // Localizar tabela com cabeçalhos
  let targetTable: HTMLTableElement | null = null;
  for (const table of tables) {
    if (table.querySelectorAll('th').length >= 5) {
      targetTable = table;
      break;
    }
  }
  if (!targetTable) targetTable = tables[0] as HTMLTableElement;
  
  // Mapear colunas
  const headerRow = targetTable.querySelector('tr');
  const headers = headerRow ? Array.from(headerRow.querySelectorAll('th, td')).map(h => h.textContent?.trim().toLowerCase() || '') : [];
  
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    if (key.includes('codi_emp') || key.includes('cod_emp') || key.includes('codigo')) colIndex['codi_emp'] = i;
    if (key.includes('nome_emp') || key.includes('nome')) colIndex['nome_emp'] = i;
    if (key.includes('saidas')) colIndex['saidas'] = i;
    if (key.includes('servicos')) colIndex['servicos'] = i;
    if (key.includes('outros')) colIndex['outros'] = i;
    if (key.includes('pis')) colIndex['pis'] = i;
    if (key.includes('cofins')) colIndex['cofins'] = i;
    if (key.includes('icms')) colIndex['icms'] = i;
    if (key.includes('sva')) colIndex['sva'] = i;
    if (key.includes('livros')) colIndex['livros'] = i;
    if (key.includes('scm')) colIndex['scm'] = i;
    if (key.includes('irpj')) colIndex['irpj'] = i;
    if (key.includes('csll')) colIndex['csll'] = i;
    if (key.includes('difal')) colIndex['difal'] = i;
    if (key.includes('proventos')) colIndex['proventos'] = i;
    if (key.includes('funcionarios') || key.includes('n_func') || key.includes('qtd_func')) colIndex['num_func'] = i;
    if (key.includes('competencia') || key.includes('comp')) colIndex['competencia'] = i;
  });
  
  const rows = targetTable.querySelectorAll('tr');
  const registros: any[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    if (cells.length < 5) continue;
    
    const getCell = (key: string) => {
      return colIndex[key] !== undefined ? cells[colIndex[key]]?.textContent?.trim() || '' : '';
    };
    
    const codi = getCell('codi_emp');
    const comp = getCell('competencia');
    if (!codi || !comp) continue;
    
    registros.push({
      codi_emp: codi,
      nome_emp: getCell('nome_emp') || `Empresa ${codi}`,
      competencia: comp,
      saidas: getCell('saidas') || '0,00',
      servicos: getCell('servicos') || '0,00',
      outros: getCell('outros') || '0,00',
      pis: getCell('pis') || '0,00',
      cofins: getCell('cofins') || '0,00',
      icms: getCell('icms') || '0,00',
      sva: getCell('sva') || '0,00',
      livros: getCell('livros') || '0,00',
      scm: getCell('scm') || '0,00',
      irpj: getCell('irpj') || '0,00',
      csll: getCell('csll') || '0,00',
      difal: getCell('difal') || '0,00',
      proventos: getCell('proventos') || '0,00',
      num_func: Number((getCell('num_func') || '0').replace(/\D/g, '')) || 0,
    });
  }
  
  if (registros.length === 0) throw new Error('Nenhum registro encontrado na tabela');
  
  // Agrupar por empresa
  const agrupado: Record<string, AgrupamentoEmpresa> = {};
  registros.forEach(r => {
    if (!agrupado[r.codi_emp]) {
      agrupado[r.codi_emp] = {
        info: {
          codi_emp: r.codi_emp,
          nome_emp: r.nome_emp,
          regime: 'N/D',
          estado: 'N/D',
          sistema: 'N/D',
        },
        registros: [],
        folha: [],
      };
    }
    agrupado[r.codi_emp].registros.push({
      competencia: r.competencia,
      saidas: r.saidas,
      servicos: r.servicos,
      outros: r.outros,
      pis: r.pis,
      cofins: r.cofins,
      icms: r.icms,
      sva: r.sva,
      livros: r.livros,
      scm: r.scm,
      irpj: r.irpj,
      csll: r.csll,
      difal: r.difal,
    });

    if (r.proventos || r.num_func) {
      agrupado[r.codi_emp].folha.push({
        competencia: r.competencia,
        proventos: r.proventos || '0,00',
        numFunc: r.num_func || 0,
      });
    }
  });
  
  return agrupado;
}
