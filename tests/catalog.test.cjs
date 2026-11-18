const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

const transpile = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
  });
  module._compile(result.outputText, filename);
};
require.extensions['.ts'] = transpile;
require.extensions['.tsx'] = transpile;

const { parseCatalog } = require('../src/state/CatalogProvider.tsx');
const { departments } = require('../src/data/departments.ts');
const { doctors } = require('../src/data/catalog.ts');
const clone = value => JSON.parse(JSON.stringify(value));

test('current catalog validates and normalizes optional doctor online flags', () => {
  const result = parseCatalog(clone(departments), clone(doctors));
  assert.equal(result.departments.length, 22);
  assert.equal(result.doctors.length, 20);
  assert.equal(result.doctors.find(doctor => doctor.id === '1').supportsOnline, true);
  assert.equal(result.doctors.find(doctor => doctor.id === '20').supportsOnline, false);
});

test('a catalog supplied by the server can add doctors independently of the static seed', () => {
  const dynamicDepartments = clone(departments);
  const dynamicDoctors = clone(doctors);
  dynamicDoctors.push({ ...dynamicDoctors[0], id: 'server-new-doctor', name: 'Bác sĩ từ máy chủ', fee: 400000 });
  dynamicDepartments[0].doctorIds.push('server-new-doctor');
  const result = parseCatalog(dynamicDepartments, dynamicDoctors);
  assert.equal(result.doctors.find(doctor => doctor.id === 'server-new-doctor').fee, 400000);
});

test('empty server catalogs remain empty rather than falling back to demo data', () => {
  const result = parseCatalog([], []);
  assert.deepEqual(result, { departments: [], doctors: [] });
});

test('duplicate ids, duplicate references, missing references and mismatched departments are rejected', () => {
  assert.throws(() => parseCatalog([...departments, departments[0]], doctors));
  assert.throws(() => parseCatalog(departments, [...doctors, doctors[0]]));
  const duplicate = clone(departments); duplicate[0].doctorIds.push('1');
  assert.throws(() => parseCatalog(duplicate, doctors));
  const missing = clone(departments); missing[0].doctorIds = ['unknown'];
  assert.throws(() => parseCatalog(missing, doctors));
  const mismatch = clone(departments); mismatch[0].name = 'Tên khoa khác';
  assert.throws(() => parseCatalog(mismatch, doctors));
  assert.throws(() => parseCatalog(departments, doctors.slice(1)));
});

test('malformed schema, flags, fees and descriptions are rejected', () => {
  for (const changes of [{ supportsOnline: 'true' }, { fee: -1 }, { rating: 5.5 }, { durationMinutes: 0 }, { bio: '' }, { education: 'invalid' }, { color: 'url(test)' }, { name: null }]) {
    const altered = clone(doctors); altered[0] = { ...altered[0], ...changes };
    assert.throws(() => parseCatalog(departments, altered));
  }
  for (const changes of [{ supportsOnline: null }, { description: '' }, { services: [null] }, { doctorIds: '1' }, { kind: 'unknown' }]) {
    const altered = clone(departments); altered[0] = { ...altered[0], ...changes };
    assert.throws(() => parseCatalog(altered, doctors));
  }
});
