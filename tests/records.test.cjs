const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const validation = require('../src/records/validation.ts');
const { emptyRecords, isRecordsState, recordsStorageKey } = require('../src/records/storage.ts');
const NOW = Date.parse('2026-11-17T10:00:00+07:00');
const id = '12345678-1234-1234-1234-123456789abc';
const pdf = { id, name: 'giay-kham.pdf', mimeType: 'application/pdf', size: 8, uri: `records-web:${id}`, dataBase64: Buffer.from('%PDF-1.7').toString('base64') };
const insurance = (changes = {}) => ({ number: '0123456789', holderName: 'Nguyễn Tiến Đạt', birthDate: '2003-05-20', registrationPlace: 'Phòng khám An Tâm', validFrom: '2026-01-01', validTo: '2026-12-31', ...changes });
const certificate = (changes = {}) => ({ title: 'Giấy khám sức khỏe đi làm', purpose: 'employment', issuer: 'Cơ sở khám mẫu', examDate: '2026-11-01', notes: '', attachment: pdf, ...changes });

test('insurance format accepts current 10 digits and legacy 2 letters + 13 digits only', () => {
  for (const value of ['0123456789', 'HS4010123456789', ' hs 4010123456789 ']) assert.equal(validation.validInsuranceNumber(value), true);
  for (const value of ['', '123456789', '12345678901', 'H4010123456789', 'HS401012345678', 'HS40101234567890', 'HS4A10123456789']) assert.equal(validation.validInsuranceNumber(value), false);
  assert.equal(validation.normalizeInsuranceNumber(' hs 4010123456789 '), 'HS4010123456789');
});

test('insurance checks actual calendar dates, chronology and future birth date', () => {
  assert.equal(validation.validateInsurance(insurance(), NOW), null);
  for (const changes of [{ birthDate: '2027-01-01' }, { birthDate: '2003-02-29' }, { validFrom: '2026-12-31', validTo: '2026-01-01' }, { validFrom: '2000-01-01' }, { validTo: '2026-11-31' }, { holderName: 'A' }, { registrationPlace: '' }]) assert.ok(validation.validateInsurance(insurance(changes), NOW));
  assert.equal(validation.validateInsurance(insurance({ validTo: '2026-02-01' }), NOW), null, 'expired declarations can be retained without claiming verification');
  assert.equal(validation.insuranceDateStatus(insurance({ validTo: '2026-02-01' }), NOW), 'Đã quá ngày sử dụng đã khai báo');
});

test('attachment accepts only matching names, MIME, nonempty content and size <=3MB', () => {
  assert.equal(validation.validateAttachmentMetadata(pdf), null);
  for (const changes of [{ size: 0 }, { size: validation.MAX_ATTACHMENT_BYTES + 1 }, { size: NaN }, { size: 2.5 }, { name: '../paper.pdf' }, { name: 'paper.exe' }, { name: 'paper.png' }, { mimeType: 'image/svg+xml' }]) assert.ok(validation.validateAttachmentMetadata({ ...pdf, ...changes }));
  assert.equal(validation.validateAttachmentMetadata({ ...pdf, size: validation.MAX_ATTACHMENT_BYTES }), null);
});

test('file signatures reject renamed executable or HTML content', () => {
  assert.equal(validation.fileHeaderMatches(Buffer.from('%PDF-1.7'), 'application/pdf'), true);
  assert.equal(validation.fileHeaderMatches(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'), true);
  assert.equal(validation.fileHeaderMatches(Uint8Array.from([255, 216, 255]), 'image/jpeg'), true);
  assert.equal(validation.fileHeaderMatches(Buffer.from('<html>'), 'application/pdf'), false);
  assert.equal(validation.fileHeaderMatches(Buffer.from('MZbinary'), 'image/png'), false);
});

test('stored attachment rejects cache paths, traversal, external links and altered base64 size/header', () => {
  assert.equal(validation.isStoredAttachment(pdf), true);
  assert.equal(validation.isStoredAttachment({ ...pdf, uri: `file:///app/documents/an-tam-records/${id}.pdf`, dataBase64: undefined }), true);
  assert.equal(validation.isStoredAttachment({ ...pdf, uri: `/files/${id}`, dataBase64: undefined }), true);
  for (const changes of [{ uri: 'https://example.com/paper.pdf', dataBase64: undefined }, { uri: `file:///cache/${id}.pdf`, dataBase64: undefined }, { uri: `file:///app/an-tam-records/../${id}.pdf`, dataBase64: undefined }, { uri: `file:///app/an-tam-records/%2e%2e/${id}.pdf`, dataBase64: undefined }, { size: 7 }, { dataBase64: Buffer.from('notapdf!').toString('base64') }, { dataBase64: '!!!!' }]) assert.equal(validation.isStoredAttachment({ ...pdf, ...changes }), false);
});

test('certificates require a real attachment, coherent dates and supported purpose', () => {
  assert.equal(validation.validateCertificate(certificate(), NOW), null);
  for (const changes of [{ attachment: undefined }, { purpose: 'issued' }, { examDate: '2026-11-18' }, { examDate: '2026-02-30' }, { validUntil: '2026-10-31' }, { title: 'A' }, { issuer: '' }, { notes: 'x'.repeat(1001) }]) assert.ok(validation.validateCertificate(certificate(changes), NOW));
});

test('records storage is account scoped, rejects malformed records and duplicate document ids', () => {
  assert.notEqual(recordsStorageKey('account-one'), recordsStorageKey('account-two'));
  for (const value of ['../other', 'user:name', '', 'x'.repeat(101)]) assert.throws(() => recordsStorageKey(value));
  assert.equal(isRecordsState(emptyRecords()), true);
  const paper = { ...certificate(), id: 'certificate-id', status: 'unverified', createdAt: new Date(NOW).toISOString() };
  const state = { version: 1, insurance: { ...insurance(), id: 'insurance-id', updatedAt: new Date(NOW).toISOString() }, certificates: [paper] };
  assert.equal(isRecordsState(state), true);
  assert.equal(isRecordsState({ ...state, certificates: [paper, paper] }), false);
  assert.equal(isRecordsState({ ...state, certificates: [{ ...paper, status: 'verified' }] }), false);
  assert.equal(isRecordsState({ ...state, insurance: undefined }), false);
  assert.equal(isRecordsState({ ...state, insurance: { ...state.insurance, attachment: pdf } }), false, 'attachment identity cannot be shared by separate records');
});
