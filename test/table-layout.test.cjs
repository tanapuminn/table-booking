const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const typescript = require('typescript')

const sourcePath = path.join(__dirname, '..', 'lib', 'table-layout.ts')
const compiled = typescript.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
}).outputText
const layoutModule = new Module(sourcePath, module)
layoutModule.filename = sourcePath
layoutModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
layoutModule._compile(compiled, sourcePath)
const { getCombinedGrid, getEffectiveGrid, getResetPositions, getTableLayoutDimensions } = layoutModule.exports

test('uses the saved zone grid and defaults to 10 x 10', () => {
  assert.deepEqual(getEffectiveGrid({ gridRows: 6, gridCols: 8 }, []), { rows: 6, cols: 8 })
  assert.deepEqual(getEffectiveGrid(undefined, []), { rows: 10, cols: 10 })
})

test('grows the grid so tables outside the saved size stay visible', () => {
  assert.deepEqual(getEffectiveGrid({ gridRows: 5, gridCols: 5 }, [{ x: 7, y: 2 }, { x: 1, y: 9 }]), { rows: 10, cols: 8 })
})

test('combined grid can be smaller than the default when every zone saves a smaller size', () => {
  assert.deepEqual(
    getCombinedGrid(
      [{ gridRows: 8, gridCols: 12 }, { gridRows: 8, gridCols: 12 }],
      [{ x: 7, y: 7 }],
    ),
    { rows: 8, cols: 12 },
  )
})

test('combined grid still grows to keep an out-of-bounds table visible', () => {
  assert.deepEqual(
    getCombinedGrid([{ gridRows: 8, gridCols: 12 }], [{ x: 11, y: 9 }]),
    { rows: 10, cols: 12 },
  )
})

test('canvas dimensions follow the configured grid without fixed minimums', () => {
  assert.deepEqual(getTableLayoutDimensions({ rows: 8, cols: 8 }), { width: 652, height: 588 })
  assert.deepEqual(getTableLayoutDimensions({ rows: 8, cols: 12 }), { width: 964, height: 588 })
})

test('reset spaces tables apart when there is room', () => {
  assert.deepEqual(getResetPositions(4, 10, 6), [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 2 }])
})

test('reset places every table, packing them when spaced rows do not fit', () => {
  const positions = getResetPositions(30, 5, 10)
  assert.equal(positions.length, 30)
  assert.deepEqual(positions[29], { x: 9, y: 2 })
  assert.ok(positions.every(({ x, y }) => x < 10 && y < 5))
})
