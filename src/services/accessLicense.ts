import { ACCESS_PUBLIC_KEY } from './accessPublicKey.ts';

export const BROWSER_ID_KEY = 'portal-fiscal-access-browser-id';
export const LICENSE_KEY = 'portal-fiscal-access-license';
const LAST_SEEN_KEY = 'portal-fiscal-access-last-seen';

export interface AccessLicense {
  version: 1;
  username: string;
  browserId: string;
  issuedAt: number;
  expiresAt: number;
}

export function getBrowserId() {
  const saved = localStorage.getItem(BROWSER_ID_KEY);
  if (saved) return saved;
  const created = crypto.randomUUID();
  localStorage.setItem(BROWSER_ID_KEY, created);
  return created;
}

function decode(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
}

export function validateLicensePeriod(license: AccessLicense, browserId: string, now: number) {
  if (license.version !== 1 || !license.username?.trim() || license.browserId !== browserId ||
    !Number.isSafeInteger(license.issuedAt) || !Number.isSafeInteger(license.expiresAt) ||
    license.expiresAt <= license.issuedAt || license.issuedAt > now + 60000) {
    throw new Error('Código inválido ou emitido para outro navegador.');
  }
  if (license.expiresAt <= now) throw new Error('Acesso vencido. Solicite uma nova liberação.');
  return license;
}

export async function verifyAccessLicense(token: string, browserId: string, now: number, publicKey = ACCESS_PUBLIC_KEY) {
  if (token.length > 4096) throw new Error('Código de liberação inválido.');
  const parts = token.trim().split('.');
  if (parts.length !== 2) throw new Error('Código de liberação inválido.');
  try {
    const key = await crypto.subtle.importKey('spki', decode(publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, decode(parts[1]), new TextEncoder().encode(parts[0]));
    if (!valid) throw new Error();
  } catch {
    throw new Error('Assinatura inválida. Copie o código completo recebido do responsável.');
  }
  let payload: AccessLicense;
  try { payload = JSON.parse(new TextDecoder().decode(decode(parts[0]))); }
  catch { throw new Error('Código de liberação inválido.'); }
  if (!payload || typeof payload.username !== 'string') throw new Error('Código de liberação inválido.');
  return validateLicensePeriod(payload, browserId, now);
}

// Uses both the wall clock and elapsed time. This is a local safeguard, not a trusted server clock.
let lastWallTime = Date.now();
let lastMonotonic = performance.now();
export function accessNow() {
  const monotonic = performance.now();
  const saved = Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
  const now = Math.max(Date.now(), lastWallTime + Math.max(0, monotonic - lastMonotonic), saved);
  lastWallTime = now;
  lastMonotonic = monotonic;
  localStorage.setItem(LAST_SEEN_KEY, String(Math.floor(now)));
  return now;
}
