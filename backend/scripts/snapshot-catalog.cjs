const fs = require('node:fs');
const path = require('node:path');
const ts = require('../../node_modules/typescript');
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, filename);
};
const { doctors } = require('../../src/data/catalog.ts');
const { departments } = require('../../src/data/departments.ts');
const directory = path.join(__dirname, '../src/main/resources/catalog');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'doctors.json'), JSON.stringify(doctors, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'departments.json'), JSON.stringify(departments, null, 2) + '\n');
