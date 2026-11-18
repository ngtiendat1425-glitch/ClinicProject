const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

const validation = require('../src/auth/validation.ts');
const storage = require('../src/auth/storage.ts');
const NOW = Date.parse('2026-11-17T07:00:00+07:00');
const PASSWORD = 'Synthetic test phrase';
const registration = (changes = {}) => ({
  name: 'Bệnh Nhân Mẫu', phone: '0901234567', email: 'patient@example.com', birthDate: '2000-02-29',
  password: PASSWORD, confirmPassword: PASSWORD, acceptedTerms: true, ...changes,
});
const account = (changes = {}) => ({
  id: `acct-${'a'.repeat(32)}`, patient: validation.registrationPatient(registration()),
  createdAt: new Date(NOW).toISOString(), saltHex: '01'.repeat(16), passwordHashHex: 'a'.repeat(64),
  iterations: 100000, ...changes,
});

test('registration normalizes Vietnamese phone numbers, whitespace and email case', () => {
  const input = registration({ name: '  Nguyễn   Tiến Đạt  ', phone: '+84 (901) 234-567', email: ' PATIENT@EXAMPLE.COM ' });
  const clean = validation.normalizeRegistration(input);
  assert.equal(clean.name, 'Nguyễn Tiến Đạt');
  assert.equal(clean.phone, '0901234567');
  assert.equal(clean.email, 'patient@example.com');
  assert.equal(validation.validateRegistration(input, [], NOW), null);
});

test('registration accepts optional email and requires consent', () => {
  assert.equal(validation.validateRegistration(registration({ email: '' }), [], NOW), null);
  assert.ok(validation.validateRegistration(registration({ acceptedTerms: false }), [], NOW));
});

test('registration enforces valid profile fields and real calendar dates', () => {
  for (const changes of [
    { name: 'A' }, { phone: '1234' }, { email: 'invalid@' }, { birthDate: '2026-02-29' },
    { birthDate: '2027-01-01' }, { birthDate: '1899-12-31' }, { birthDate: '29/02/2000' },
  ]) assert.ok(validation.validateRegistration(registration(changes), [], NOW));
});

test('password policy requires 8–128 characters and matching confirmation', () => {
  for (const password of ['a'.repeat(7), 'a'.repeat(129), '        ']) {
    assert.ok(validation.validateRegistration(registration({ password, confirmPassword: password }), [], NOW));
  }
  for (const password of ['a'.repeat(8), 'a'.repeat(128)]) {
    assert.equal(validation.validateRegistration(registration({ password, confirmPassword: password }), [], NOW), null);
  }
  assert.ok(validation.validateRegistration(registration({ confirmPassword: 'Different synthetic phrase' }), [], NOW));
});

test('duplicate phone and email identities cannot register with alternate formatting', () => {
  const existing = [account()];
  assert.ok(validation.validateRegistration(registration({ phone: '+84 901234567', email: '' }), existing, NOW));
  assert.ok(validation.validateRegistration(registration({ phone: '0987654321', email: ' PATIENT@EXAMPLE.COM ' }), existing, NOW));
  assert.equal(validation.validateRegistration(registration({ phone: '0987654321', email: 'other@example.com' }), existing, NOW), null);
});

test('login resolves phone or email with the same normalization as registration', () => {
  const stored = account();
  assert.equal(validation.findAccountByIdentifier([stored], '+84 901-234-567')?.id, stored.id);
  assert.equal(validation.findAccountByIdentifier([stored], ' PATIENT@EXAMPLE.COM ')?.id, stored.id);
  assert.equal(validation.findAccountByIdentifier([stored], 'missing@example.com'), undefined);
  assert.ok(validation.validateLogin({ identifier: 'missing', password: PASSWORD }));
  assert.equal(validation.validateLogin({ identifier: '+84901234567', password: PASSWORD }), null);
});

