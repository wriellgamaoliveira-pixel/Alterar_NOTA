import type { NotaFiscal, Produto } from '@/types/fiscal';
import { getTextContent, getNumberContent, parseEmitente, parseDestinatario, parseTotais, findElementNS, findAllElementsNS } from './baseParser';

export function parseNFCE(xmlContent: string): NotaFiscal {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const infNFe = findElementNS(doc, 'infNFe');
  const ide = findElementNS(doc, 'ide');
  const emit = findElementNS(doc, 'emit');
  const dest = findElementNS(doc, 'dest');
  const total = findElementNS(doc, 'total');
  const infAdic = findElementNS(doc, 'infAdic');

  const chave = infNFe?.getAttribute('Id')?.replace('NFe', '') || '';
  const modelo = getTextContent(ide, 'mod');

  if (modelo !== '65') {
    throw new Error('Este XML não é uma NFC-e modelo 65');
  }

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

    let pisCST = '';
    let pisAliq = 0;
    let pisValor = 0;
    let pisBC = 0;

    if (pisEl) {
      const pisChildren = pisEl.children;
      for (let j = 0; j < pisChildren.length; j++) {
        if (pisChildren[j].tagName.includes('PIS')) {
          pisCST = getTextContent(pisChildren[j], 'CST');
          pisAliq = getNumberContent(pisChildren[j], 'pPIS') || getNumberContent(pisChildren[j], 'vAliqProd');
          pisValor = getNumberContent(pisChildren[j], 'vPIS');
          pisBC = getNumberContent(pisChildren[j], 'vBC');
          break;
        }
      }
    }

    let cofinsCST = '';
    let cofinsAliq = 0;
    let cofinsValor = 0;
    let cofinsBC = 0;

    if (cofinsEl) {
      const cofinsChildren = cofinsEl.children;
      for (let j = 0; j < cofinsChildren.length; j++) {
        if (cofinsChildren[j].tagName.includes('COFINS')) {
          cofinsCST = getTextContent(cofinsChildren[j], 'CST');
          cofinsAliq = getNumberContent(cofinsChildren[j], 'pCOFINS') || getNumberContent(cofinsChildren[j], 'vAliqProd');
          cofinsValor = getNumberContent(cofinsChildren[j], 'vCOFINS');
          cofinsBC = getNumberContent(cofinsChildren[j], 'vBC');
          break;
        }
      }
    }

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
        cst: pisCST,
        baseCalc: pisBC,
        aliquota: pisAliq,
        valor: pisValor,
        vAliqProd: pisAliq,
      },
      cofins: {
        cst: cofinsCST,
        baseCalc: cofinsBC,
        aliquota: cofinsAliq,
        valor: cofinsValor,
        vAliqProd: cofinsAliq,
      },
    });
  }

  return {
    chave,
    numero: getTextContent(ide, 'nNF'),
    serie: getTextContent(ide, 'serie'),
    modelo,
    dataEmissao: getTextContent(ide, 'dhEmi') || getTextContent(ide, 'dEmi'),
    emitente: emit ? parseEmitente(emit) : { cnpj: '', nome: '', ie: '', endereco: '', municipio: '', uf: '' },
    destinatario: dest ? parseDestinatario(dest) : { nome: '', endereco: '', municipio: '', uf: '' },
    produtos,
    totais: total ? parseTotais(total) : {
      baseCalcICMS: 0, valorICMS: 0, baseCalcICMSST: 0, valorICMSST: 0,
      valorProdutos: 0, valorFrete: 0, valorSeguro: 0, valorDesconto: 0,
      valorII: 0, valorIPI: 0, valorPIS: 0, valorCOFINS: 0, valorOutras: 0, valorNota: 0,
    },
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

export function parseNFCEItensFlat(xmlContent: string): Array<{
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
