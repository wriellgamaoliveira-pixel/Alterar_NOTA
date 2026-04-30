import React, { useState, useMemo, useCallback } from 'react';
import  UploadDropzone from '@/components/shared/UploadDropzone';
import  KpiCard  from '@/components/shared/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  parseAPURACAOhtm,
  agruparPorEmpresa,
  DadosEmpresa,
  ApuracaoRegistro,
} from '@/parsers/apuracaoHtmlParser';

// ---------- UTILITÁRIOS ----------
const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPercent = (value: number) => value.toFixed(1) + '%';

const getTrimestre = (comp: string) => {
  const [m] = comp.split('/').map(Number);
  if (m <= 3) return '1º Trimestre';
  if (m <= 6) return '2º Trimestre';
  if (m <= 9) return '3º Trimestre';
  return '4º Trimestre';
};

const labelMonth = (comp: string) => {
  const [mes, ano] = comp.split('/');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return meses[parseInt(mes) - 1] + '/' + ano;
};

// ---------- COMPONENTE PRINCIPAL ----------
const DashboardApuracao: React.FC = () => {
  const [empresas, setEmpresas] = useState<Record<string, DadosEmpresa>>({});
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [folhaExtra, setFolhaExtra] = useState<Record<string, { competencia: string; proventos: number; numFunc: number }[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('receitas');

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const registros = parseAPURACAOhtm(text);
      const grouped = agruparPorEmpresa(registros);
      setEmpresas(grouped);
      const firstCode = Object.keys(grouped)[0];
      setSelectedCompany(firstCode || null);
      if (!firstCode) setError('Nenhuma empresa encontrada no arquivo.');
    } catch (err: any) {
      setError(err.message);
      setEmpresas({});
      setSelectedCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const company: DadosEmpresa | undefined = selectedCompany ? empresas[selectedCompany] : undefined;
  const registros = company?.registros || [];

  // Dados agregados
  const metrics = useMemo(() => {
    if (!company) return null;
    let fatTotal = 0, svaTotal = 0, livrosTotal = 0, scmTotal = 0, servicosTotal = 0;
    let tribTotal = 0;
    registros.forEach(r => {
      const fat = r.saidas + r.servicos + r.outros;
      fatTotal += fat;
      svaTotal += r.sva;
      livrosTotal += r.livros;
      scmTotal += r.scm;
      servicosTotal += r.servicos;
      tribTotal += r.pis + r.cofins + r.icms + r.irpj + r.csll;
    });
    const aliqEfetiva = fatTotal > 0 ? (tribTotal / fatTotal) * 100 : 0;
    const folha = folhaExtra[selectedCompany || ''] || [];
    const totalProv = folha.reduce((s, f) => s + f.proventos, 0);
    const avgFunc = folha.length > 0 ? Math.round(folha.reduce((s, f) => s + f.numFunc, 0) / folha.length) : 0;

    return {
      fatTotal,
      svaTotal,
      livrosTotal,
      scmTotal,
      servicosTotal,
      tribTotal,
      aliqEfetiva,
      totalProv,
      avgFunc,
      ticketMedio: company.info.ticketMedio || null,
      totalClientes: company.info.totalClientes || null,
      liquidez: company.info.liquidez || null,
    };
  }, [company, registros, selectedCompany, folhaExtra]);

  // Tabelas derivadas
  const receitasRows = useMemo(() => {
    return registros.map((r, i, arr) => {
      const fat = r.saidas + r.servicos + r.outros;
      const prevFat = i > 0 ? arr[i - 1].saidas + arr[i - 1].servicos + arr[i - 1].outros : null;
      const varAbs = prevFat !== null ? fat - prevFat : 0;
      const varPerc = prevFat && prevFat > 0 ? (varAbs / prevFat) * 100 : 0;
      return {
        competencia: labelMonth(r.competencia),
        fat,
        sva: r.sva,
        svaPart: fat > 0 ? (r.sva / fat) * 100 : 0,
        livros: r.livros,
        livrosPart: fat > 0 ? (r.livros / fat) * 100 : 0,
        scm: r.scm,
        scmPart: fat > 0 ? (r.scm / fat) * 100 : 0,
        servicos: r.servicos,
        servPart: fat > 0 ? (r.servicos / fat) * 100 : 0,
        varAbs: i === 0 ? null : varAbs,
        varPerc: i === 0 ? null : varPerc,
      };
    });
  }, [registros]);

  const tributosRows = useMemo(() => {
    return registros.map((r, i, arr) => {
      const trib = r.pis + r.cofins + r.icms + r.irpj + r.csll;
      const fat = r.saidas + r.servicos + r.outros;
      const aliq = fat > 0 ? (trib / fat) * 100 : 0;
      const prevTrib = i > 0 ? arr[i - 1].pis + arr[i - 1].cofins + arr[i - 1].icms + arr[i - 1].irpj + arr[i - 1].csll : null;
      const varAbs = prevTrib !== null ? trib - prevTrib : 0;
      const varPerc = prevTrib && prevTrib > 0 ? (varAbs / prevTrib) * 100 : 0;
      return {
        competencia: labelMonth(r.competencia),
        pis: r.pis,
        cofins: r.cofins,
        icms: r.icms,
        irpj: r.irpj,
        csll: r.csll,
        total: trib,
        aliq,
        varAbs: i === 0 ? null : varAbs,
        varPerc: i === 0 ? null : varPerc,
      };
    });
  }, [registros]);

  const folhaRows = useMemo(() => {
    const folha = folhaExtra[selectedCompany || ''] || [];
    return folha.map((f, i, arr) => {
      const prev = i > 0 ? arr[i - 1].proventos : null;
      const varAbs = prev !== null ? f.proventos - prev : 0;
      const varPerc = prev && prev > 0 ? (varAbs / prev) * 100 : 0;
      return {
        competencia: labelMonth(f.competencia),
        proventos: f.proventos,
        numFunc: f.numFunc,
        varAbs: i === 0 ? null : varAbs,
        varPerc: i === 0 ? null : varPerc,
      };
    });
  }, [folhaExtra, selectedCompany]);

  const trimestresData = useMemo(() => {
    const tri: Record<string, ApuracaoRegistro[]> = {};
    registros.forEach(r => {
      const t = getTrimestre(r.competencia);
      if (!tri[t]) tri[t] = [];
      tri[t].push(r);
    });
    return Object.entries(tri).map(([nome, recs]) => {
      let fat = 0, sva = 0, liv = 0, scm = 0, serv = 0, trib = 0;
      recs.forEach(r => {
        fat += r.saidas + r.servicos + r.outros;
        sva += r.sva;
        liv += r.livros;
        scm += r.scm;
        serv += r.servicos;
        trib += r.pis + r.cofins + r.icms + r.irpj + r.csll;
      });
      const aliq = fat > 0 ? (trib / fat) * 100 : 0;
      const folhas = folhaExtra[selectedCompany || '']?.filter(f => getTrimestre(f.competencia) === nome) || [];
      const prov = folhas.reduce((s, f) => s + f.proventos, 0);
      const avgF = folhas.length > 0 ? Math.round(folhas.reduce((s, f) => s + f.numFunc, 0) / folhas.length) : 0;
      return { nome, fat, sva, livros: liv, scm, servicos: serv, tributos: trib, aliq, proventos: prov, avgFunc: avgF };
    });
  }, [registros, folhaExtra, selectedCompany]);

  const adicionarFolha = () => {
    if (!selectedCompany) return;
    const comp = prompt('Competência (ex: 03/2026):');
    if (!comp) return;
    const prov = parseFloat(prompt('Total de Proventos (R$):', '0')?.replace(',', '.') || '0');
    const func = parseInt(prompt('Nº de Funcionários:', '0') || '0');
    setFolhaExtra(prev => {
      const updated = { ...prev };
      const list = updated[selectedCompany] || [];
      const exists = list.find(f => f.competencia === comp);
      if (exists) {
        exists.proventos = prov;
        exists.numFunc = func;
      } else {
        list.push({ competencia: comp, proventos: prov, numFunc: func });
      }
      updated[selectedCompany] = list.sort((a, b) => {
        const [ma, aa] = a.competencia.split('/').map(Number);
        const [mb, ab] = b.competencia.split('/').map(Number);
        return aa !== ab ? aa - ab : ma - mb;
      });
      return updated;
    });
  };

  const pieData = metrics ? [
    { name: 'SVA', value: metrics.svaTotal },
    { name: 'Livros', value: metrics.livrosTotal },
    { name: 'SCM', value: metrics.scmTotal },
    { name: 'Serviços', value: metrics.servicosTotal },
  ] : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="p-6 space-y-6">
      <UploadDropzone
        onFileAccepted={handleFile}
        accept=".htm,.html"
        isLoading={loading}
        error={error}
      />

      {Object.keys(empresas).length > 0 && (
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <span className="font-semibold text-gray-700">🏢 Empresa:</span>
          <Select value={selectedCompany || ''} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[380px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(empresas).map(([cod, emp]) => (
                <SelectItem key={cod} value={cod}>{emp.info.nome_emp} (Cód. {cod})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">Regime: {company?.info.regime || 'N/D'}</Badge>
          <Badge variant="secondary">Estado: {company?.info.estado || 'N/D'}</Badge>
          <Badge variant="secondary">Sistema: {company?.info.sistema || 'N/D'}</Badge>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KpiCard title="Ticket Médio" value={metrics.ticketMedio ? `R$ ${formatCurrency(metrics.ticketMedio)}` : 'N/D'} />
          <KpiCard title="Total de Clientes" value={metrics.totalClientes?.toString() || 'N/D'} />
          <KpiCard title="Liquidez" value={metrics.liquidez?.toFixed(2) || 'N/D'} />
          <KpiCard title="Faturamento Acumulado" value={`R$ ${formatCurrency(metrics.fatTotal)}`} />
          <KpiCard title="Total Tributos" value={`R$ ${formatCurrency(metrics.tribTotal)}`} subtitle={`Alíq. efetiva ${formatPercent(metrics.aliqEfetiva)}`} />
          <KpiCard title="Média Funcionários" value={metrics.avgFunc > 0 ? metrics.avgFunc.toString() : 'N/D'} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-xl border p-4">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="receitas">📋 Receitas</TabsTrigger>
          <TabsTrigger value="tributos">🏛️ Tributos</TabsTrigger>
          <TabsTrigger value="folha">👥 Folha</TabsTrigger>
          <TabsTrigger value="trimestres">📅 Trimestres</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>SVA</TableHead><TableHead>SVA %</TableHead>
                <TableHead>Livros</TableHead><TableHead>Livros %</TableHead>
                <TableHead>SCM</TableHead><TableHead>SCM %</TableHead>
                <TableHead>Serviços</TableHead><TableHead>Serv. %</TableHead>
                <TableHead>Var. Abs.</TableHead><TableHead>Var. %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitasRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.competencia}</TableCell>
                  <TableCell>R$ {formatCurrency(row.fat)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.sva)}</TableCell>
                  <TableCell>{formatPercent(row.svaPart)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.livros)}</TableCell>
                  <TableCell>{formatPercent(row.livrosPart)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.scm)}</TableCell>
                  <TableCell>{formatPercent(row.scmPart)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.servicos)}</TableCell>
                  <TableCell>{formatPercent(row.servPart)}</TableCell>
                  <TableCell className={row.varAbs && row.varAbs > 0 ? 'text-green-600' : row.varAbs && row.varAbs < 0 ? 'text-red-500' : ''}>
                    {row.varAbs !== null ? `${row.varAbs >= 0 ? '+' : ''}R$ ${formatCurrency(row.varAbs)}` : '—'}
                  </TableCell>
                  <TableCell className={row.varPerc && row.varPerc > 0 ? 'text-green-600' : row.varPerc && row.varPerc < 0 ? 'text-red-500' : ''}>
                    {row.varPerc !== null ? `${row.varPerc >= 0 ? '+' : ''}${formatPercent(row.varPerc)}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="tributos">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>PIS</TableHead><TableHead>COFINS</TableHead><TableHead>ICMS</TableHead>
                <TableHead>IRPJ</TableHead><TableHead>CSLL</TableHead><TableHead>Total</TableHead>
                <TableHead>Alíq. Efet.</TableHead><TableHead>Var. Abs.</TableHead><TableHead>Var. %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tributosRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.competencia}</TableCell>
                  <TableCell>R$ {formatCurrency(row.pis)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.cofins)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.icms)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.irpj)}</TableCell>
                  <TableCell>R$ {formatCurrency(row.csll)}</TableCell>
                  <TableCell className="font-semibold">R$ {formatCurrency(row.total)}</TableCell>
                  <TableCell>{formatPercent(row.aliq)}</TableCell>
                  <TableCell className={row.varAbs && row.varAbs > 0 ? 'text-green-600' : row.varAbs && row.varAbs < 0 ? 'text-red-500' : ''}>
                    {row.varAbs !== null ? `${row.varAbs >= 0 ? '+' : ''}R$ ${formatCurrency(row.varAbs)}` : '—'}
                  </TableCell>
                  <TableCell className={row.varPerc && row.varPerc > 0 ? 'text-green-600' : row.varPerc && row.varPerc < 0 ? 'text-red-500' : ''}>
                    {row.varPerc !== null ? `${row.varPerc >= 0 ? '+' : ''}${formatPercent(row.varPerc)}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="folha">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead><TableHead>Total Proventos</TableHead><TableHead>Nº Func.</TableHead>
                <TableHead>Var. Abs.</TableHead><TableHead>Var. %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folhaRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.competencia}</TableCell>
                  <TableCell>R$ {formatCurrency(row.proventos)}</TableCell>
                  <TableCell>{row.numFunc}</TableCell>
                  <TableCell className={row.varAbs && row.varAbs > 0 ? 'text-green-600' : row.varAbs && row.varAbs < 0 ? 'text-red-500' : ''}>
                    {row.varAbs !== null ? `${row.varAbs >= 0 ? '+' : ''}R$ ${formatCurrency(row.varAbs)}` : '—'}
                  </TableCell>
                  <TableCell className={row.varPerc && row.varPerc > 0 ? 'text-green-600' : row.varPerc && row.varPerc < 0 ? 'text-red-500' : ''}>
                    {row.varPerc !== null ? `${row.varPerc >= 0 ? '+' : ''}${formatPercent(row.varPerc)}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <button onClick={adicionarFolha} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md">+ Adicionar Linha de Folha</button>
        </TabsContent>

        <TabsContent value="trimestres">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead><TableHead>Faturamento</TableHead><TableHead>SVA</TableHead>
                <TableHead>Livros</TableHead><TableHead>SCM</TableHead><TableHead>Serviços</TableHead>
                <TableHead>Tributos</TableHead><TableHead>Alíq. Efet.</TableHead>
                <TableHead>Proventos</TableHead><TableHead>Média Func.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trimestresData.map((tri, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{tri.nome}</TableCell>
                  <TableCell>R$ {formatCurrency(tri.fat)}</TableCell>
                  <TableCell>R$ {formatCurrency(tri.sva)}</TableCell>
                  <TableCell>R$ {formatCurrency(tri.livros)}</TableCell>
                  <TableCell>R$ {formatCurrency(tri.scm)}</TableCell>
                  <TableCell>R$ {formatCurrency(tri.servicos)}</TableCell>
                  <TableCell>R$ {formatCurrency(tri.tributos)}</TableCell>
                  <TableCell>{formatPercent(tri.aliq)}</TableCell>
                  <TableCell>R$ {formatCurrency(tri.proventos)}</TableCell>
                  <TableCell>{tri.avgFunc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader><CardTitle>Composição do Faturamento</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${formatCurrency(value)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Faturamento Mensal</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitasRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="competencia" />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `R$ ${formatCurrency(value)}`} />
                  <Bar dataKey="fat" fill="#3b82f6" radius={[4,4,0,0]} name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardApuracao;