test('PBKDF2 uses 100000 rounds, a random-salt-sized input and a 32-byte SHA256 key', async () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const actual = await validation.derivePasswordHash(PASSWORD, salt);
  const expected = crypto.pbkdf2Sync(PASSWORD, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
  assert.equal(crypto.timingSafeEqual(Buffer.from(actual, 'hex'), expected), true);
  const another = await validation.derivePasswordHash(PASSWORD, crypto.randomBytes(16).toString('hex'));
  assert.equal(actual === another, false);
});

test('correct password verifies, wrong password fails, and public account strips private fields', async () => {
  const stored = account();
  stored.passwordHashHex = await validation.derivePasswordHash(PASSWORD, stored.saltHex);
  assert.equal(await validation.verifyPassword(PASSWORD, stored), true);
  assert.equal(await validation.verifyPassword('Wrong synthetic phrase', stored), false);
  const publicValue = validation.publicAccount(stored);
  assert.deepEqual(Object.keys(publicValue).sort(), ['createdAt', 'id', 'patient']);
  assert.equal(Object.hasOwn(publicValue, 'passwordHashHex'), false);
});

test('stored account validation rejects malformed hash, unbounded iterations and plaintext fields', () => {
  assert.equal(storage.isStoredAuthAccount(account()), true);
  for (const changes of [
    { passwordHashHex: 'invalid' }, { saltHex: '1234' }, { iterations: 1e9 }, { id: '../other-user' },
    { createdAt: 'invalid' }, { password: PASSWORD }, { patient: { name: 'Incomplete profile' } },
  ]) assert.equal(storage.isStoredAuthAccount(account(changes)), false);
});

test('stored account list rejects duplicate identities and unsupported versions', () => {
  assert.equal(storage.isAuthAccountsStore({ version: 1, accounts: [account()] }), true);
  assert.equal(storage.isAuthAccountsStore({ version: 1, accounts: [account(), account({ id: `acct-${'b'.repeat(32)}` })] }), false);
  assert.equal(storage.isAuthAccountsStore({ version: 2, accounts: [] }), false);
});

test('new storage is signed out; registered and explicit demo sessions restore separately', () => {
  assert.equal(storage.parseAuthSnapshot(null, null).account, null);
  const stored = account();
  const accountsRaw = JSON.stringify({ version: 1, accounts: [stored] });
  const snapshot = storage.parseAuthSnapshot(accountsRaw, JSON.stringify({ version: 1, accountId: stored.id }));
  assert.equal(snapshot.account.id, stored.id);
  assert.equal(Object.hasOwn(snapshot.account, 'passwordHashHex'), false);
  assert.equal(storage.parseAuthSnapshot(null, JSON.stringify({ version: 1, accountId: 'demo' })).account.id, 'demo');
});

test('unknown or malformed sessions never restore another identity', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 1, accountId: `acct-${'f'.repeat(32)}` }), JSON.stringify({ version: 1, accountId: 'other' })]) {
    const snapshot = storage.parseAuthSnapshot(null, raw);
    assert.equal(snapshot.account, null);
    assert.equal(snapshot.canWriteSession, false);
    assert.ok(snapshot.storageError);
  }
});

test('reading malformed account data preserves original bytes without writes or deletion', async () => {
  const values = new Map([[storage.AUTH_ACCOUNTS_KEY, '{malformed'], [storage.AUTH_SESSION_KEY, '{also-malformed']]);
  let mutations = 0;
  const adapter = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async () => { mutations += 1; }, removeItem: async () => { mutations += 1; },
  };
  const snapshot = await storage.readAuthSnapshot(adapter);
  assert.equal(snapshot.canWriteAccounts, false);
  assert.equal(snapshot.canWriteSession, false);
  assert.equal(snapshot.account, null);
  assert.equal(mutations, 0);
  assert.equal(values.get(storage.AUTH_ACCOUNTS_KEY), '{malformed');
});

