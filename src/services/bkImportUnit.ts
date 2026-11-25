import type { BKUnit } from '../types/bk';

export function resolveImportUnit(issuerTaxId: string, units: BKUnit[]) {
  const normalized = issuerTaxId.replace(/\D/g, '');
  const unit = units.find((candidate) => candidate.cnpj.replace(/\D/g, '') === normalized);
  return { unit, canConfirmWithoutUnit: !unit && /^\d{11}(\d{3})?$/.test(normalized) };
}
