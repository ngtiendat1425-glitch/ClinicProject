const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

// Transpile the actual domain modules in memory; no generated files or extra
// runtime dependency are needed on the project's Node runtime.
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};
const clinic = require('../src/data/clinic.ts');
const { isClinicState } = require('../src/state/storage.ts');
const { parseAppointment, parsePatientCollections } = require('../src/services/contracts.ts');

const NOW = Date.parse('2026-11-17T07:00:00+07:00');
const input = (changes = {}) => ({ doctorId: '1', service: 'in-person', date: '2026-11-18', time: '09:30', reason: 'Kiểm tra sức khỏe định kỳ', ...changes });
const appointment = (changes = {}) => ({
  id: 'test-appointment', ...input(), durationMinutes: 30, fee: 250000, status: 'confirmed',
  createdAt: new Date(NOW).toISOString(), ...changes,
});

test('Vietnam date keys remain correct when device time is UTC or another timezone', () => {
  assert.equal(clinic.dateKey(new Date('2026-11-17T18:00:00Z')), '2026-11-18');
  assert.equal(clinic.appointmentStart(input()), Date.parse('2026-11-18T02:30:00Z'));
  assert.equal(clinic.formatDate('2026-11-18'), 'Thứ Tư, 18/11/2026');
});

test('invalid dates and overflow dates are rejected', () => {
  for (const date of ['2026-02-29', '2026-11-31', '2026-13-01', '18/11/2026']) {
    assert.equal(clinic.isValidDate(date), false);
    assert.ok(clinic.validateBooking(input({ date }), [], NOW));
  }
  assert.equal(clinic.isValidDate('2028-02-29'), true);
});

test('accent-insensitive search includes Vietnamese đ and capitals', () => {
  assert.equal(clinic.normalizeSearch('  NGUYỄN Tiến Đạt  '), 'nguyen tien dat');
  assert.ok(clinic.normalizeSearch(clinic.doctors[0].name).includes('minh anh'));
  assert.equal(clinic.normalizeSearch('Nội tổng quát'), 'noi tong quat');
});

test('valid booking is accepted and business slots fit their shift duration', () => {
  assert.equal(clinic.validateBooking(input(), [], NOW), null);
  const slots = clinic.getAvailableTimes('1', '2026-11-18', 'in-person', [], NOW);
  assert.ok(slots.includes('08:30'));
  assert.ok(slots.includes('11:00'));
  assert.ok(slots.includes('16:00'));
  assert.ok(!slots.includes('11:30'));
  assert.ok(!slots.includes('12:00'));
});

test('future-only slots and booking checks both reject a past time', () => {
  const later = Date.parse('2026-11-18T10:01:00+07:00');
  assert.ok(!clinic.getAvailableTimes('1', '2026-11-18', 'online', [], later).includes('10:00'));
  assert.ok(clinic.validateBooking(input({ time: '10:00' }), [], later));
  assert.ok(clinic.validateBooking(input({ date: '2026-11-16' }), [], NOW));
});

test('Sunday, lunch breaks, invalid doctor and bookings beyond the horizon fail', () => {
  assert.deepEqual(clinic.getAvailableTimes('1', '2026-11-22', 'in-person', [], NOW), []);
  assert.ok(clinic.validateBooking(input({ date: '2026-11-22' }), [], NOW));
  assert.ok(clinic.validateBooking(input({ time: '12:00' }), [], NOW));
  assert.ok(clinic.validateBooking(input({ doctorId: 'missing' }), [], NOW));
  assert.ok(clinic.validateBooking(input({ date: '2027-05-18' }), [], NOW));
});

test('same slot cannot be booked twice', () => {
  const existing = appointment();
  assert.ok(clinic.validateBooking(input(), [existing], NOW));
  assert.ok(!clinic.getAvailableTimes('1', existing.date, 'in-person', [existing], NOW).includes(existing.time));
});

test('patient appointments also conflict across different doctors and modes', () => {
  const existing = appointment({ doctorId: '3', service: 'online', time: '09:30', durationMinutes: 20 });
  assert.ok(clinic.validateBooking(input(), [existing], NOW));
  assert.equal(clinic.validateBooking(input({ time: '10:00' }), [existing], NOW), null);
});

