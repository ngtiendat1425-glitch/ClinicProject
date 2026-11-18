/* Real HTTP checks against the local development API. All inputs are fictional. */
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const base = (process.env.CLINIC_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Run API smoke checks against a local development server.');
let passed = 0;
const pass = label => { passed++; process.stdout.write(`PASS ${label}\n`); };
async function request(path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, signal: AbortSignal.timeout(15000),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const contentType = response.headers.get('content-type') || '';
  const data = response.status === 204 ? undefined : contentType.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, contentType };
}
function expect(result, statuses, context) {
  assert.ok(statuses.includes(result.status), `${context}: HTTP ${result.status}; ${result.data?.detail || ''}`);
  return result.data;
}
function workDate(offset = 1) {
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  let date = new Date(`${today}T12:00:00+07:00`);
  date = new Date(date.getTime() + offset * 86400000);
  while (new Date(date.getTime() + 7 * 3600000).getUTCDay() === 0) date = new Date(date.getTime() + 86400000);
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
function testPdf() {
  const content = 'BT /F1 12 Tf 30 150 Td (TEST DOCUMENT - NOT A MEDICAL CERTIFICATE) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}

async function main() {
  const departments = expect(await request('/departments'), [200], 'department catalog');
  const doctors = expect(await request('/doctors'), [200], 'doctor catalog');
  assert.equal(departments.length, 22); assert.equal(doctors.length, 20);
  expect(await request('/appointments'), [401], 'anonymous appointments');
  pass('Public catalogs and authenticated patient boundary');
  const nonce = Date.now().toString().slice(-8);
  const password = ' Test-password-2026 ';
  const registration = (suffix, email) => ({ name: `Người thử nghiệm ${suffix}`, phone: `09${nonce.slice(0, 7)}${suffix}`,
    email, birthDate: '2000-01-15', password, confirmPassword: password, acceptedTerms: true });
  const firstInput = registration('1', `test-${nonce}@example.test`);
  const first = expect(await request('/auth/register', null, 'POST', firstInput), [200, 201], 'first registration');
  const second = expect(await request('/auth/register', null, 'POST', registration('2', '')), [200, 201], 'optional email registration');
  assert.ok(first.token && first.account.id !== second.account.id);
  assert.equal(second.account.patient.email, '');
  expect(await request('/auth/register', null, 'POST', firstInput), [409], 'duplicate identity');
  expect(await request('/auth/login', null, 'POST', { identifier: firstInput.phone, password: 'wrong-password' }), [401], 'wrong password');
  expect(await request('/auth/login', null, 'POST', { identifier: firstInput.phone, password }), [200], 'spaced password');
  pass('Register, optional email, duplicate identity and exact password authentication');
  assert.deepEqual(expect(await request('/appointments', first.token), [200], 'fresh account appointments'), []);
  assert.deepEqual(expect(await request('/certificates', second.token), [200], 'fresh account papers'), []);
  const date = workDate(1);
  const insuranceInput = { number: '0123456789', holderName: first.account.patient.name, birthDate: '2000-01-15',
    registrationPlace: 'Cơ sở kiểm thử', validFrom: `${date.slice(0, 4)}-01-01`, validTo: `${Number(date.slice(0, 4)) + 1}-12-31` };
  expect(await request('/insurance', first.token, 'PUT', { ...insuranceInput, number: '123' }), [400], 'insurance validation');
  const card = expect(await request('/insurance', first.token, 'PUT', insuranceInput), [200], 'save insurance');
  assert.equal(expect(await request('/insurance', second.token), [200], 'other account insurance'), null);
  pass('Empty new accounts and BHYT ownership/format validation');
  const availability = expect(await request(`/doctors/1/availability?date=${date}&service=in-person`, first.token), [200], 'availability');
  assert.ok(availability.length > 1, 'Development day needs at least two available slots.');
  const selectedTime = availability.includes('09:30') ? '09:30' : availability[0];
  const insurance = { cardId: card.id, ...insuranceInput, verification: 'unverified' };
  const appointmentInput = { doctorId: '1', service: 'in-person', date, time: selectedTime, reason: 'Kiểm tra quy trình đặt lịch.', insurance };
  const booking = expect(await request('/appointments', first.token, 'POST', { ...appointmentInput, fee: 1 }), [200, 201], 'book appointment');
  assert.equal(booking.fee, doctors.find(item => item.id === '1').fee);
  assert.equal(booking.insurance.verification, 'unverified');
  expect(await request('/appointments', second.token, 'POST', { ...appointmentInput, insurance: undefined }), [409], 'same doctor collision');
  expect(await request('/appointments', first.token, 'POST', { ...appointmentInput, doctorId: '2', insurance: undefined }), [409], 'patient collision');
  expect(await request(`/appointments/${booking.id}/cancel`, second.token, 'POST', { reason: 'Yêu cầu của người khác' }), [403, 404], 'foreign cancellation');
  pass('Server-authoritative price, doctor/patient collisions and cancellation ownership');
  const raceTimes = expect(await request(`/doctors/1/availability?date=${date}&service=in-person`, first.token), [200], 'race availability');
  assert.ok(raceTimes.length > 0);
  const raceInput = { doctorId: '1', service: 'in-person', date, time: raceTimes[0], reason: 'Kiểm thử đặt lịch đồng thời.' };
  const race = await Promise.all([first, second].map(account => request('/appointments', account.token, 'POST', raceInput)));
  assert.equal(race.filter(result => [200, 201].includes(result.status)).length, 1);
  assert.equal(race.filter(result => result.status === 409).length, 1);
  const winner = race.findIndex(result => [200, 201].includes(result.status));
  const raceBooking = race[winner].data;
  pass('Concurrent requests for one doctor slot produce exactly one booking');
  const bytes = testPdf();
  const attachment = expect(await request('/attachments', first.token, 'POST', { name: 'test-paper.pdf', mimeType: 'application/pdf', dataBase64: bytes.toString('base64') }), [200, 201], 'upload paper');
  const download = await request(`/files/${attachment.id}`, first.token);
  expect(download, [200], 'own file download');
  assert.equal(createHash('sha256').update(download.data).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
  expect(await request(`/files/${attachment.id}`, second.token), [403, 404], 'foreign file download');
  const paperInput = { title: 'Giấy kiểm thử', purpose: 'employment', issuer: 'Cơ sở kiểm thử', examDate: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10), notes: 'Không có giá trị y tế.', attachment };
  expect(await request('/certificates', second.token, 'POST', paperInput), [400, 403, 404], 'foreign attachment reference');
  const certificate = expect(await request('/certificates', first.token, 'POST', { ...paperInput, status: 'verified' }), [200, 201], 'save paper');
  assert.equal(certificate.status, 'unverified');
  assert.deepEqual(expect(await request('/certificates', second.token), [200], 'isolated certificate list'), []);
  pass('Authenticated upload/download, exact bytes, file ownership and unverified papers');
  expect(await request(`/certificates/${certificate.id}`, second.token, 'DELETE'), [403, 404], 'foreign paper deletion');
  expect(await request(`/certificates/${certificate.id}`, first.token, 'DELETE'), [200, 204], 'own paper deletion');
  expect(await request('/insurance', first.token, 'DELETE'), [200, 204], 'remove card');
  const bookings = expect(await request('/appointments', first.token), [200], 'stored appointments');
  assert.equal(bookings.find(item => item.id === booking.id).insurance.number, insuranceInput.number);
  pass('Delete permissions and appointment insurance snapshot survives card removal');
  expect(await request(`/appointments/${booking.id}/cancel`, first.token, 'POST', { reason: '' }), [400], 'cancellation reason');
  expect(await request(`/appointments/${booking.id}/cancel`, first.token, 'POST', { reason: 'Kết thúc kiểm thử ứng dụng.' }), [200], 'cancel booking');
  expect(await request(`/appointments/${raceBooking.id}/cancel`, [first, second][winner].token, 'POST', { reason: 'Kết thúc kiểm thử đồng thời.' }), [200], 'cancel race booking');
  expect(await request('/auth/logout', first.token, 'POST'), [200, 204], 'logout');
  expect(await request('/auth/me', first.token), [401], 'revoked token');
  pass('Cancellation reason, cleanup and server-side session revocation');
  process.stdout.write(`\n${passed} API smoke groups passed.\n`);
}
main().catch(error => { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; });
