import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

// The private key must stay outside the repository. Never print its contents.
const [command, keyPath, username, browserId, hoursText] = process.argv.slice(2);
if (!keyPath || !isAbsolute(keyPath)) throw new Error('Informe o caminho absoluto da chave privada fora do repositório.');
if (command === 'init') {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, keys.privateKey.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx', mode: 0o600 });
  console.log(keys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
} else if (command === 'issue') {
  const hours = Number(hoursText);
  if (!username?.trim() || username.trim().length > 80 || !/^[a-f0-9-]{36}$/i.test(browserId || '') || !Number.isFinite(hours) || hours <= 0 || hours > 24000) {
    throw new Error('Uso: issue CHAVE USUARIO CODIGO_DO_NAVEGADOR HORAS (até 24000).');
  }
  const issuedAt = Date.now();
  const payload = Buffer.from(JSON.stringify({ version: 1, username: username.trim(), browserId, issuedAt, expiresAt: issuedAt + hours * 3600000 })).toString('base64url');
  const signature = sign('sha256', Buffer.from(payload), { key: readFileSync(keyPath), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  console.log(`${payload}.${signature}`);
} else {
  throw new Error('Comando esperado: init ou issue.');
}