test('interval overlap detects partial overlap, while adjacent appointments are allowed', () => {
  const longEncounter = appointment({ time: '09:30', durationMinutes: 60 });
  assert.ok(clinic.validateBooking(input({ time: '10:00' }), [longEncounter], NOW));
  assert.equal(clinic.validateBooking(input({ time: '10:30' }), [longEncounter], NOW), null);
  assert.equal(clinic.validateBooking(input({ time: '09:00' }), [longEncounter], NOW), null);
});

test('a pending appointment blocks the slot until its hold expires exactly', () => {
  const holdExpiresAt = new Date(NOW + 60_000).toISOString();
  const pending = appointment({ status: 'pending', holdExpiresAt });
  assert.ok(clinic.validateBooking(input(), [pending], NOW));
  assert.equal(clinic.validateBooking(input(), [pending], NOW + 60_000), null);
  assert.equal(clinic.expirePendingAppointments([pending], NOW + 60_000)[0].status, 'expired');
});

test('expiration preserves completed/confirmed bookings and avoids unnecessary updates', () => {
  const entries = [appointment(), appointment({ id: 'completed', status: 'completed' })];
  assert.equal(clinic.expirePendingAppointments(entries, NOW), entries);
  const malformed = appointment({ status: 'pending' });
  assert.equal(clinic.expirePendingAppointments([malformed], NOW)[0].status, 'expired');
});

test('cancellation requires a reason and cannot cancel past or completed bookings', () => {
  assert.equal(clinic.validateCancellation(appointment(), 'Bận công việc', NOW), null);
  assert.ok(clinic.validateCancellation(appointment(), '', NOW));
  assert.ok(clinic.validateCancellation(appointment({ status: 'completed' }), 'Bận công việc', NOW));
  assert.ok(clinic.validateCancellation(appointment({ date: '2026-11-16' }), 'Bận công việc', NOW));
  assert.ok(clinic.validateCancellation(undefined, 'Bận công việc', NOW));
});

test('cancelled and completed appointments release their slot for a new booking', () => {
  for (const status of ['cancelled', 'completed', 'expired']) {
    assert.equal(clinic.validateBooking(input(), [appointment({ status })], NOW), null);
  }
});

test('service pricing and duration can be snapshotted at booking', () => {
  const doctor = clinic.doctors[0];
  assert.equal(clinic.serviceDuration(doctor, 'in-person'), 30);
  assert.equal(clinic.serviceDuration(doctor, 'online'), 20);
  assert.equal(clinic.serviceFee(doctor, 'in-person'), 250000);
  assert.equal(clinic.serviceFee(doctor, 'online'), 200000);
});

test('booking reason and service inputs are validated', () => {
  assert.ok(clinic.validateBooking(input({ reason: '    ' }), [], NOW));
  assert.ok(clinic.validateBooking(input({ reason: 'a'.repeat(1001) }), [], NOW));
  assert.ok(clinic.validateBooking(input({ service: 'video-other' }), [], NOW));
});

test('demo seed uses future dates and contains a completed sample result', () => {
  for (const date of ['2026-11-17T19:00:00Z', '2026-11-21T19:00:00Z', '2026-12-31T19:00:00Z']) {
    const now = Date.parse(date);
    const seed = clinic.createDemoState(now);
    const confirmed = seed.appointments.filter((item) => item.status === 'confirmed');
    assert.ok(confirmed.every((item) => clinic.appointmentStart(item) > now));
    assert.ok(seed.appointments.every((item) => Date.parse(item.createdAt) < clinic.appointmentStart(item)));
    assert.ok(seed.appointments.every((item) => clinic.weekday(item.date) !== 0));
    assert.ok(seed.appointments.some((item) => item.status === 'completed' && item.result));
    assert.ok(isClinicState(seed));
  }
});

test('profile validation rejects invalid phone, date and email', () => {
  const patient = clinic.createDemoState(NOW).patient;
  assert.equal(clinic.validatePatient(patient, NOW), null);
  assert.ok(clinic.validatePatient({ ...patient, phone: '1234' }, NOW));
  assert.ok(clinic.validatePatient({ ...patient, email: 'missing-at.example.com' }, NOW));
  assert.ok(clinic.validatePatient({ ...patient, birthDate: '2030-01-01' }, NOW));
  assert.ok(clinic.validatePatient({ ...patient, birthDate: '2005-02-30' }, NOW));
});

