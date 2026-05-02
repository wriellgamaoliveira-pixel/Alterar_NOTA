import { useState, useMemo, useCallback, useRef } from 'react';
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
import './DashboardApuracao.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

// ─── Tipos ───────────────────────────────────
interface RegistroBruto {
  codi_emp: string;
  nome_emp: string;
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
  registros: RegistroBruto[];
}

interface FolhaRow {
  competencia: string;
  proventos: number;
  numFunc: number;
}

// ─── Helpers ─────────────────────────────────
const nf = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
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

const ordenar = <T extends { competencia: string }>(arr: T[]): T[] =>
  arr.sort((a, b) => {
    const [ma, aa] = a.competencia.split('/').map(Number);
    const [mb, ab] = b.competencia.split('/').map(Number);
    return aa !== ab ? aa - ab : ma - mb;
  });

// ─── Parsing ─────────────────────────────────
const parseAPURACAOhtm = (html: string): RegistroBruto[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (!tables.length) throw new Error('Nenhuma tabela encontrada.');

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
  const registros: RegistroBruto[] = [];
  dataRows.forEach(row => {
    const tds = row.querySelectorAll('td');
    if (tds.length < 5) return;
    const get = (k: string) => (colMap[k] != null ? tds[colMap[k]]?.textContent?.trim() ?? '' : '');
    const codi = get('codi_emp');
    const comp = get('competencia');
    if (!codi || !comp) return;
    registros.push({
      codi_emp: codi,
      nome_emp: get('nome_emp') || `Empresa ${codi}`,
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
  if (!registros.length) throw new Error('Nenhum registro encontrado.');
  return registros;
};

const agruparPorEmpresa = (registros: RegistroBruto[]): Record<string, EmpresaData> => {
  const map: Record<string, EmpresaData> = {};
  registros.forEach(r => {
    const cod = r.codi_emp;
    if (!map[cod]) {
      map[cod] = {
        info: {
          codi_emp: cod,
          nome_emp: r.nome_emp,
          regime: 'N/D',
          estado: 'N/D',
          sistema: 'N/D',
          ticketMedio: null,
          totalClientes: null,
          liquidez: null,
        },
        registros: [],
      };
    }
    map[cod].registros.push({ ...r });
  });
  Object.values(map).forEach(d => (d.registros = ordenar(d.registros)));
  return map;
};

// ─── Componente ──────────────────────────────
export default function DashboardApuracao() {
  const [allCompaniesData, setAllCompaniesData] = useState<Record<string, EmpresaData>>({});
  const [currentCode, setCurrentCode] = useState<string>('');
  const [folhaExtra, setFolhaExtra] = useState<Record<string, FolhaRow[]>>({});
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'receitas' | 'tributos' | 'folha' | 'trimestres'>('receitas');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const empresas = Object.keys(allCompaniesData);
  const currentData = currentCode ? allCompaniesData[currentCode] : undefined;
  const registros = currentData?.registros ?? [];
  const info = currentData?.info;

  const processFileContent = useCallback((html: string, name: string) => {
    try {
      const regs = parseAPURACAOhtm(html);
      const grouped = agruparPorEmpresa(regs);
      setAllCompaniesData(grouped);
      setFolhaExtra(prev => {
        const next = { ...prev };
        Object.keys(grouped).forEach(cod => {
          if (!next[cod]) next[cod] = [];
        });
        return next;
      });
      const firstCode = Object.keys(grouped)[0] ?? '';
      setCurrentCode(firstCode);
      setFileName(name);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Erro ao processar arquivo.');
    }
  }, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => processFileContent(reader.result as string, file.name);
    reader.onerror = () => setError('Erro ao ler o arquivo.');
    reader.readAsText(file, 'UTF-8');
  };

  const loadDemoData = () => {
    const demoHTML = `
<TABLE WIDTH=1419>
<TR><TD WIDTH=44><TD WIDTH=264><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=88><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=77><TD WIDTH=99></TR>
<TR>
    <TH ALIGN=right>codi_emp</TH><TH ALIGN=left>nome_emp</TH><TH ALIGN=right>saidas</TH><TH ALIGN=right>servicos</TH>
    <TH ALIGN=right>outros</TH><TH ALIGN=right>pis</TH><TH ALIGN=right>cofins</TH><TH ALIGN=right>icms</TH>
    <TH ALIGN=right>sva</TH><TH ALIGN=right>livros</TH><TH ALIGN=right>scm</TH><TH ALIGN=right>Saidas</TH>
    <TH ALIGN=right>difal</TH><TH ALIGN=right>irpj</TH><TH ALIGN=right>csll</TH><TH ALIGN=right>COMPETENCIA</TH><TD></TD>
</TR>
<TR><TD ALIGN=right>201</TD><TD>ADLLINK TELECOM PROVEDOR DE INTERNET LTD</TD><TD ALIGN=right>439.324,46</TD><TD ALIGN=right>40.500,00</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>2.259,01</TD><TD ALIGN=right>10.426,19</TD><TD ALIGN=right>39.096,38</TD><TD ALIGN=right>188.598,93</TD><TD ALIGN=right>52.073,55</TD><TD ALIGN=right>198.651,98</TD><TD ALIGN=right>439.324,46</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>12.429,28</TD><TD ALIGN=right>17.017,18</TD><TD>03/2026</TD></TR>
<TR><TD ALIGN=right>201</TD><TD>ADLLINK TELECOM PROVEDOR DE INTERNET LTD</TD><TD ALIGN=right>452.100,00</TD><TD ALIGN=right>42.300,00</TD><TD ALIGN=right>500,00</TD><TD ALIGN=right>2.350,00</TD><TD ALIGN=right>10.800,00</TD><TD ALIGN=right>40.200,00</TD><TD ALIGN=right>195.000,00</TD><TD ALIGN=right>54.200,00</TD><TD ALIGN=right>202.900,00</TD><TD ALIGN=right>452.100,00</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>12.800,00</TD><TD ALIGN=right>17.500,00</TD><TD>04/2026</TD></TR>
<TR><TD ALIGN=right>201</TD><TD>ADLLINK TELECOM PROVEDOR DE INTERNET LTD</TD><TD ALIGN=right>468.500,00</TD><TD ALIGN=right>44.100,00</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>2.420,00</TD><TD ALIGN=right>11.150,00</TD><TD ALIGN=right>41.500,00</TD><TD ALIGN=right>202.000,00</TD><TD ALIGN=right>56.000,00</TD><TD ALIGN=right>210.500,00</TD><TD ALIGN=right>468.500,00</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>13.200,00</TD><TD ALIGN=right>18.000,00</TD><TD>05/2026</TD></TR>
<TR><TD ALIGN=right>302</TD><TD>CONECTA FIBRA TELECOM LTDA</TD><TD ALIGN=right>280.000,00</TD><TD ALIGN=right>25.000,00</TD><TD ALIGN=right>1.200,00</TD><TD ALIGN=right>1.500,00</TD><TD ALIGN=right>6.900,00</TD><TD ALIGN=right>25.000,00</TD><TD ALIGN=right>120.000,00</TD><TD ALIGN=right>35.000,00</TD><TD ALIGN=right>125.000,00</TD><TD ALIGN=right>280.000,00</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>8.000,00</TD><TD ALIGN=right>10.500,00</TD><TD>03/2026</TD></TR>
<TR><TD ALIGN=right>302</TD><TD>CONECTA FIBRA TELECOM LTDA</TD><TD ALIGN=right>295.000,00</TD><TD ALIGN=right>26.500,00</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>1.580,00</TD><TD ALIGN=right>7.200,00</TD><TD ALIGN=right>26.300,00</TD><TD ALIGN=right>126.000,00</TD><TD ALIGN=right>37.000,00</TD><TD ALIGN=right>132.000,00</TD><TD ALIGN=right>295.000,00</TD><TD ALIGN=right>0,00</TD><TD ALIGN=right>8.400,00</TD><TD ALIGN=right>11.000,00</TD><TD>04/2026</TD></TR>
</TABLE>`;
    processFileContent(demoHTML, 'APURACAO_DEMO.htm');
    setFolhaExtra(prev => ({
      ...prev,
      '201': [
        { competencia: '03/2026', proventos: 85000, numFunc: 22 },
        { competencia: '04/2026', proventos: 87200, numFunc: 23 },
        { competencia: '05/2026', proventos: 89100, numFunc: 23 },
      ],
      '302': [
        { competencia: '03/2026', proventos: 52000, numFunc: 14 },
        { competencia: '04/2026', proventos: 53500, numFunc: 15 },
      ],
    }));
    setAllCompaniesData(prev => {
      const newData = { ...prev };
      if (newData['201']) {
        newData['201'].info = {
          ...newData['201'].info,
          regime: 'Lucro Real',
          estado: 'SP',
          sistema: 'SGP',
          ticketMedio: 89.90,
          totalClientes: 4850,
          liquidez: 1.85,
        };
      }
      if (newData['302']) {
        newData['302'].info = {
          ...newData['302'].info,
          regime: 'Simples Nacional',
          estado: 'MG',
          sistema: 'SGP',
          ticketMedio: 75.50,
          totalClientes: 3500,
          liquidez: 2.10,
        };
      }
      return newData;
    });
  };

  const resetAll = () => {
    setAllCompaniesData({});
    setFolhaExtra({});
    setCurrentCode('');
    setFileName('');
    setError('');
  };

  const faturamentoPorMes = useMemo(() => registros.map(r => r.saidas + r.servicos + r.outros), [registros]);
  const fatAcumulado = useMemo(() => faturamentoPorMes.reduce((a, b) => a + b, 0), [faturamentoPorMes]);
  const totalTributos = useMemo(() => registros.reduce((s, r) => s + r.pis + r.cofins + r.icms + r.irpj + r.csll, 0), [registros]);
  const aliqEfetivaGeral = fatAcumulado ? (totalTributos / fatAcumulado) * 100 : 0;
  const totalSVA = useMemo(() => registros.reduce((s, r) => s + r.sva, 0), [registros]);
  const totalLivros = useMemo(() => registros.reduce((s, r) => s + r.livros, 0), [registros]);
  const totalSCM = useMemo(() => registros.reduce((s, r) => s + r.scm, 0), [registros]);
  const totalServicos = useMemo(() => registros.reduce((s, r) => s + r.servicos, 0), [registros]);

  const folhaAtual = useMemo(() => {
    if (!currentCode) return [];
    return ordenar(folhaExtra[currentCode] ?? []);
  }, [currentCode, folhaExtra]);

  const totalProventosFolha = folhaAtual.reduce((s, f) => s + f.proventos, 0);
  const mediaFuncFolha = folhaAtual.length > 0
    ? Math.round(folhaAtual.reduce((s, f) => s + f.numFunc, 0) / folhaAtual.length)
    : 0;

  const variacao = (atual: number, anterior: number) => ({
    abs: anterior !== 0 ? atual - anterior : 0,
    perc: anterior !== 0 ? ((atual - anterior) / anterior) * 100 : 0,
  });

  const doughnutData = useMemo(() => {
    const labels = ['SVA', 'Livros', 'SCM', 'Serviços'];
    const data = [totalSVA, totalLivros, totalSCM, totalServicos];
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#4285f4', '#34a853', '#fbbc04', '#ea4335'],
        borderColor: '#fff',
        borderWidth: 3,
      }],
    };
  }, [totalSVA, totalLivros, totalSCM, totalServicos]);

  const barFatData = useMemo(() => {
    const labels = registros.map(r => formatCompetencia(r.competencia));
    return {
      labels,
      datasets: [{
        label: 'Faturamento (R$)',
        data: faturamentoPorMes,
        backgroundColor: 'rgba(26,115,232,0.75)',
        borderColor: '#1a73e8',
        borderWidth: 2,
        borderRadius: 8,
      }],
    };
  }, [registros, faturamentoPorMes]);

  const barTribData = useMemo(() => {
    const totalPIS = registros.reduce((s, r) => s + r.pis, 0);
    const totalCOFINS = registros.reduce((s, r) => s + r.cofins, 0);
    const totalICMS = registros.reduce((s, r) => s + r.icms, 0);
    const totalIRPJ = registros.reduce((s, r) => s + r.irpj, 0);
    const totalCSLL = registros.reduce((s, r) => s + r.csll, 0);
    return {
      labels: ['PIS', 'COFINS', 'ICMS', 'IRPJ', 'CSLL'],
      datasets: [{
        label: 'Total Acumulado (R$)',
        data: [totalPIS, totalCOFINS, totalICMS, totalIRPJ, totalCSLL],
        backgroundColor: ['#ff9800', '#f44336', '#9c27b0', '#2196f3', '#4caf50'],
        borderRadius: 8,
      }],
    };
  }, [registros]);

  const lineTribData = useMemo(() => {
    const tribMensal = registros.map(r => r.pis + r.cofins + r.icms + r.irpj + r.csll);
    return {
      labels: registros.map(r => formatCompetencia(r.competencia)),
      datasets: [{
        label: 'Total de Tributos (R$)',
        data: tribMensal,
        borderColor: '#d93025',
        backgroundColor: 'rgba(217,48,37,0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: '#d93025',
      }],
    };
  }, [registros]);

  const addFolhaRow = () => {
    if (!currentCode) {
      setError('Selecione uma empresa primeiro.');
      return;
    }
    const comp = window.prompt('Competência (ex: 03/2026):', '');
    if (!comp) return;
    const provStr = window.prompt('Total de Proventos (R$):', '0,00');
    if (provStr === null) return;
    const numStr = window.prompt('Nº de Funcionários:', '0');
    if (numStr === null) return;
    const proventos = parseNumeroBR(provStr);
    const numFunc = parseInt(numStr) || 0;
    setFolhaExtra(prev => {
      const updated = { ...prev };
      const list = [...(updated[currentCode] || [])];
      const idx = list.findIndex(f => f.competencia === comp);
      if (idx >= 0) list[idx] = { competencia: comp, proventos, numFunc };
      else list.push({ competencia: comp, proventos, numFunc });
      updated[currentCode] = list;
      return updated;
    });
  };

  return (
    <div className="dashboard-container">
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-icon">📊</div>
          <div>
            <h1>Dashboard de Apuração</h1>
            <div className="subtitle">Sistema de Análise Financeira e Tributária</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline btn-sm" onClick={resetAll}>🔄 Reiniciar</button>
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>📁 Carregar Arquivo</button>
          <button className="btn btn-accent btn-sm" onClick={loadDemoData}>📋 Demo</button>
          <input
            type="file"
            accept=".htm,.html,.txt"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      </header>

      <div
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
        onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <UploadCloud size={48} className="upload-icon" />
        <p>Arraste e solte o arquivo <strong>APURACAO.htm</strong> aqui</p>
        <p>ou clique para selecionar</p>
        {fileName && <div className="file-name">✅ {fileName}</div>}
      </div>
      {error && <div className="toast error show">{error}</div>}

      {empresas.length > 0 && (
        <div className="main-container">
          <div className="company-selector-bar">
            <label htmlFor="companySelect">🏢 Empresa:</label>
            <select id="companySelect" value={currentCode} onChange={e => setCurrentCode(e.target.value)}>
              {Object.entries(allCompaniesData).map(([cod, data]) => (
                <option key={cod} value={cod}>{data.info.nome_emp} (Cód. {cod})</option>
              ))}
            </select>
            <span className="badge-info">Regime: {info?.regime ?? 'N/D'}</span>
            <span className="badge-info">Estado: {info?.estado ?? 'N/D'}</span>
            <span className="badge-info">Sistema: {info?.sistema ?? 'N/D'}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Total: {empresas.length} empresa(s)
            </span>
          </div>

          <div className="cards-row">
            <div className="indicator-card">
              <span className="card-label">🎫 Ticket Médio</span>
              <span className="card-value">{info?.ticketMedio ? nf(info.ticketMedio) : 'N/D'}</span>
              <span className="card-sub">por cliente</span>
            </div>
            <div className="indicator-card accent-green">
              <span className="card-label">👥 Total de Clientes</span>
              <span className="card-value">{info?.totalClientes ?? 'N/D'}</span>
              <span className="card-sub">base ativa</span>
            </div>
            <div className="indicator-card accent-teal">
              <span className="card-label">💧 Liquidez</span>
              <span className="card-value">{info?.liquidez ? info.liquidez.toFixed(2) : 'N/D'}</span>
              <span className="card-sub">índice</span>
            </div>
            <div className="indicator-card accent-purple">
              <span className="card-label">📈 Faturamento Acumulado</span>
              <span className="card-value">{nf(fatAcumulado)}</span>
              <span className="card-sub">período analisado</span>
            </div>
            <div className="indicator-card accent-orange">
              <span className="card-label">💰 Total Tributos</span>
              <span className="card-value">{nf(totalTributos)}</span>
              <span className="card-sub">alíquota efetiva: <strong>{pf(aliqEfetivaGeral)}</strong></span>
            </div>
            <div className="indicator-card accent-red">
              <span className="card-label">👷 Total Funcionários</span>
              <span className="card-value">{mediaFuncFolha > 0 ? `${mediaFuncFolha} (média)` : 'N/D'}</span>
              <span className="card-sub">folha de pagamento</span>
            </div>
          </div>

          <div className="tabs-nav">
            <button className={`tab-btn ${activeTab === 'receitas' ? 'active' : ''}`} onClick={() => setActiveTab('receitas')}>📋 Tabela 1: Receitas</button>
            <button className={`tab-btn ${activeTab === 'tributos' ? 'active' : ''}`} onClick={() => setActiveTab('tributos')}>🏛️ Tabela 2: Tributos</button>
            <button className={`tab-btn ${activeTab === 'folha' ? 'active' : ''}`} onClick={() => setActiveTab('folha')}>👥 Tabela 3: Folha de Pagamento</button>
            <button className={`tab-btn ${activeTab === 'trimestres' ? 'active' : ''}`} onClick={() => setActiveTab('trimestres')}>📅 Totais Trimestrais</button>
          </div>

          {activeTab === 'receitas' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Faturamento (R$)</th>
                    <th>SVA (R$)</th>
                    <th>Livros (R$)</th>
                    <th>SCM (R$)</th>
                    <th>Serviço (R$)</th>
                    <th>Var. Absoluta (R$)</th>
                    <th>Var. %</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => {
                    const fat = r.saidas + r.servicos + r.outros;
                    const prev = i > 0 ? registros[i - 1].saidas + registros[i - 1].servicos + registros[i - 1].outros : 0;
                    const { abs, perc } = variacao(fat, prev);
                    return (
                      <tr key={r.competencia}>
                        <td className="text-center">{formatCompetencia(r.competencia)}</td>
                        <td>{nf(fat)}</td>
                        <td>{nf(r.sva)} <span className="part-badge">{pf(fat ? (r.sva / fat) * 100 : 0)}</span></td>
                        <td>{nf(r.livros)} <span className="part-badge">{pf(fat ? (r.livros / fat) * 100 : 0)}</span></td>
                        <td>{nf(r.scm)} <span className="part-badge">{pf(fat ? (r.scm / fat) * 100 : 0)}</span></td>
                        <td>{nf(r.servicos)} <span className="part-badge">{pf(fat ? (r.servicos / fat) * 100 : 0)}</span></td>
                        <td className={abs > 0 ? 'highlight-positive' : abs < 0 ? 'highlight-negative' : ''}>
                          {i === 0 ? '—' : `${abs >= 0 ? '+' : ''}${nf(abs)}`}
                        </td>
                        <td className={perc > 0 ? 'highlight-positive' : perc < 0 ? 'highlight-negative' : ''}>
                          {i === 0 ? '—' : `${perc >= 0 ? '+' : ''}${perc.toFixed(2)}%`}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="row-total">
                    <td>TOTAL</td>
                    <td>{nf(fatAcumulado)}</td>
                    <td>{nf(totalSVA)} ({pf(fatAcumulado ? (totalSVA / fatAcumulado) * 100 : 0)})</td>
                    <td>{nf(totalLivros)} ({pf(fatAcumulado ? (totalLivros / fatAcumulado) * 100 : 0)})</td>
                    <td>{nf(totalSCM)} ({pf(fatAcumulado ? (totalSCM / fatAcumulado) * 100 : 0)})</td>
                    <td>{nf(totalServicos)} ({pf(fatAcumulado ? (totalServicos / fatAcumulado) * 100 : 0)})</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'tributos' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>DAS (R$)</th>
                    <th>COFINS (R$)</th>
                    <th>ICMS (R$)</th>
                    <th>FUST (R$)</th>
                    <th>FUNCEP (R$)</th>
                    <th>FUNTTEL (R$)</th>
                    <th>IRPJ (R$)</th>
                    <th>CSLL (R$)</th>
                    <th>PIS (R$)</th>
                    <th>Total (R$)</th>
                    <th>Aliq. Efetiva %</th>
                    <th>Var. Absoluta (R$)</th>
                    <th>Var. %</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => {
                    const total = r.pis + r.cofins + r.icms + r.irpj + r.csll;
                    const fat = r.saidas + r.servicos + r.outros;
                    const aliq = fat ? (total / fat) * 100 : 0;
                    const prevTotal = i > 0
                      ? registros[i - 1].pis + registros[i - 1].cofins + registros[i - 1].icms + registros[i - 1].irpj + registros[i - 1].csll
                      : 0;
                    const { abs, perc } = variacao(total, prevTotal);
                    return (
                      <tr key={r.competencia}>
                        <td className="text-center">{formatCompetencia(r.competencia)}</td>
                        <td>R$ 0,00 <span className="text-muted">(N/D)</span></td>
                        <td>{nf(r.cofins)}</td>
                        <td>{nf(r.icms)}</td>
                        <td>R$ 0,00 <span className="text-muted">(N/D)</span></td>
                        <td>R$ 0,00 <span className="text-muted">(N/D)</span></td>
                        <td>R$ 0,00 <span className="text-muted">(N/D)</span></td>
                        <td>{nf(r.irpj)}</td>
                        <td>{nf(r.csll)}</td>
                        <td>{nf(r.pis)}</td>
                        <td><strong>{nf(total)}</strong></td>
                        <td className="text-center"><strong>{pf(aliq)}</strong></td>
                        <td className={abs > 0 ? 'highlight-positive' : abs < 0 ? 'highlight-negative' : ''}>
                          {i === 0 ? '—' : `${abs >= 0 ? '+' : ''}${nf(abs)}`}
                        </td>
                        <td className={perc > 0 ? 'highlight-positive' : perc < 0 ? 'highlight-negative' : ''}>
                          {i === 0 ? '—' : `${perc >= 0 ? '+' : ''}${perc.toFixed(2)}%`}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="row-total">
                    <td>TOTAL</td>
                    <td colSpan={9}>—</td>
                    <td><strong>{nf(totalTributos)}</strong></td>
                    <td className="text-center"><strong>{pf(aliqEfetivaGeral)}</strong></td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'folha' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Total de Proventos (R$)</th>
                    <th>Nº Funcionários</th>
                    <th>Var. Absoluta (R$)</th>
                    <th>Var. %</th>
                  </tr>
                </thead>
                <tbody>
                  {folhaAtual.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">Nenhum dado de folha. Use o botão abaixo.</td>
                    </tr>
                  ) : (
                    folhaAtual.map((f, i) => {
                      const prev = i > 0 ? folhaAtual[i - 1].proventos : 0;
                      const { abs, perc } = variacao(f.proventos, prev);
                      return (
                        <tr key={f.competencia}>
                          <td className="text-center">{formatCompetencia(f.competencia)}</td>
                          <td>{nf(f.proventos)}</td>
                          <td className="text-center">{f.numFunc}</td>
                          <td className={abs > 0 ? 'highlight-positive' : abs < 0 ? 'highlight-negative' : ''}>
                            {i === 0 ? '—' : `${abs >= 0 ? '+' : ''}${nf(abs)}`}
                          </td>
                          <td className={perc > 0 ? 'highlight-positive' : perc < 0 ? 'highlight-negative' : ''}>
                            {i === 0 ? '—' : `${perc >= 0 ? '+' : ''}${perc.toFixed(2)}%`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {folhaAtual.length > 0 && (
                    <tr className="row-total">
                      <td>TOTAL</td>
                      <td>{nf(totalProventosFolha)}</td>
                      <td className="text-center">{folhaAtual.reduce((s, f) => s + f.numFunc, 0)} (soma)</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <button className="btn btn-sm btn-outline" style={{ marginTop: 8 }} onClick={addFolhaRow}>➕ Adicionar Linha de Folha</button>
              <p className="text-muted text-small">Dados temporários, não salvos.</p>
            </div>
          )}

          {activeTab === 'trimestres' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Faturamento Total (R$)</th>
                    <th>SVA Total (R$)</th>
                    <th>Livros Total (R$)</th>
                    <th>SCM Total (R$)</th>
                    <th>Serviço Total (R$)</th>
                    <th>Tributos Totais (R$)</th>
                    <th>Aliq. Efetiva Média %</th>
                    <th>Proventos Total (R$)</th>
                    <th>Média Funcionários</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const trimestres = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];
                    const rows: JSX.Element[] = [];
                    let grandFat = 0, grandSVA = 0, grandLiv = 0, grandSCM = 0, grandServ = 0, grandTrib = 0, grandProv = 0, sumFunc = 0, trimCount = 0;
                    trimestres.forEach(tri => {
                      const regsTri = registros.filter(r => getTrimestre(r.competencia) === tri);
                      const folhaTri = folhaAtual.filter(f => getTrimestre(f.competencia) === tri);
                      if (regsTri.length === 0 && folhaTri.length === 0) return;
                      const fat = regsTri.reduce((s, r) => s + r.saidas + r.servicos + r.outros, 0);
                      const sva = regsTri.reduce((s, r) => s + r.sva, 0);
                      const liv = regsTri.reduce((s, r) => s + r.livros, 0);
                      const scm = regsTri.reduce((s, r) => s + r.scm, 0);
                      const serv = regsTri.reduce((s, r) => s + r.servicos, 0);
                      const trib = regsTri.reduce((s, r) => s + r.pis + r.cofins + r.icms + r.irpj + r.csll, 0);
                      const prov = folhaTri.reduce((s, f) => s + f.proventos, 0);
                      const funcs = folhaTri.map(f => f.numFunc);
                      const mediaFunc = funcs.length > 0 ? Math.round(funcs.reduce((a, b) => a + b, 0) / funcs.length) : 0;
                      const aliq = fat ? (trib / fat) * 100 : 0;
                      rows.push(
                        <tr key={tri} className="row-subtotal">
                          <td className="text-center"><strong>{tri}</strong></td>
                          <td>{nf(fat)}</td>
                          <td>{nf(sva)}</td>
                          <td>{nf(liv)}</td>
                          <td>{nf(scm)}</td>
                          <td>{nf(serv)}</td>
                          <td>{nf(trib)}</td>
                          <td className="text-center">{pf(aliq)}</td>
                          <td>{nf(prov)}</td>
                          <td className="text-center">{mediaFunc}</td>
                        </tr>
                      );
                      grandFat += fat; grandSVA += sva; grandLiv += liv; grandSCM += scm; grandServ += serv;
                      grandTrib += trib; grandProv += prov; sumFunc += funcs.reduce((a, b) => a + b, 0); trimCount += funcs.length;
                    });
                    const grandAliq = grandFat ? (grandTrib / grandFat) * 100 : 0;
                    const grandMediaFunc = trimCount > 0 ? Math.round(sumFunc / trimCount) : 0;
                    rows.push(
                      <tr key="total" className="row-total">
                        <td className="text-center"><strong>TOTAL ANUAL</strong></td>
                        <td>{nf(grandFat)}</td>
                        <td>{nf(grandSVA)}</td>
                        <td>{nf(grandLiv)}</td>
                        <td>{nf(grandSCM)}</td>
                        <td>{nf(grandServ)}</td>
                        <td>{nf(grandTrib)}</td>
                        <td className="text-center">{pf(grandAliq)}</td>
                        <td>{nf(grandProv)}</td>
                        <td className="text-center">{grandMediaFunc}</td>
                      </tr>
                    );
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          )}

          <div className="charts-grid">
            <div className="chart-card">
              <h3>📊 Composição do Faturamento</h3>
              {doughnutData.labels.length > 0 && <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } } }} />}
            </div>
            <div className="chart-card">
              <h3>📈 Faturamento Mensal</h3>
              {barFatData.labels.length > 0 && <Bar data={barFatData} options={{ responsive: true, scales: { y: { ticks: { callback: (v: string | number) => typeof v === 'number' ? nf(v) : v } } } }} />}
            </div>
            <div className="chart-card">
              <h3>🏛️ Tributos por Tipo (Acumulado)</h3>
              {barTribData.labels.length > 0 && <Bar data={barTribData} options={{ responsive: true, scales: { y: { ticks: { callback: (v: string | number) => typeof v === 'number' ? nf(v) : v } } } }} />}
            </div>
            <div className="chart-card">
              <h3>📉 Evolução Tributária Mensal</h3>
              {lineTribData.labels.length > 0 && <Line data={lineTribData} options={{ responsive: true, scales: { y: { ticks: { callback: (v: string | number) => typeof v === 'number' ? nf(v) : v } } } }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
