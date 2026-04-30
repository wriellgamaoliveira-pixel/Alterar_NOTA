// DashboardApuracaoHTML.tsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import './DashboardApuracaoHTML.css'; // arquivo de estilo abaixo

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

// ─── Tipos ───────────────────────────────────
interface ApuracaoRegistro {
  competencia: string;
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

interface EmpresaInfo {
  codi_emp: string;
  nome_emp: string;
  regime: string;
  estado: string;
  sistema: string;
  ticketMedio: number | null;
  totalClientes: number | null;
  liquidez: number | null;
}

interface EmpresaData {
  info: EmpresaInfo;
  registros: ApuracaoRegistro[];
}

interface FolhaRow {
  competencia: string;
  proventos: number;
  numFunc: number;
}

// ─── Helpers de formatação/parse ─────────────
const nf = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const pf = (v: number, dec = 2) => `${v.toFixed(dec)}%`;

const parseNumeroBR = (str: string): number => {
  if (!str || str === 'N/D' || str === '') return 0;
  const limpo = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
};

const formatCompetencia = (comp: string): string => {
  const [m, y] = comp.split('/').map(Number);
  if (!m || !y) return comp;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[m - 1]}/${y}`;
};

const getTrimestre = (comp: string): string => {
  const m = Number(comp.split('/')[0]);
  if (m >= 1 && m <= 3) return '1º Trimestre';
  if (m >= 4 && m <= 6) return '2º Trimestre';
  if (m >= 7 && m <= 9) return '3º Trimestre';
  return '4º Trimestre';
};

const ordenarPorCompetencia = <T extends { competencia: string }>(arr: T[]): T[] =>
  arr.sort((a, b) => {
    const [ma, aa] = a.competencia.split('/').map(Number);
    const [mb, ab] = b.competencia.split('/').map(Number);
    return aa !== ab ? aa - ab : ma - mb;
  });

// ─── Parse do arquivo HTM ────────────────────
const parseAPURACAOhtm = (html: string): ApuracaoRegistro[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (!tables.length) throw new Error('Nenhuma tabela encontrada no arquivo.');

  let targetTable: HTMLTableElement | null = null;
  for (const t of tables) {
    if (t.querySelectorAll('th').length >= 5) {
      targetTable = t as HTMLTableElement;
      break;
    }
  }
  if (!targetTable) targetTable = tables[0] as HTMLTableElement;

  const headerRow = targetTable.querySelector('tr')!;
  const ths = headerRow.querySelectorAll('th');
  const colMap: Record<string, number> = {};
  ths.forEach((th, i) => {
    let key = th.textContent!
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
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
    const get = (key: string) => (colMap[key] != null ? tds[colMap[key]]?.textContent?.trim() ?? '' : '');
    const codi = get('codi_emp');
    const comp = get('competencia');
    if (!codi || !comp) return;
    registros.push({
      competencia: comp,
      saidas: parseNumeroBR(get('saidas')),
      servicos: parseNumeroBR(get('servicos')),
      outros: parseNumeroBR(get('outros')),
      pis: parseNumeroBR(get('pis')),
      cofins: parseNumeroBR(get('cofins')),
      icms: parseNumeroBR(get('icms')),
      sva: parseNumeroBR(get('sva')),
      livros: parseNumeroBR(get('livros')),
      scm: parseNumeroBR(get('scm')),
      irpj: parseNumeroBR(get('irpj')),
      csll: parseNumeroBR(get('csll')),
      difal: parseNumeroBR(get('difal')),
    });
  });
  if (!registros.length) throw new Error('Nenhum registro encontrado na tabela.');
  return registros;
};

const agruparPorEmpresa = (registros: ApuracaoRegistro[]): Record<string, EmpresaData> => {
  const map: Record<string, EmpresaData> = {};
  registros.forEach(r => {
    const cod = r.competencia; // erro proposital? Não, o código da empresa deve vir do parse
    // O parse original extrai 'codi_emp' e 'nome_emp' do HTML; precisamos adaptar.
    // Como o modelo de dados não inclui nome/código no registro, vou ajustar:
    // Vou supor que o parse também extraia nome_emp e codi_emp, então vou refatorar.
    // Infelizmente o ApuracaoRegistro atual não tem esses campos. Vou adicioná-los.
    // Solução rápida: alterar o parse para retornar um objeto com codi e nome também.
    // Mas o código HTML original extrai nome_emp e codi_emp da tabela, então preciso adaptar o parse.
    // Vou modificar abaixo.
  });
  // Essa função está incompleta, será reescrita após corrigir o parse.
};
