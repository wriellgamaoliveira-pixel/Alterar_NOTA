import type { NotaFiscal, Produto } from '@/types/fiscal';
import { getTextContent, getNumberContent, parseEmitente, parseDestinatario, parseTotais, parseDuplicatas, findElementNS, findAllElementsNS } from './baseParser';

export function parseNFE(xmlContent: string): NotaFiscal {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const infNFe = findElementNS(doc, 'infNFe');
  const ide = findElementNS(doc, 'ide');
  const emit = findElementNS(doc, 'emit');
  const dest = findElementNS(doc, 'dest');
  const total = findElementNS(doc, 'total');
  const cobr = findElementNS(doc, 'cobr');
  const infAdic = findElementNS(doc, 'infAdic');

  const chave = infNFe?.getAttribute('Id')?.replace('NFe', '') || '';
  const modelo = getTextContent(ide, 'mod');

  if (modelo !== '55') {
    throw new Error('Este XML não é uma NF-e modelo 55');
  }

  const produtos: Produto[] = [];
  const detElements = findAllElementsNS(doc, 'det');

  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    const imposto = det.getElementsByTagName('imposto')[0];

    if (!prod || !imposto) continue;

    const icmsEl = findICMS(imposto);
    const ipiEl = imposto.getElementsByTagName('IPI')[0];
    const pisEl = imposto.getElementsByTagName('PIS')[0];
    const cofinsEl = imposto.getElementsByTagName('COFINS')[0];

    produtos.push({
      nome: getTextContent(prod, 'xProd'),
      ncm: getTextContent(prod, 'NCM'),
      cest: getTextContent(prod, 'CEST'),
      cfop: getTextContent(prod, 'CFOP'),
      cClass: getTextContent(prod, 'cClass') || getTextContent(prod, 'xPed') || 'SEM_CLASS',
      unidade: getTextContent(prod, 'uCom'),
      quantidade: getNumberContent(prod, 'qCom'),
      valorUnitario: getNumberContent(prod, 'vUnCom'),
      valorTotal: getNumberContent(prod, 'vProd'),
      icms: {
        cst: icmsEl ? getTextContent(icmsEl, 'CST') || getTextContent(icmsEl, 'CSOSN') : '',
        baseCalc: icmsEl ? getNumberContent(icmsEl, 'vBC') : 0,
        aliquota: icmsEl ? getNumberContent(icmsEl, 'pICMS') : 0,
        valor: icmsEl ? getNumberContent(icmsEl, 'vICMS') : 0,
        baseCalcST: icmsEl ? getNumberContent(icmsEl, 'vBCST') : 0,
        valorST: icmsEl ? getNumberContent(icmsEl, 'vICMSST') : 0,
        percentualReducao: icmsEl ? getNumberContent(icmsEl, 'pRedBC') : 0,
        modalidadeBC: icmsEl ? getTextContent(icmsEl, 'modBC') : '',
      },
      ipi: {
        cst: ipiEl ? getTextContent(ipiEl, 'CST') : '',
        baseCalc: ipiEl ? getNumberContent(ipiEl, 'vBC') : 0,
        aliquota: ipiEl ? getNumberContent(ipiEl, 'pIPI') : 0,
        valor: ipiEl ? getNumberContent(ipiEl, 'vIPI') : 0,
        codEnquadramento: ipiEl ? getTextContent(ipiEl, 'cEnq') : '',
      },
      pis: {
        cst: pisEl ? getTextContent(pisEl, 'CST') : '',
        baseCalc: pisEl ? getNumberContent(pisEl, 'vBC') : 0,
        aliquota: pisEl ? getNumberContent(pisEl, 'pPIS') : 0,
        valor: pisEl ? getNumberContent(pisEl, 'vPIS') : 0,
        vAliqProd: pisEl ? getNumberContent(pisEl, 'vAliqProd') : 0,
      },
      cofins: {
        cst: cofinsEl ? getTextContent(cofinsEl, 'CST') : '',
        baseCalc: cofinsEl ? getNumberContent(cofinsEl, 'vBC') : 0,
        aliquota: cofinsEl ? getNumberContent(cofinsEl, 'pCOFINS') : 0,
        valor: cofinsEl ? getNumberContent(cofinsEl, 'vCOFINS') : 0,
        vAliqProd: cofinsEl ? getNumberContent(cofinsEl, 'vAliqProd') : 0,
      },
    });
  }

  return {
    chave,
    numero: getTextContent(ide, 'nNF'),
    serie: getTextContent(ide, 'serie'),
    modelo,
    dataEmissao: getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi'),
    dataSaida: getTextContent(ide, 'dhSaiEnt') || getTextContent(ide, 'dSaiEnt') || undefined,
    emitente: emit ? parseEmitente(emit) : { cnpj: '', nome: '', ie: '', endereco: '', municipio: '', uf: '' },
    destinatario: dest ? parseDestinatario(dest) : { nome: '', endereco: '', municipio: '', uf: '' },
    produtos,
    totais: total ? parseTotais(total) : {
      baseCalcICMS: 0, valorICMS: 0, baseCalcICMSST: 0, valorICMSST: 0,
      valorProdutos: 0, valorFrete: 0, valorSeguro: 0, valorDesconto: 0,
      valorII: 0, valorIPI: 0, valorPIS: 0, valorCOFINS: 0, valorOutras: 0, valorNota: 0,
    },
    infoAdicional: infAdic ? getTextContent(infAdic, 'infCpl') : undefined,
    duplicatas: cobr ? parseDuplicatas(cobr) : undefined,
    tipoOperacao: getTextContent(ide, 'tpNF') === '1' ? 'Saída' : 'Entrada',
    naturezaOperacao: getTextContent(ide, 'natOp'),
    xmlContent,
  };
}

function findICMS(imposto: Element): Element | null {
  const icms = imposto.getElementsByTagName('ICMS')[0];
  if (!icms) return null;
  const children = icms.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i].tagName.includes('ICMS')) {
      return children[i];
    }
  }
  return null;
}

export function parseNFEItensFlat(xmlContent: string): Array<{
  cst: string; ncm: string; cfop: string; produto: string;
  baseCalc: number; icms: number; icmsST: number; valorTotal: number;
  aliquota: number; cClass: string;
}> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  const detElements = findAllElementsNS(doc, 'det');
  const result = [];

  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    const imposto = det.getElementsByTagName('imposto')[0];
    if (!prod || !imposto) continue;

    const icmsEl = findICMS(imposto);
    result.push({
      cst: icmsEl ? getTextContent(icmsEl, 'CST') || getTextContent(icmsEl, 'CSOSN') : '',
      ncm: getTextContent(prod, 'NCM'),
      cfop: getTextContent(prod, 'CFOP'),
      produto: getTextContent(prod, 'xProd'),
      baseCalc: icmsEl ? getNumberContent(icmsEl, 'vBC') : 0,
      icms: icmsEl ? getNumberContent(icmsEl, 'vICMS') : 0,
      icmsST: icmsEl ? getNumberContent(icmsEl, 'vICMSST') : 0,
      valorTotal: getNumberContent(prod, 'vProd'),
      aliquota: icmsEl ? getNumberContent(icmsEl, 'pICMS') : 0,
      cClass: getTextContent(prod, 'cClass') || getTextContent(prod, 'xPed') || 'SEM_CLASS',
    });
  }
  return result;
}