test('accounts and session use separate keys and serialize no plaintext password', async () => {
  const writes = [];
  const adapter = { getItem: async () => null, removeItem: async () => undefined, setItem: async (key, value) => { writes.push({ key, value }); } };
  const stored = account();
  await storage.writeAuthAccounts(adapter, [stored]);
  await storage.writeAuthSession(adapter, stored.id);
  assert.equal(writes[0].key, storage.AUTH_ACCOUNTS_KEY);
  assert.equal(writes[1].key, storage.AUTH_SESSION_KEY);
  assert.equal(writes.some((entry) => entry.value.includes(PASSWORD)), false);
  assert.equal(Object.hasOwn(JSON.parse(writes[0].value).accounts[0], 'password'), false);
});

const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;
process.env.EXPO_PUBLIC_API_URL = 'https://clinic.invalid/api/v1/';
const api = require('../src/services/api.ts');
if (previousApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
else process.env.EXPO_PUBLIC_API_URL = previousApiUrl;

test('API configuration requires HTTPS except explicit local development hosts', () => {
  for (const url of ['https://clinic.example/api/v1', 'http://localhost:8080/api/v1', 'http://127.0.0.1:8080/api/v1', 'http://10.0.2.2:8080/api/v1']) assert.equal(api.validateApiBaseUrl(url), null);
  for (const url of ['http://clinic.example/api/v1', 'http://192.168.1.20:8080/api/v1', 'https://user:password@clinic.example', 'https://clinic.example?token=invalid', 'invalid']) assert.ok(api.validateApiBaseUrl(url));
});

test('API requests use memory Bearer token, exact path and handle204', async () => {
  const original = global.fetch;
  let captured;
  api.setAccessToken('synthetic-memory-token');
  global.fetch = async (url, options) => { captured = { url, options }; return new Response(null, { status: 204 }); };
  try {
    assert.equal(await api.apiRequest('/auth/logout', { method: 'POST' }), undefined);
    assert.equal(captured.url, 'https://clinic.invalid/api/v1/auth/logout');
    assert.equal(captured.options.headers.Authorization, 'Bearer synthetic-memory-token');
    assert.equal(captured.options.credentials, 'omit');
  } finally { global.fetch = original; api.setAccessToken(null); }
});

test('authenticated401 clears memory and notifies once; failed public login does not', async () => {
  const original = global.fetch;
  let notifications = 0;
  const unsubscribe = api.onUnauthorized(() => { notifications += 1; });
  global.fetch = async () => new Response(JSON.stringify({ detail: 'Phiên không hợp lệ.', requestId: 'test-request-id' }), { status: 401 });
  try {
    api.setAccessToken('synthetic-memory-token');
    await assert.rejects(api.apiRequest('/appointments'), (error) => error.status === 401 && error.message.includes('test-request-id'));
    assert.equal(api.getAccessToken(), null);
    assert.equal(notifications, 1);
    api.setAccessToken('another-synthetic-token');
    await assert.rejects(api.apiRequest('/auth/login', { auth: false, method: 'POST', body: {} }), (error) => error.status === 401);
    assert.equal(api.getAccessToken(), 'another-synthetic-token');
    assert.equal(notifications, 1);
  } finally { unsubscribe(); global.fetch = original; api.setAccessToken(null); }
});

test('a stale401 response cannot expire a newer authenticated identity', async () => {
  const original = global.fetch;
  let resolve;
  global.fetch = () => new Promise((done) => { resolve = done; });
  try {
    api.setAccessToken('old-synthetic-token');
    const pending = api.apiRequest('/appointments');
    api.setAccessToken('new-synthetic-token');
    resolve(new Response('{}', { status: 401 }));
    await assert.rejects(pending, (error) => error.status === 401);
    assert.equal(api.getAccessToken(), 'new-synthetic-token');
  } finally { global.fetch = original; api.setAccessToken(null); }
});

test('API forwards cancellation without silently converting it to a network failure', async () => {
  const original = global.fetch;
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  try {
    const controller = new AbortController();
    const pending = api.apiRequest('/auth/login', { auth: false, method: 'POST', signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (error) => error.name === 'AbortError');
  } finally { global.fetch = original; }
});
