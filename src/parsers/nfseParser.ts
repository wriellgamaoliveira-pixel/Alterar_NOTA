import type { NotaFiscal, Produto } from '@/types/fiscal';
import { getTextContent, getNumberContent, parseEmitente, findElementNS } from './baseParser';

export function parseNFSE(xmlContent: string): NotaFiscal {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const infNfse = findElementNS(doc, 'InfNfse') || findElementNS(doc, 'infNfse');
  const servico = findElementNS(doc, 'Servico') || findElementNS(doc, 'servico');
  const prestador = findElementNS(doc, 'PrestadorServico') || findElementNS(doc, 'prestador');
  const tomador = findElementNS(doc, 'TomadorServico') || findElementNS(doc, 'tomador');
  const valores = servico ? (findElementNS(servico as unknown as Document, 'Valores') || servico) : null;

  const numero = getTextContent(infNfse, 'Numero');
  const chave = getTextContent(infNfse, 'CodigoVerificacao') || numero;

  const produtos: Produto[] = [];

  if (servico) {
    const valorServ = getNumberContent(valores, 'ValorServicos') || getNumberContent(servico, 'ValoresServicos') || 0;
    const valorPis = getNumberContent(valores, 'ValorPis') || 0;
    const valorCofins = getNumberContent(valores, 'ValorCofins') || 0;

    produtos.push({
      nome: getTextContent(servico, 'Discriminacao') || getTextContent(servico, 'Descricao') || 'Servico',
      ncm: '',
      cest: '',
      cfop: '',
      cClass: 'SERVICO',
      unidade: 'UN',
      quantidade: 1,
      valorUnitario: valorServ,
      valorTotal: valorServ,
      icms: {
        cst: '', baseCalc: 0, aliquota: 0, valor: 0,
        baseCalcST: 0, valorST: 0, percentualReducao: 0, modalidadeBC: '',
      },
      ipi: { cst: '', baseCalc: 0, aliquota: 0, valor: 0, codEnquadramento: '' },
      pis: { cst: '', baseCalc: valorServ, aliquota: 0, valor: valorPis, vAliqProd: 0 },
      cofins: { cst: '', baseCalc: valorServ, aliquota: 0, valor: valorCofins, vAliqProd: 0 },
    });
  }

  const emitente = prestador ? parseEmitente(prestador) : { cnpj: '', nome: '', ie: '', endereco: '', municipio: '', uf: '' };

  const destinatario = tomador ? {
    cnpj: getTextContent(tomador, 'Cnpj') || undefined,
    cpf: getTextContent(tomador, 'Cpf') || undefined,
    nome: getTextContent(tomador, 'RazaoSocial') || getTextContent(tomador, 'xNome') || '',
    ie: getTextContent(tomador, 'InscricaoMunicipal') || '',
    endereco: `${getTextContent(tomador, 'Endereco')} ${getTextContent(tomador, 'Numero')}`.trim(),
    municipio: getTextContent(tomador, 'xMun') || getTextContent(tomador, 'Municipio'),
    uf: getTextContent(tomador, 'Uf') || getTextContent(tomador, 'UF'),
  } : { nome: '', endereco: '', municipio: '', uf: '' };

  const valorNota = getNumberContent(valores, 'ValorServicos') || getNumberContent(valores, 'ValorLiquidoNfse') || 0;

  return {
    chave,
    numero,
    serie: '1',
    modelo: '',
    dataEmissao: getTextContent(infNfse, 'DataEmissao'),
    emitente,
    destinatario,
    produtos,
    totais: {
      baseCalcICMS: 0,
      valorICMS: 0,
      baseCalcICMSST: 0,
      valorICMSST: 0,
      valorProdutos: valorNota,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorII: 0,
      valorIPI: 0,
      valorPIS: 0,
      valorCOFINS: 0,
      valorOutras: 0,
      valorNota,
    },
    tipoOperacao: 'Servico',
    naturezaOperacao: getTextContent(servico, 'ExigibilidadeISS') || 'Tributacao no Municipio',
    xmlContent,
  };
}
