import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import KpiCard from '@/components/shared/KpiCard';
import UploadDropzone from '@/components/shared/UploadDropzone';
import {
  parseApuracaoHtml,
  type AgrupamentoEmpresa,
} from '@/parsers/apuracaoHtmlParser';
import {
  formatCurrency,
  parseCurrency,
  formatPercent,
  getTrimestre,
  formatCompetencia,
} from '@/lib/utils';
import {
  TrendingUp,
  DollarSign,
  Users,
  PieChartIcon,
  BarChart3,
  FileSpreadsheet,
  Building2,
  Calculator,
  Upload,
  FileText,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const DashboardApuracao: React.FC = () => {
  const [empresas, setEmpresas] = useState<Record<string, AgrupamentoEmpresa>>({});
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('receitas');

  const handleFileProcess = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const dados = parseApuracaoHtml(text);
      setEmpresas(dados);
      const codigos = Object.keys(dados);
      if (codigos.length > 0) {
        setEmpresaSelecionada(codigos[0]);
      }
      setFileName(file.name);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const empresaAtual = useMemo(() => {
    if (!empresaSelecionada || !empresas[empresaSelecionada]) return null;
    return empresas[empresaSelecionada];
  }, [empresaSelecionada, empresas]);

  const registrosOrdenados = useMemo(() => {
    if (!empresaAtual) return [];
    return [...empresaAtual.registros].sort((a, b) => {
      const [ma, aa] = a.competencia.split('/').map(Number);
      const [mb, ab] = b.competencia.split('/').map(Number);
      return aa !== ab ? aa - ab : ma - mb;
    });
  }, [empresaAtual]);

  const indicadores = useMemo(() => {
    if (!empresaAtual) return null;
    const { info, registros } = empresaAtual;

    const faturamentoTotal = registros.reduce(
      (sum, r) => sum + parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros),
      0,
    );
    const tributosTotal = registros.reduce(
      (sum, r) =>
        sum +
        parseCurrency(r.pis) +
        parseCurrency(r.cofins) +
        parseCurrency(r.icms) +
        parseCurrency(r.irpj) +
        parseCurrency(r.csll),
      0,
    );
    const totalSVA = registros.reduce((sum, r) => sum + parseCurrency(r.sva), 0);
    const totalLivros = registros.reduce((sum, r) => sum + parseCurrency(r.livros), 0);
    const totalSCM = registros.reduce((sum, r) => sum + parseCurrency(r.scm), 0);
    const totalServicos = registros.reduce((sum, r) => sum + parseCurrency(r.servicos), 0);

    const ticketMedio = info.totalClientes && info.totalClientes > 0 ? faturamentoTotal / info.totalClientes : 0;
    const aliquotaEfetiva = faturamentoTotal > 0 ? (tributosTotal / faturamentoTotal) * 100 : 0;

    return {
      faturamentoTotal,
      tributosTotal,
      totalSVA,
      totalLivros,
      totalSCM,
      totalServicos,
      ticketMedio,
      aliquotaEfetiva,
      totalClientes: info.totalClientes || 0,
      liquidez: info.liquidez || 0,
    };
  }, [empresaAtual]);

  const graficoComposicao = useMemo(() => {
    if (!indicadores) return [];
    return [
      { name: 'SVA', value: indicadores.totalSVA },
      { name: 'Livros', value: indicadores.totalLivros },
      { name: 'SCM', value: indicadores.totalSCM },
      { name: 'Serviços', value: indicadores.totalServicos },
    ];
  }, [indicadores]);

  const graficoFaturamento = useMemo(() => {
    return registrosOrdenados.map(r => ({
      mes: formatCompetencia(r.competencia),
      faturamento: parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros),
      sva: parseCurrency(r.sva),
      scm: parseCurrency(r.scm),
    }));
  }, [registrosOrdenados]);

  const graficoTributos = useMemo(() => {
    return registrosOrdenados.map(r => ({
      mes: formatCompetencia(r.competencia),
      total:
        parseCurrency(r.pis) +
        parseCurrency(r.cofins) +
        parseCurrency(r.icms) +
        parseCurrency(r.irpj) +
        parseCurrency(r.csll),
      icms: parseCurrency(r.icms),
      cofins: parseCurrency(r.cofins),
    }));
  }, [registrosOrdenados]);


  const folhaAtual = useMemo(() => {
    if (!empresaAtual) return [];
    return [...empresaAtual.folha].sort((a, b) => {
      const [ma, aa] = a.competencia.split('/').map(Number);
      const [mb, ab] = b.competencia.split('/').map(Number);
      return aa !== ab ? aa - ab : ma - mb;
    });
  }, [empresaAtual]);

  // Estado vazio – tela de upload
  if (Object.keys(empresas).length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
        <div className="text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-[#38bdf8]" />
          <h1 className="mt-4 text-2xl font-bold text-[#f1f5f9]">Dashboard de Apuração</h1>
          <p className="mt-2 text-sm text-[#94a3b8]">
            Análise financeira e tributária a partir do arquivo{' '}
            <strong className="text-[#f1f5f9]">APURACAO.htm</strong>
          </p>
        </div>
        <UploadDropzone
          onFilesSelected={(files) => {
            if (files.length > 0) {
              handleFileProcess(files[0]);
            }
          }}
          accept=".htm,.html"
          label="Carregar arquivo APURACAO.htm"
          sublabel="Arraste e solte o arquivo ou clique para selecionar"
        />
        {loading && (
          <div className="mt-4 space-y-2 text-center text-sm text-[#94a3b8]">
            <p>Processando {fileName}...</p>
            <div className="mx-auto h-1 w-64 overflow-hidden rounded-full bg-[#334155]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#38bdf8]" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-[#334155] bg-[#1e293b] p-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-[#38bdf8]" />
          <div>
            <h1 className="text-xl font-bold text-[#f1f5f9]">Dashboard de Apuração</h1>
            <p className="text-xs text-[#94a3b8]">
              {fileName} • {Object.keys(empresas).length} empresa(s)
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmpresas({})}
            className="border-[#334155] bg-transparent text-[#cbd5e1] hover:bg-[#334155]"
          >
            <Upload className="mr-2 h-4 w-4" />
            Novo arquivo
          </Button>
          <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
            <SelectTrigger className="w-[320px] border-[#334155] bg-[#0f172a] text-[#f1f5f9]">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent className="border-[#334155] bg-[#1e293b] text-[#f1f5f9]">
              {Object.entries(empresas).map(([cod, emp]) => (
                <SelectItem key={cod} value={cod}>
                  {emp.info.nome_emp} (Cód. {cod})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Badges */}
      {empresaAtual && (
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-[#1e293b] text-[#cbd5e1] border-[#334155]">
            <Building2 className="mr-1 h-3 w-3" />
            Regime: {empresaAtual.info.regime || 'N/D'}
          </Badge>
          <Badge className="bg-[#1e293b] text-[#cbd5e1] border-[#334155]">
            Estado: {empresaAtual.info.estado || 'N/D'}
          </Badge>
          <Badge className="bg-[#1e293b] text-[#cbd5e1] border-[#334155]">
            Sistema: {empresaAtual.info.sistema || 'N/D'}
          </Badge>
        </div>
      )}

      {/* KPIs */}
      {indicadores && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            icon={DollarSign}
            label="Ticket Médio"
            value={formatCurrency(indicadores.ticketMedio)}
            color="#38bdf8"
          />
          <KpiCard
            icon={Users}
            label="Total Clientes"
            value={indicadores.totalClientes}
            color="#10b981"
          />
          <KpiCard
            icon={TrendingUp}
            label="Liquidez"
            value={indicadores.liquidez.toFixed(2)}
            color="#f59e0b"
          />
          <KpiCard
            icon={BarChart3}
            label="Faturamento Acum."
            value={formatCurrency(indicadores.faturamentoTotal)}
            color="#3b82f6"
          />
          <KpiCard
            icon={Calculator}
            label="Total Tributos"
            value={formatCurrency(indicadores.tributosTotal)}
            color="#ef4444"
          />
          <KpiCard
            icon={Users}
            label="Func. (média)"
            value={
              folhaAtual.length > 0
                ? Math.round(folhaAtual.reduce((s, f) => s + f.numFunc, 0) / folhaAtual.length)
                : 'N/D'
            }
            color="#8b5cf6"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#1e293b] border border-[#334155] rounded-lg p-1">
          <TabsTrigger
            value="receitas"
            className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
          >
            📋 Receitas
          </TabsTrigger>
          <TabsTrigger
            value="tributos"
            className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
          >
            🏛️ Tributos
          </TabsTrigger>
          <TabsTrigger
            value="folha"
            className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
          >
            👥 Folha
          </TabsTrigger>
          <TabsTrigger
            value="trimestres"
            className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
          >
            📅 Trimestres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="mt-4">
          <Card className="border-[#334155] bg-[#1e293b]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#f1f5f9]">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Receitas Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#334155] bg-[#0f172a]">
                      <TableHead className="text-[#f1f5f9]">Mês</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Faturamento</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">SVA</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">SVA %</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Livros</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Livros %</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">SCM</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">SCM %</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Serviço</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Serviço %</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Var. Abs.</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Var. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosOrdenados.map((r, i) => {
                      const fat = parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros);
                      const prevFat =
                        i > 0
                          ? parseCurrency(registrosOrdenados[i - 1].saidas) +
                            parseCurrency(registrosOrdenados[i - 1].servicos) +
                            parseCurrency(registrosOrdenados[i - 1].outros)
                          : null;
                      const varAbs = prevFat ? fat - prevFat : 0;
                      const varPerc = prevFat && prevFat > 0 ? (varAbs / prevFat) * 100 : 0;
                      const svaPart = fat > 0 ? (parseCurrency(r.sva) / fat) * 100 : 0;
                      const livPart = fat > 0 ? (parseCurrency(r.livros) / fat) * 100 : 0;
                      const scmPart = fat > 0 ? (parseCurrency(r.scm) / fat) * 100 : 0;
                      const servPart = fat > 0 ? (parseCurrency(r.servicos) / fat) * 100 : 0;

                      return (
                        <TableRow key={r.competencia} className="border-b border-[#334155] hover:bg-[#0f172a]">
                          <TableCell className="text-[#f1f5f9] font-medium">
                            {formatCompetencia(r.competencia)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9] font-semibold">
                            {formatCurrency(fat)}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.sva))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatPercent(svaPart)}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.livros))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatPercent(livPart)}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.scm))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatPercent(scmPart)}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.servicos))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatPercent(servPart)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              varAbs >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {i === 0 ? '—' : (varAbs >= 0 ? '+' : '') + formatCurrency(varAbs)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              varPerc >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {i === 0 ? '—' : (varPerc >= 0 ? '+' : '') + formatPercent(varPerc)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {indicadores && (
                      <TableRow className="border-b border-[#334155] bg-[#0f172a] font-bold">
                        <TableCell className="text-[#f1f5f9]">TOTAL</TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatCurrency(indicadores.faturamentoTotal)}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatCurrency(indicadores.totalSVA)}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatPercent(
                            indicadores.faturamentoTotal > 0
                              ? (indicadores.totalSVA / indicadores.faturamentoTotal) * 100
                              : 0,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatCurrency(indicadores.totalLivros)}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatPercent(
                            indicadores.faturamentoTotal > 0
                              ? (indicadores.totalLivros / indicadores.faturamentoTotal) * 100
                              : 0,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatCurrency(indicadores.totalSCM)}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatPercent(
                            indicadores.faturamentoTotal > 0
                              ? (indicadores.totalSCM / indicadores.faturamentoTotal) * 100
                              : 0,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatCurrency(indicadores.totalServicos)}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatPercent(
                            indicadores.faturamentoTotal > 0
                              ? (indicadores.totalServicos / indicadores.faturamentoTotal) * 100
                              : 0,
                          )}
                        </TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">—</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tributos" className="mt-4">
          <Card className="border-[#334155] bg-[#1e293b]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#f1f5f9]">
                <Calculator className="h-5 w-5 text-red-400" />
                Tributos Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#334155] bg-[#0f172a]">
                      <TableHead className="text-[#f1f5f9]">Mês</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">PIS</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">COFINS</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">ICMS</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">IRPJ</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">CSLL</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Total</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Aliq. Efetiva</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Var. Abs.</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Var. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosOrdenados.map((r, i) => {
                      const total =
                        parseCurrency(r.pis) +
                        parseCurrency(r.cofins) +
                        parseCurrency(r.icms) +
                        parseCurrency(r.irpj) +
                        parseCurrency(r.csll);
                      const fat = parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros);
                      const aliq = fat > 0 ? (total / fat) * 100 : 0;
                      const prevTotal =
                        i > 0
                          ? parseCurrency(registrosOrdenados[i - 1].pis) +
                            parseCurrency(registrosOrdenados[i - 1].cofins) +
                            parseCurrency(registrosOrdenados[i - 1].icms) +
                            parseCurrency(registrosOrdenados[i - 1].irpj) +
                            parseCurrency(registrosOrdenados[i - 1].csll)
                          : null;
                      const varAbs = prevTotal ? total - prevTotal : 0;
                      const varPerc = prevTotal && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

                      return (
                        <TableRow key={r.competencia} className="border-b border-[#334155] hover:bg-[#0f172a]">
                          <TableCell className="text-[#f1f5f9] font-medium">
                            {formatCompetencia(r.competencia)}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.pis))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.cofins))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.icms))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.irpj))}
                          </TableCell>
                          <TableCell className="text-right text-[#94a3b8]">
                            {formatCurrency(parseCurrency(r.csll))}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9] font-semibold">
                            {formatCurrency(total)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">{formatPercent(aliq)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              varAbs >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {i === 0 ? '—' : (varAbs >= 0 ? '+' : '') + formatCurrency(varAbs)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              varPerc >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {i === 0 ? '—' : (varPerc >= 0 ? '+' : '') + formatPercent(varPerc)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folha" className="mt-4">
          <Card className="border-[#334155] bg-[#1e293b]">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2 text-[#f1f5f9]">
                  <Users className="h-5 w-5 text-green-400" />
                  Folha de Pagamento
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {folhaAtual.length === 0 ? (
                <p className="text-sm text-[#94a3b8]">Nenhum dado de folha encontrado no arquivo APURACAO.htm.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#334155] bg-[#0f172a]">
                        <TableHead className="text-[#f1f5f9]">Mês</TableHead>
                        <TableHead className="text-right text-[#f1f5f9]">Total de Proventos</TableHead>
                        <TableHead className="text-right text-[#f1f5f9]">Nº Funcionários</TableHead>
                        <TableHead className="text-right text-[#f1f5f9]">Var. Absoluta</TableHead>
                        <TableHead className="text-right text-[#f1f5f9]">Var. %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {folhaAtual.map((f, i) => {
                        const proventos = parseCurrency(f.proventos);
                        const prevProventos = i > 0 ? parseCurrency(folhaAtual[i - 1].proventos) : null;
                        const varAbs = prevProventos ? proventos - prevProventos : 0;
                        const varPerc =
                          prevProventos && prevProventos > 0 ? (varAbs / prevProventos) * 100 : 0;
                        return (
                          <TableRow key={f.competencia} className="border-b border-[#334155] hover:bg-[#0f172a]">
                            <TableCell className="text-[#f1f5f9] font-medium">
                              {formatCompetencia(f.competencia)}
                            </TableCell>
                            <TableCell className="text-right text-[#94a3b8]">
                              {formatCurrency(parseCurrency(f.proventos))}
                            </TableCell>
                            <TableCell className="text-right text-[#94a3b8]">{f.numFunc}</TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                varAbs >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {i === 0 ? '—' : (varAbs >= 0 ? '+' : '') + formatCurrency(varAbs)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                varPerc >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {i === 0 ? '—' : (varPerc >= 0 ? '+' : '') + formatPercent(varPerc)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-bold bg-[#0f172a]">
                        <TableCell className="text-[#f1f5f9]">TOTAL</TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {formatCurrency(folhaAtual.reduce((s, f) => s + parseCurrency(f.proventos), 0))}
                        </TableCell>
                        <TableCell className="text-right text-[#f1f5f9]">
                          {folhaAtual.reduce((s, f) => s + f.numFunc, 0)} (soma)
                        </TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">—</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trimestres" className="mt-4">
          <Card className="border-[#334155] bg-[#1e293b]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#f1f5f9]">
                <PieChartIcon className="h-5 w-5 text-purple-400" />
                Totais Trimestrais e Anual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#334155] bg-[#0f172a]">
                      <TableHead className="text-[#f1f5f9]">Período</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Faturamento</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">SVA</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Livros</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">SCM</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Serviços</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Tributos</TableHead>
                      <TableHead className="text-right text-[#f1f5f9]">Aliq. Efetiva</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'].map(tri => {
                      const regsTrim = registrosOrdenados.filter(
                        r => getTrimestre(r.competencia) === tri,
                      );
                      if (regsTrim.length === 0) return null;
                      const fat = regsTrim.reduce(
                        (s, r) =>
                          s + parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros),
                        0,
                      );
                      const sva = regsTrim.reduce((s, r) => s + parseCurrency(r.sva), 0);
                      const liv = regsTrim.reduce((s, r) => s + parseCurrency(r.livros), 0);
                      const scm = regsTrim.reduce((s, r) => s + parseCurrency(r.scm), 0);
                      const serv = regsTrim.reduce((s, r) => s + parseCurrency(r.servicos), 0);
                      const trib = regsTrim.reduce(
                        (s, r) =>
                          s +
                          parseCurrency(r.pis) +
                          parseCurrency(r.cofins) +
                          parseCurrency(r.icms) +
                          parseCurrency(r.irpj) +
                          parseCurrency(r.csll),
                        0,
                      );
                      const aliq = fat > 0 ? (trib / fat) * 100 : 0;
                      return (
                        <TableRow key={tri} className="border-b border-[#334155] hover:bg-[#0f172a] font-medium">
                          <TableCell className="text-[#f1f5f9]">{tri}</TableCell>
                          <TableCell className="text-right text-[#94a3b8]">{formatCurrency(fat)}</TableCell>
                          <TableCell className="text-right text-[#94a3b8]">{formatCurrency(sva)}</TableCell>
                          <TableCell className="text-right text-[#94a3b8]">{formatCurrency(liv)}</TableCell>
                          <TableCell className="text-right text-[#94a3b8]">{formatCurrency(scm)}</TableCell>
                          <TableCell className="text-right text-[#94a3b8]">{formatCurrency(serv)}</TableCell>
                          <TableCell className="text-right text-[#94a3b8]">{formatCurrency(trib)}</TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">{formatPercent(aliq)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(() => {
                      const fatTotal = registrosOrdenados.reduce(
                        (s, r) =>
                          s + parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros),
                        0,
                      );
                      const svaTotal = registrosOrdenados.reduce(
                        (s, r) => s + parseCurrency(r.sva),
                        0,
                      );
                      const livTotal = registrosOrdenados.reduce(
                        (s, r) => s + parseCurrency(r.livros),
                        0,
                      );
                      const scmTotal = registrosOrdenados.reduce(
                        (s, r) => s + parseCurrency(r.scm),
                        0,
                      );
                      const servTotal = registrosOrdenados.reduce(
                        (s, r) => s + parseCurrency(r.servicos),
                        0,
                      );
                      const tribTotal = registrosOrdenados.reduce(
                        (s, r) =>
                          s +
                          parseCurrency(r.pis) +
                          parseCurrency(r.cofins) +
                          parseCurrency(r.icms) +
                          parseCurrency(r.irpj) +
                          parseCurrency(r.csll),
                        0,
                      );
                      const aliqTotal = fatTotal > 0 ? (tribTotal / fatTotal) * 100 : 0;
                      return (
                        <TableRow className="bg-[#0f172a] font-bold text-base">
                          <TableCell className="text-[#f1f5f9]">TOTAL ANUAL</TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">
                            {formatCurrency(fatTotal)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">
                            {formatCurrency(svaTotal)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">
                            {formatCurrency(livTotal)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">
                            {formatCurrency(scmTotal)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">
                            {formatCurrency(servTotal)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">
                            {formatCurrency(tribTotal)}
                          </TableCell>
                          <TableCell className="text-right text-[#f1f5f9]">
                            {formatPercent(aliqTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#334155] bg-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-lg text-[#f1f5f9]">Composição do Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={graficoComposicao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {graficoComposicao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#334155] bg-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-lg text-[#f1f5f9]">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={graficoFaturamento}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Bar dataKey="faturamento" fill="#3b82f6" name="Faturamento" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sva" fill="#10b981" name="SVA" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scm" fill="#f59e0b" name="SCM" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-[#334155] bg-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-lg text-[#f1f5f9]">Evolução dos Tributos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={graficoTributos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ef4444"
                  name="Total Tributos"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="icms"
                  stroke="#8b5cf6"
                  name="ICMS"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cofins"
                  stroke="#ec4899"
                  name="COFINS"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardApuracao;
