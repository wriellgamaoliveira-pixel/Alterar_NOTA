import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Dados de exemplo – você poderá evoluir depois
const dadosApuracao = [
  {
    codi_emp: 201,
    nome_emp: 'ADLLINK TELECOM PROVEDOR DE INTERNET LTD',
    saidas: '439.324,46',
    servicos: '40.500,00',
    outros: '0,00',
    pis: '2.259,01',
    cofins: '10.426,19',
    icms: '39.096,38',
    sva: '188.598,93',
    livros: '52.073,55',
    scm: '198.651,98',
    difal: '0,00',
    irpj: '12.429,28',
    csll: '17.017,18',
    competencia: '03/2026',
  },
];

const DashboardApuracao: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard de Apuração</h1>
      <Card>
        <CardHeader>
          <CardTitle>Resultado da Apuração</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Saídas</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Outros</TableHead>
                <TableHead>PIS</TableHead>
                <TableHead>COFINS</TableHead>
                <TableHead>ICMS</TableHead>
                <TableHead>SVA</TableHead>
                <TableHead>Livros</TableHead>
                <TableHead>SCM</TableHead>
                <TableHead>DIFAL</TableHead>
                <TableHead>IRPJ</TableHead>
                <TableHead>CSLL</TableHead>
                <TableHead>Competência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosApuracao.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.nome_emp}</TableCell>
                  <TableCell>{row.saidas}</TableCell>
                  <TableCell>{row.servicos}</TableCell>
                  <TableCell>{row.outros}</TableCell>
                  <TableCell>{row.pis}</TableCell>
                  <TableCell>{row.cofins}</TableCell>
                  <TableCell>{row.icms}</TableCell>
                  <TableCell>{row.sva}</TableCell>
                  <TableCell>{row.livros}</TableCell>
                  <TableCell>{row.scm}</TableCell>
                  <TableCell>{row.difal}</TableCell>
                  <TableCell>{row.irpj}</TableCell>
                  <TableCell>{row.csll}</TableCell>
                  <TableCell>{row.competencia}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardApuracao;
