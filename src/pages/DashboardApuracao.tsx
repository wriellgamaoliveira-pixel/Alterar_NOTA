import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { UploadDropzone } from '@/components/shared/UploadDropzone';
import { KpiCard } from '@/components/shared/KpiCard';
import { parseApuracaoHtml, AgrupamentoEmpresa, RegistroApuracao } from '@/parsers/apuracaoHtmlParser';
import { formatCurrency, parseCurrency, formatPercent, getTrimestre, formatCompetencia } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Users, PieChartIcon, BarChart3, FileSpreadsheet, Building2, Calculator, Upload, FileText } from 'lucide-react';

// Tipos locais para folha de pagamento
interface FolhaPagamento {
  competencia: string;
  proventos: number;
  numFunc: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const DashboardApuracao: React.FC = () => {
  const [empresas, setEmpresas] = useState<Record<string, AgrupamentoEmpresa>>({});
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [folhaExtra, setFolhaExtra] = useState<Record<string, FolhaPagamento[]>>({});
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('receitas');

  // Processar arquivo
  const handleFileProcess = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const dados = parseApuracaoHtml(text);
      setEmpresas(dados);
      const codigos = Object.keys(dados);
      if (codigos.length > 0) {
        setEmpresaSelecionada(codigos[0]);
        // Inicializar folha extra se necessário
        const novaFolha: Record<string, FolhaPagamento[]> = {};
        codigos.forEach(cod => {
          novaFolha[cod] = [];
        });
        setFolhaExtra(novaFolha);
      }
      setFileName(file.name);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dados da empresa selecionada
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

  // Cálculos para indicadores
  const indicadores = useMemo(() => {
    if (!empresaAtual) return null;
    const { info, registros } = empresaAtual;
    
    const faturamentoTotal = registros.reduce((sum, r) => 
      sum + parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros), 0);
    
    const tributosTotal = registros.reduce((sum, r) => 
      sum + parseCurrency(r.pis) + parseCurrency(r.cofins) + parseCurrency(r.icms) + 
      parseCurrency(r.irpj) + parseCurrency(r.csll), 0);
    
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

  // Dados para gráficos
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
      total: parseCurrency(r.pis) + parseCurrency(r.cofins) + parseCurrency(r.icms) + 
             parseCurrency(r.irpj) + parseCurrency(r.csll),
      icms: parseCurrency(r.icms),
      cofins: parseCurrency(r.cofins),
    }));
  }, [registrosOrdenados]);

  // Adicionar folha de pagamento manualmente
  const handleAddFolha = () => {
    if (!empresaSelecionada) return;
    const comp = prompt('Competência (MM/AAAA):');
    if (!comp) return;
    const prov = prompt('Total de Proventos (R$):');
    if (!prov) return;
    const func = prompt('Nº de Funcionários:');
    if (!func) return;
    
    setFolhaExtra(prev => {
      const atual = [...(prev[empresaSelecionada] || [])];
      const existente = atual.findIndex(f => f.competencia === comp);
      const novo = { 
        competencia: comp, 
        proventos: parseCurrency(prov), 
        numFunc: parseInt(func) || 0 
      };
      if (existente >= 0) {
        atual[existente] = novo;
      } else {
        atual.push(novo);
      }
      return { ...prev, [empresaSelecionada]: atual };
    });
  };

  const folhaAtual = useMemo(() => {
    return (folhaExtra[empresaSelecionada] || []).sort((a, b) => {
      const [ma, aa] = a.competencia.split('/').map(Number);
      const [mb, ab] = b.competencia.split('/').map(Number);
      return aa !== ab ? aa - ab : ma - mb;
    });
  }, [folhaExtra, empresaSelecionada]);

  // Estado vazio - upload inicial
  if (Object.keys(empresas).length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Apuração</h1>
            <p className="text-muted-foreground">Análise financeira e tributária de arquivos APURACAO.htm</p>
          </div>
        </div>
        
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="p-12">
            <UploadDropzone
              onFileProcess={handleFileProcess}
              accept=".htm,.html"
              label="Carregar arquivo APURACAO.htm"
              description="Arraste e solte o arquivo ou clique para selecionar"
            />
            {loading && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processando arquivo...</span>
                  <span>{fileName}</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instruções</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• O arquivo <strong>APURACAO.htm</strong> deve conter uma tabela com as colunas: codi_emp, nome_emp, saidas, servicos, outros, pis, cofins, icms, sva, livros, scm, irpj, csll, difal e COMPETENCIA.</p>
            <p>• Os dados são processados localmente no navegador.</p>
            <p>• Após o upload, você poderá visualizar gráficos, tabelas e exportar os dados.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Apuração</h1>
            <p className="text-muted-foreground text-sm">
              {fileName} • {Object.keys(empresas).length} empresa(s) encontrada(s)
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => setEmpresas({})}>
            <Upload className="h-4 w-4 mr-2" />
            Novo arquivo
          </Button>
          <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(empresas).map(([cod, emp]) => (
                <SelectItem key={cod} value={cod}>
                  {emp.info.nome_emp} (Cód. {cod})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Badges de informações */}
      {empresaAtual && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            Regime: {empresaAtual.info.regime || 'N/D'}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Estado: {empresaAtual.info.estado || 'N/D'}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Sistema: {empresaAtual.info.sistema || 'N/D'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            {fileName}
          </Badge>
        </div>
      )}

      {/* Cards de Indicadores */}
      {indicadores && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard 
            title="Ticket Médio" 
            value={formatCurrency(indicadores.ticketMedio)} 
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KpiCard 
            title="Total Clientes" 
            value={indicadores.totalClientes.toString()} 
            icon={<Users className="h-4 w-4" />}
          />
          <KpiCard 
            title="Liquidez" 
            value={indicadores.liquidez.toFixed(2)} 
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard 
            title="Faturamento Acum." 
            value={formatCurrency(indicadores.faturamentoTotal)} 
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <KpiCard 
            title="Total Tributos" 
            value={formatCurrency(indicadores.tributosTotal)} 
            icon={<Calculator className="h-4 w-4" />}
            subtitle={`Alíq. Efetiva: ${formatPercent(indicadores.aliquotaEfetiva)}`}
          />
          <KpiCard 
            title="Func. (média)" 
            value={folhaAtual.length > 0 ? Math.round(folhaAtual.reduce((s, f) => s + f.numFunc, 0) / folhaAtual.length).toString() : 'N/D'} 
            icon={<Users className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Tabs de tabelas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="receitas">📋 Receitas</TabsTrigger>
          <TabsTrigger value="tributos">🏛️ Tributos</TabsTrigger>
          <TabsTrigger value="folha">👥 Folha</TabsTrigger>
          <TabsTrigger value="trimestres">📅 Trimestres</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Receitas Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Mês</TableHead>
                      <TableHead className="font-semibold text-right">Faturamento</TableHead>
                      <TableHead className="font-semibold text-right">SVA</TableHead>
                      <TableHead className="font-semibold text-right">SVA %</TableHead>
                      <TableHead className="font-semibold text-right">Livros</TableHead>
                      <TableHead className="font-semibold text-right">Livros %</TableHead>
                      <TableHead className="font-semibold text-right">SCM</TableHead>
                      <TableHead className="font-semibold text-right">SCM %</TableHead>
                      <TableHead className="font-semibold text-right">Serviço</TableHead>
                      <TableHead className="font-semibold text-right">Serviço %</TableHead>
                      <TableHead className="font-semibold text-right">Var. Abs.</TableHead>
                      <TableHead className="font-semibold text-right">Var. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosOrdenados.map((r, i) => {
                      const fat = parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros);
                      const prevFat = i > 0 ? 
                        parseCurrency(registrosOrdenados[i-1].saidas) + parseCurrency(registrosOrdenados[i-1].servicos) + parseCurrency(registrosOrdenados[i-1].outros) : null;
                      const varAbs = prevFat ? fat - prevFat : 0;
                      const varPerc = prevFat && prevFat > 0 ? (varAbs / prevFat) * 100 : 0;
                      const svaPart = fat > 0 ? (parseCurrency(r.sva) / fat * 100) : 0;
                      const livPart = fat > 0 ? (parseCurrency(r.livros) / fat * 100) : 0;
                      const scmPart = fat > 0 ? (parseCurrency(r.scm) / fat * 100) : 0;
                      const servPart = fat > 0 ? (parseCurrency(r.servicos) / fat * 100) : 0;
                      
                      return (
                        <TableRow key={r.competencia} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{formatCompetencia(r.competencia)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(fat)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.sva))}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatPercent(svaPart)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.livros))}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatPercent(livPart)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.scm))}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatPercent(scmPart)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.servicos))}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatPercent(servPart)}</TableCell>
                          <TableCell className={`text-right ${varAbs >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                            {i === 0 ? '—' : (varAbs >= 0 ? '+' : '') + formatCurrency(varAbs)}
                          </TableCell>
                          <TableCell className={`text-right ${varPerc >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                            {i === 0 ? '—' : (varPerc >= 0 ? '+' : '') + formatPercent(varPerc)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {indicadores && (
                      <TableRow className="bg-blue-50 dark:bg-blue-950 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{formatCurrency(indicadores.faturamentoTotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(indicadores.totalSVA)}</TableCell>
                        <TableCell className="text-right">{formatPercent(indicadores.faturamentoTotal > 0 ? indicadores.totalSVA / indicadores.faturamentoTotal * 100 : 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(indicadores.totalLivros)}</TableCell>
                        <TableCell className="text-right">{formatPercent(indicadores.faturamentoTotal > 0 ? indicadores.totalLivros / indicadores.faturamentoTotal * 100 : 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(indicadores.totalSCM)}</TableCell>
                        <TableCell className="text-right">{formatPercent(indicadores.faturamentoTotal > 0 ? indicadores.totalSCM / indicadores.faturamentoTotal * 100 : 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(indicadores.totalServicos)}</TableCell>
                        <TableCell className="text-right">{formatPercent(indicadores.faturamentoTotal > 0 ? indicadores.totalServicos / indicadores.faturamentoTotal * 100 : 0)}</TableCell>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-red-600" />
                Tributos Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Mês</TableHead>
                      <TableHead className="font-semibold text-right">PIS</TableHead>
                      <TableHead className="font-semibold text-right">COFINS</TableHead>
                      <TableHead className="font-semibold text-right">ICMS</TableHead>
                      <TableHead className="font-semibold text-right">IRPJ</TableHead>
                      <TableHead className="font-semibold text-right">CSLL</TableHead>
                      <TableHead className="font-semibold text-right">Total</TableHead>
                      <TableHead className="font-semibold text-right">Aliq. Efetiva</TableHead>
                      <TableHead className="font-semibold text-right">Var. Abs.</TableHead>
                      <TableHead className="font-semibold text-right">Var. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosOrdenados.map((r, i) => {
                      const total = parseCurrency(r.pis) + parseCurrency(r.cofins) + parseCurrency(r.icms) + parseCurrency(r.irpj) + parseCurrency(r.csll);
                      const fat = parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros);
                      const aliq = fat > 0 ? (total / fat) * 100 : 0;
                      const prevTotal = i > 0 ? 
                        parseCurrency(registrosOrdenados[i-1].pis) + parseCurrency(registrosOrdenados[i-1].cofins) + parseCurrency(registrosOrdenados[i-1].icms) + parseCurrency(registrosOrdenados[i-1].irpj) + parseCurrency(registrosOrdenados[i-1].csll) : null;
                      const varAbs = prevTotal ? total - prevTotal : 0;
                      const varPerc = prevTotal && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
                      
                      return (
                        <TableRow key={r.competencia} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{formatCompetencia(r.competencia)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.pis))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.cofins))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.icms))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.irpj))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseCurrency(r.csll))}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                          <TableCell className="text-right">{formatPercent(aliq)}</TableCell>
                          <TableCell className={`text-right ${varAbs >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                            {i === 0 ? '—' : (varAbs >= 0 ? '+' : '') + formatCurrency(varAbs)}
                          </TableCell>
                          <TableCell className={`text-right ${varPerc >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Folha de Pagamento
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleAddFolha}>
                  + Adicionar Mês
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {folhaAtual.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Nenhum dado de folha de pagamento disponível. Clique em "Adicionar Mês" para inserir manualmente os dados de proventos e funcionários.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Mês</TableHead>
                        <TableHead className="font-semibold text-right">Total de Proventos</TableHead>
                        <TableHead className="font-semibold text-right">Nº Funcionários</TableHead>
                        <TableHead className="font-semibold text-right">Var. Absoluta</TableHead>
                        <TableHead className="font-semibold text-right">Var. %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {folhaAtual.map((f, i) => {
                        const prevProventos = i > 0 ? folhaAtual[i-1].proventos : null;
                        const varAbs = prevProventos ? f.proventos - prevProventos : 0;
                        const varPerc = prevProventos && prevProventos > 0 ? (varAbs / prevProventos) * 100 : 0;
                        return (
                          <TableRow key={f.competencia} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{formatCompetencia(f.competencia)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(f.proventos)}</TableCell>
                            <TableCell className="text-right">{f.numFunc}</TableCell>
                            <TableCell className={`text-right ${varAbs >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                              {i === 0 ? '—' : (varAbs >= 0 ? '+' : '') + formatCurrency(varAbs)}
                            </TableCell>
                            <TableCell className={`text-right ${varPerc >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                              {i === 0 ? '—' : (varPerc >= 0 ? '+' : '') + formatPercent(varPerc)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-green-50 dark:bg-green-950 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(folhaAtual.reduce((s, f) => s + f.proventos, 0))}
                        </TableCell>
                        <TableCell className="text-right">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-purple-600" />
                Totais Trimestrais e Anual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Período</TableHead>
                      <TableHead className="font-semibold text-right">Faturamento</TableHead>
                      <TableHead className="font-semibold text-right">SVA</TableHead>
                      <TableHead className="font-semibold text-right">Livros</TableHead>
                      <TableHead className="font-semibold text-right">SCM</TableHead>
                      <TableHead className="font-semibold text-right">Serviços</TableHead>
                      <TableHead className="font-semibold text-right">Tributos</TableHead>
                      <TableHead className="font-semibold text-right">Aliq. Efetiva</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'].map(tri => {
                      const regsTrim = registrosOrdenados.filter(r => getTrimestre(r.competencia) === tri);
                      if (regsTrim.length === 0) return null;
                      const fat = regsTrim.reduce((s, r) => s + parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros), 0);
                      const sva = regsTrim.reduce((s, r) => s + parseCurrency(r.sva), 0);
                      const liv = regsTrim.reduce((s, r) => s + parseCurrency(r.livros), 0);
                      const scm = regsTrim.reduce((s, r) => s + parseCurrency(r.scm), 0);
                      const serv = regsTrim.reduce((s, r) => s + parseCurrency(r.servicos), 0);
                      const trib = regsTrim.reduce((s, r) => s + parseCurrency(r.pis) + parseCurrency(r.cofins) + parseCurrency(r.icms) + parseCurrency(r.irpj) + parseCurrency(r.csll), 0);
                      const aliq = fat > 0 ? (trib / fat) * 100 : 0;
                      return (
                        <TableRow key={tri} className="hover:bg-muted/30 font-medium">
                          <TableCell>{tri}</TableCell>
                          <TableCell className="text-right">{formatCurrency(fat)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sva)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(liv)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(scm)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(serv)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(trib)}</TableCell>
                          <TableCell className="text-right">{formatPercent(aliq)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(() => {
                      const fatTotal = registrosOrdenados.reduce((s, r) => s + parseCurrency(r.saidas) + parseCurrency(r.servicos) + parseCurrency(r.outros), 0);
                      const svaTotal = registrosOrdenados.reduce((s, r) => s + parseCurrency(r.sva), 0);
                      const livTotal = registrosOrdenados.reduce((s, r) => s + parseCurrency(r.livros), 0);
                      const scmTotal = registrosOrdenados.reduce((s, r) => s + parseCurrency(r.scm), 0);
                      const servTotal = registrosOrdenados.reduce((s, r) => s + parseCurrency(r.servicos), 0);
                      const tribTotal = registrosOrdenados.reduce((s, r) => s + parseCurrency(r.pis) + parseCurrency(r.cofins) + parseCurrency(r.icms) + parseCurrency(r.irpj) + parseCurrency(r.csll), 0);
                      const aliqTotal = fatTotal > 0 ? (tribTotal / fatTotal) * 100 : 0;
                      return (
                        <TableRow className="bg-purple-50 dark:bg-purple-950 font-bold text-base">
                          <TableCell>TOTAL ANUAL</TableCell>
                          <TableCell className="text-right">{formatCurrency(fatTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(svaTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(livTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(scmTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(servTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(tribTotal)}</TableCell>
                          <TableCell className="text-right">{formatPercent(aliqTotal)}</TableCell>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Composição do Faturamento</CardTitle>
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
                  fill="#8884d8"
                  dataKey="value"
                >
                  {graficoComposicao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={graficoFaturamento}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="faturamento" fill="#3b82f6" name="Faturamento" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sva" fill="#10b981" name="SVA" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scm" fill="#f59e0b" name="SCM" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Evolução dos Tributos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={graficoTributos}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#ef4444" name="Total Tributos" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="icms" stroke="#8b5cf6" name="ICMS" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cofins" stroke="#ec4899" name="COFINS" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardApuracao;