test('stored state round-trips and malformed snapshots fail before hydration', () => {
  const seed = clinic.createDemoState(NOW);
  assert.ok(isClinicState(JSON.parse(JSON.stringify(seed))));
  assert.equal(isClinicState({ ...seed, version: 2 }), false);
  assert.equal(isClinicState({ ...seed, appointments: [{ ...seed.appointments[0], doctorId: 'missing' }] }), false);
  assert.equal(isClinicState({ ...seed, patient: { name: 'Only name' } }), false);
  assert.equal(isClinicState({ ...seed, notifications: [{ ...seed.notifications[0], appointmentId: 'not-an-id' }] }), false);
  assert.equal(isClinicState({ ...seed, appointments: [seed.appointments[0], seed.appointments[0]] }), false);
  assert.equal(isClinicState({ ...seed, appointments: [{ ...seed.appointments[0], result: { summary: 42 } }] }), false);
});

test('department catalog references real demo doctors and separates support departments', () => {
  assert.equal(clinic.departments.length, 22);
  assert.equal(new Set(clinic.departments.map(item => item.id)).size, clinic.departments.length);
  assert.equal(clinic.doctors.length, 20);
  for (const department of clinic.departments) {
    assert.ok(department.doctorIds.every(id => clinic.getDoctor(id)?.specialty === department.name));
    if (department.kind === 'clinical') assert.ok(department.doctorIds.length > 0);
    else assert.equal(department.doctorIds.length, 0);
  }
  assert.equal(clinic.getDoctor('20').supportsOnline, false);
  assert.deepEqual(clinic.getAvailableTimes('20', '2026-11-18', 'online', [], NOW), []);
});

test('new registered patient starts without other accounts demo encounters', () => {
  const patient = clinic.createDemoState(NOW).patient;
  const state = clinic.createPatientState(patient);
  assert.deepEqual(state.appointments, []);
  assert.deepEqual(state.notifications, []);
  assert.notEqual(state.patient, patient);
  assert.ok(isClinicState(state));
});

test('insurance metadata is snapshotted without changing price or asserting coverage', () => {
  const insurance = { cardId: 'card-example', number: '0123456789', holderName: 'Nguyễn Tiến Đạt',
    registrationPlace: 'Cơ sở minh họa', validFrom: '2026-01-01', validTo: '2026-12-31', verification: 'unverified' };
  assert.equal(clinic.validateBooking(input({ insurance }), [], NOW), null);
  assert.ok(clinic.validateBooking(input({ insurance: { ...insurance, validTo: '2026-10-01' } }), [], NOW));
  assert.ok(clinic.validateBooking(input({ insurance: { ...insurance, verification: 'verified' } }), [], NOW));
  const seed = clinic.createDemoState(NOW);
  seed.appointments[0].insurance = insurance;
  assert.ok(isClinicState(seed));
  seed.appointments[0].insurance.verification = 'verified';
  assert.equal(isClinicState(seed), false);
});

test('API appointment parsing supports server catalog ids and rejects unsafe status/schema', () => {
  const remote = appointment({ doctorId: 'server-doctor-21' });
  assert.equal(parseAppointment(remote).doctorId, 'server-doctor-21');
  assert.throws(() => parseAppointment({ ...remote, status: 'unknown' }));
  assert.throws(() => parseAppointment({ ...remote, date: '2026-02-30' }));
  assert.throws(() => parseAppointment({ ...remote, fee: '250000' }));
  assert.throws(() => parseAppointment({ ...remote, result: { summary: 42 } }));
  assert.throws(() => parseAppointment({ ...remote, status: 'pending', holdExpiresAt: undefined }));
});

test('API patient collections fail closed on malformed lists or duplicate ids', () => {
  assert.deepEqual(parsePatientCollections([appointment()], []), { appointments: [appointment()], notifications: [] });
  assert.throws(() => parsePatientCollections({ content: [] }, []));
  assert.throws(() => parsePatientCollections([appointment(), appointment()], []));
  assert.throws(() => parsePatientCollections([], [{ id: 'notice', title: 'Update', body: 'Hello', read: 'false', createdAt: new Date(NOW).toISOString() }]));
});
