const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const typescript = require('typescript')

const sourcePath = path.join(__dirname, '..', 'lib', 'table-naming.ts')
const compiled = typescript.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
}).outputText
const namingModule = new Module(sourcePath, module)
namingModule.filename = sourcePath
namingModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
namingModule._compile(compiled, sourcePath)
const { getNextTableName } = namingModule.exports

test('uses the highest existing table suffix instead of the table count', () => {
  const tables = [
    { zone: 'A', name: 'A1' },
    { zone: 'A', name: 'A3' },
    { zone: 'B', name: 'B9' },
  ]

  assert.equal(getNextTableName('A', tables), 'A4')
})

test('starts at one and ignores non-standard names', () => {
  assert.equal(getNextTableName('C', []), 'C1')
  assert.equal(getNextTableName('C', [{ zone: 'C', name: 'VIP' }]), 'C1')
})
