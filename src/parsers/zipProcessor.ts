import JSZip from 'jszip';
import type { NotaFiscal } from '@/types/fiscal';
import { parseNFE } from './nfeParser';
import { parseNFCE } from './nfceParser';
import { parseNFCOM } from './nfcomParser';
import { parseNFSE } from './nfseParser';
import type { FiscalModule } from '@/types/fiscal';

export interface ProcessResult {
  notas: NotaFiscal[];
  errors: string[];
  totalFiles: number;
  processedFiles: number;
}

export async function processZipFile(
  file: File,
  module: FiscalModule,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<ProcessResult> {
  const zip = await JSZip.loadAsync(file);
  const xmlFiles: JSZip.JSZipObject[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && relativePath.endsWith('.xml')) {
      xmlFiles.push(zipEntry);
    }
  });

  const total = xmlFiles.length;
  const notas: NotaFiscal[] = [];
  const errors: string[] = [];

  for (let i = 0; i < xmlFiles.length; i++) {
    const zipEntry = xmlFiles[i];
    onProgress?.(i + 1, total, `Processando ${zipEntry.name}...`);

    try {
      const content = await zipEntry.async('string');
      const nota = parseXML(content, module);
      if (nota) {
        notas.push(nota);
      }
    } catch (err) {
      errors.push(`${zipEntry.name}: ${(err as Error).message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return {
    notas,
    errors,
    totalFiles: total,
    processedFiles: notas.length,
  };
}

export function parseXML(xmlContent: string, module: FiscalModule): NotaFiscal | null {
  try {
    switch (module) {
      case 'nfe':
        return parseNFE(xmlContent);
      case 'nfce':
        return parseNFCE(xmlContent);
      case 'nfcom':
        return parseNFCOM(xmlContent);
      case 'nfse':
        return parseNFSE(xmlContent);
      default:
        throw new Error(`Modulo nao suportado: ${module}`);
    }
  } catch (err) {
    throw err;
  }
}

export async function processXmlFile(file: File, module: FiscalModule): Promise<NotaFiscal> {
  const content = await file.text();
  const nota = parseXML(content, module);
  if (!nota) {
    throw new Error('Nao foi possivel processar o XML');
  }
  return nota;
}

export async function processMultipleXmls(
  files: File[],
  module: FiscalModule,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<ProcessResult> {
  const notas: NotaFiscal[] = [];
  const errors: string[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, `Processando ${file.name}...`);

    try {
      const content = await file.text();
      const nota = parseXML(content, module);
      if (nota) {
        notas.push(nota);
      }
    } catch (err) {
      errors.push(`${file.name}: ${(err as Error).message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return {
    notas,
    errors,
    totalFiles: total,
    processedFiles: notas.length,
  };
}
