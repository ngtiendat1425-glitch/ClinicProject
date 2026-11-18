const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

function transpile(module, filename) {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  module._compile(result.outputText, filename);
}
require.extensions['.ts'] = transpile;

const previousUrl = process.env.EXPO_PUBLIC_API_URL;
process.env.EXPO_PUBLIC_API_URL = 'https://clinic.example/api/v1';
const api = require('../src/services/api.ts');
if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previousUrl;

// Exercise the actual download implementation with web/native UI modules stubbed;
// authorization and session-expiration behavior comes from the real API module.
const filename = path.resolve(__dirname, '../src/records/attachments.ts');
const attachmentsModule = new Module(filename, module);
attachmentsModule.filename = filename;
attachmentsModule.paths = Module._nodeModulePaths(path.dirname(filename));
const originalRequire = attachmentsModule.require.bind(attachmentsModule);
attachmentsModule.require = name => name === 'react-native' ? { Platform: { OS: 'web' } }
  : name === 'expo-document-picker' ? {} : originalRequire(name);
transpile(attachmentsModule, filename);
const { openAttachment } = attachmentsModule.exports;

const id = '12345678-1234-1234-1234-123456789abc';
const attachment = { id, name: 'paper.pdf', mimeType: 'application/pdf', size: 8, uri: `/files/${id}` };
const originalFetch = global.fetch;
test.after(() => { global.fetch = originalFetch; api.setAccessToken(null); });

test('protected download 401 expires the captured current session and broadcasts once', async () => {
  api.setAccessToken('test-session-one');
  let broadcasts = 0;
  const unsubscribe = api.onUnauthorized(() => { broadcasts += 1; });
  global.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-session-one');
    return { ok: false, status: 401 };
  };
  await assert.rejects(openAttachment(attachment), /Phiên đăng nhập đã hết hạn/);
  assert.equal(api.getAccessToken(), null);
  assert.equal(broadcasts, 1);
  unsubscribe();
});

test('a stale download 401 cannot expire a newer session', async () => {
  api.setAccessToken('test-old-session');
  let broadcasts = 0;
  const unsubscribe = api.onUnauthorized(() => { broadcasts += 1; });
  global.fetch = async () => { api.setAccessToken('test-new-session'); return { ok: false, status: 401 }; };
  await assert.rejects(openAttachment(attachment), /Phiên đăng nhập đã hết hạn/);
  assert.equal(api.getAccessToken(), 'test-new-session');
  assert.equal(broadcasts, 0);
  unsubscribe();
});

test('a forbidden file does not sign out its authenticated user', async () => {
  api.setAccessToken('test-current-session');
  global.fetch = async () => ({ ok: false, status: 403 });
  await assert.rejects(openAttachment(attachment), /không có quyền truy cập/);
  assert.equal(api.getAccessToken(), 'test-current-session');
});

test('successful bytes from an old session cannot be presented after account changes', async () => {
  api.setAccessToken('test-first-user');
  global.fetch = async () => {
    api.setAccessToken('test-second-user');
    return { ok: true, status: 200, arrayBuffer: async () => { throw new Error('should not consume a stale response'); } };
  };
  await assert.rejects(openAttachment(attachment), /Phiên đăng nhập đã thay đổi/);
  assert.equal(api.getAccessToken(), 'test-second-user');
});

test('account changes during a file-body read also prevent the previous file from opening', async () => {
  api.setAccessToken('test-first-user');
  global.fetch = async () => ({ ok: true, status: 200, arrayBuffer: async () => {
    api.setAccessToken('test-second-user'); return Uint8Array.from(Buffer.from('%PDF-1.7')).buffer;
  } });
  await assert.rejects(openAttachment(attachment), /Phiên đăng nhập đã thay đổi/);
  assert.equal(api.getAccessToken(), 'test-second-user');
});
