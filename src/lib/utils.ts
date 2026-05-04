import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// Adicione estas funções ao arquivo utils.ts existente

export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleaned = String(value).replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getTrimestre(competencia: string): string {
  const parts = competencia.split('/');
  if (parts.length !== 2) return 'Indefinido';
  const mes = parseInt(parts[0], 10);
  if (mes >= 1 && mes <= 3) return '1º Trimestre';
  if (mes >= 4 && mes <= 6) return '2º Trimestre';
  if (mes >= 7 && mes <= 9) return '3º Trimestre';
  return '4º Trimestre';
}

export function formatCompetencia(comp: string): string {
  const parts = comp.split('/');
  if (parts.length !== 2) return comp;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const mes = parseInt(parts[0], 10);
  if (mes >= 1 && mes <= 12) {
    return `${meses[mes - 1]}/${parts[1]}`;
  }
  return comp;
}
