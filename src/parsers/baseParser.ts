import type { Emitente, Destinatario, Totais, Duplicata } from '@/types/fiscal';

export function getTextContent(el: Element | null, tag: string): string {
  if (!el) return '';
  const child = el.getElementsByTagName(tag)[0];
  return child ? child.textContent || '' : '';
}

export function getNumberContent(el: Element | null, tag: string): number {
  const val = getTextContent(el, tag);
  return val ? parseFloat(val) || 0 : 0;
}

export function parseEmitente(el: Element): Emitente {
  return {
    cnpj: getTextContent(el, 'CNPJ'),
    nome: getTextContent(el, 'xNome'),
    ie: getTextContent(el, 'IE'),
    endereco: `${getTextContent(el, 'xLgr')} ${getTextContent(el, 'nro')} ${getTextContent(el, 'xCpl')}`.trim(),
    municipio: getTextContent(el, 'xMun'),
    uf: getTextContent(el, 'UF'),
  };
}

export function parseDestinatario(el: Element): Destinatario {
  return {
    cnpj: getTextContent(el, 'CNPJ') || undefined,
    cpf: getTextContent(el, 'CPF') || undefined,
    nome: getTextContent(el, 'xNome'),
    ie: getTextContent(el, 'IE') || undefined,
    endereco: `${getTextContent(el, 'xLgr')} ${getTextContent(el, 'nro')} ${getTextContent(el, 'xCpl')}`.trim(),
    municipio: getTextContent(el, 'xMun'),
    uf: getTextContent(el, 'UF'),
  };
}

export function parseTotais(el: Element): Totais {
  const icmsTot = el.getElementsByTagName('ICMSTot')[0];
  if (!icmsTot) {
    return {
      baseCalcICMS: 0, valorICMS: 0, baseCalcICMSST: 0, valorICMSST: 0,
      valorProdutos: 0, valorFrete: 0, valorSeguro: 0, valorDesconto: 0,
      valorII: 0, valorIPI: 0, valorPIS: 0, valorCOFINS: 0, valorOutras: 0, valorNota: 0,
    };
  }
  return {
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

export function parseDuplicatas(el: Element): Duplicata[] {
  const dups: Duplicata[] = [];
  const dupElements = el.getElementsByTagName('dup');
  for (let i = 0; i < dupElements.length; i++) {
    dups.push({
      numero: getTextContent(dupElements[i], 'nDup'),
      vencimento: getTextContent(dupElements[i], 'dVenc'),
      valor: getNumberContent(dupElements[i], 'vDup'),
    });
  }
  return dups;
}

export function findElementNS(doc: Document, localName: string): Element | null {
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName || all[i].tagName.endsWith(localName)) {
      return all[i];
    }
  }
  return null;
}

export function findAllElementsNS(doc: Document | Element, localName: string): Element[] {
  const result: Element[] = [];
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName || all[i].tagName.endsWith(localName)) {
      result.push(all[i]);
    }
  }
  return result;
}
