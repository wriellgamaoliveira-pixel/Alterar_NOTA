import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyAccessLicense, validateLicensePeriod, getBrowserId, accessNow, BROWSER_ID_KEY } from '../src/services/accessLicense.ts';

const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicKey = keys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const now = 1800000000000;
const browserId = '12345678-1234-1234-1234-123456789012';
const license = { version: 1, username: 'teste', browserId, issuedAt: now, expiresAt: now + 86400000 };
function tokenFor(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign('sha256', Buffer.from(body), { key: keys.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

test('valid signed license activates only on the requested browser', async () => {
  assert.deepEqual(await verifyAccessLicense(tokenFor(license), browserId, now, publicKey), license);
  await assert.rejects(verifyAccessLicense(tokenFor(license), 'another-browser', now, publicKey), /outro navegador/);
});
test('expiration blocks exactly at the deadline and afterwards', async () => {
  assert.equal(validateLicensePeriod(license, browserId, license.expiresAt - 1), license);
  assert.throws(() => validateLicensePeriod(license, browserId, license.expiresAt), /vencido/);
  await assert.rejects(verifyAccessLicense(tokenFor(license), browserId, license.expiresAt + 1, publicKey), /vencido/);
});
test('tampering with a deadline fails signature validation', async () => {
  const original = tokenFor(license);
  const modifiedBody = Buffer.from(JSON.stringify({ ...license, expiresAt: now + 999999999 })).toString('base64url');
  await assert.rejects(verifyAccessLicense(`${modifiedBody}.${original.split('.')[1]}`, browserId, now, publicKey), /Assinatura inválida/);
});
test('a different signing key cannot issue valid licenses', async () => {
  const other = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const otherPublic = other.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  await assert.rejects(verifyAccessLicense(tokenFor(license), browserId, now, otherPublic), /Assinatura inválida/);
});
test('malformed tokens and invalid or future periods fail closed', async () => {
  for (const value of ['', 'invalid', 'abc.def', 'a'.repeat(5000)]) {
    await assert.rejects(verifyAccessLicense(value, browserId, now, publicKey));
  }
  for (const payload of [null, {}, { ...license, username: '' }, { ...license, expiresAt: now - 1 }, { ...license, issuedAt: now + 120000 }]) {
    await assert.rejects(verifyAccessLicense(tokenFor(payload), browserId, now, publicKey));
  }
});
test('browser identity persists and saved clock checkpoint prevents simple rollback', () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const id = getBrowserId();
  assert.equal(getBrowserId(), id);
  assert.equal(values.get(BROWSER_ID_KEY), id);
  values.set('portal-fiscal-access-last-seen', String(Date.now() + 600000));
  const checkpoint = accessNow();
  assert.ok(checkpoint > Date.now());
  assert.ok(accessNow() >= checkpoint);
});
