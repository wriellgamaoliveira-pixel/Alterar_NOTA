import type { NotaFiscal, Produto } from '@/types/fiscal';
import { getTextContent, getNumberContent, parseEmitente, parseDestinatario, findElementNS, findAllElementsNS } from './baseParser';

export function parseNFCOM(xmlContent: string): NotaFiscal {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const infNFCom = findElementNS(doc, 'infNFCom');
  const ide = findElementNS(doc, 'ide');
  const emit = findElementNS(doc, 'emit');
  const dest = findElementNS(doc, 'dest');
  const total = findElementNS(doc, 'total');
  const infAdic = findElementNS(doc, 'infAdic');

  const chave = infNFCom?.getAttribute('Id')?.replace('NFCom', '') || getTextContent(ide, 'cNF');

  const produtos: Produto[] = [];
  const detElements = findAllElementsNS(doc, 'det');

  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    const imposto = det.getElementsByTagName('imposto')[0];

    if (!prod || !imposto) continue;

    const icmsEl = findICMS(imposto);
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
        cst: '', baseCalc: 0, aliquota: 0, valor: 0, codEnquadramento: '',
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

  let totais = {
    baseCalcICMS: 0, valorICMS: 0, baseCalcICMSST: 0, valorICMSST: 0,
    valorProdutos: 0, valorFrete: 0, valorSeguro: 0, valorDesconto: 0,
    valorII: 0, valorIPI: 0, valorPIS: 0, valorCOFINS: 0, valorOutras: 0, valorNota: 0,
  };

  if (total) {
    const icmsTot = total.getElementsByTagName('ICMSTot')[0];
    if (icmsTot) {
      totais = {
        baseCalcICMS: getNumberContent(icmsTot, 'vBC'),
        valorICMS: getNumberContent(icmsTot, 'vICMS'),
        baseCalcICMSST: getNumberContent(icmsTot, 'vBCST'),
        valorICMSST: getNumberContent(icmsTot, 'vST'),
        valorProdutos: getNumberContent(icmsTot, 'vProd'),
        valorFrete: getNumberContent(icmsTot, 'vFrete'),
        valorSeguro: getNumberContent(icmsTot, 'vSeg'),
        valorDesconto: getNumberContent(icmsTot, 'vDesc'),
        valorII: getNumberContent(icmsTot, 'vII'),
        valorIPI: getNumberContent(icmsTot, 'vIPI'),
        valorPIS: getNumberContent(icmsTot, 'vPIS'),
        valorCOFINS: getNumberContent(icmsTot, 'vCOFINS'),
        valorOutras: getNumberContent(icmsTot, 'vOutro'),
        valorNota: getNumberContent(icmsTot, 'vNF'),
      };
    }
  }

  return {
    chave,
    numero: getTextContent(ide, 'nNF'),
    serie: getTextContent(ide, 'serie'),
    modelo: getTextContent(ide, 'mod'),
    dataEmissao: getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi'),
    emitente: emit ? parseEmitente(emit) : { cnpj: '', nome: '', ie: '', endereco: '', municipio: '', uf: '' },
    destinatario: dest ? parseDestinatario(dest) : { nome: '', endereco: '', municipio: '', uf: '' },
    produtos,
    totais,
    infoAdicional: infAdic ? getTextContent(infAdic, 'infCpl') : undefined,
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
