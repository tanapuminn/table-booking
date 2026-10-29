const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const typescript = require('typescript')

const sourcePath = path.join(__dirname, '..', 'lib', 'zone-colors.ts')
const compiled = typescript.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
}).outputText
const colorModule = new Module(sourcePath, module)
colorModule.filename = sourcePath
colorModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
colorModule._compile(compiled, sourcePath)
const { getZoneColor, isValidZoneColor } = colorModule.exports

test('uses the saved zone color', () => {
  assert.equal(getZoneColor('A', [{ id: 'A', color: '#12abEF' }]), '#12ABEF')
})

test('falls back to a stable preset for zones without a saved color', () => {
  const zones = [{ id: 'A' }, { id: 'B' }]
  assert.equal(getZoneColor('A', zones), '#C0267A')
  assert.equal(getZoneColor('B', zones), '#2563EB')
})

test('accepts only six-digit hex colors', () => {
  assert.equal(isValidZoneColor('#A1B2C3'), true)
  assert.equal(isValidZoneColor('#FFF'), false)
  assert.equal(isValidZoneColor('red'), false)
})
