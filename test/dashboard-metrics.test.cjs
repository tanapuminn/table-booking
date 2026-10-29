const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const typescript = require('typescript')

const sourcePath = path.join(__dirname, '..', 'lib', 'dashboard-metrics.ts')
const compiled = typescript.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
}).outputText
const metricsModule = new Module(sourcePath, module)
metricsModule.filename = sourcePath
metricsModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
metricsModule._compile(compiled, sourcePath)
const { getZoneOccupancy, getBookingSummary } = metricsModule.exports

const zones = [{ id: 'A', isActive: true }, { id: 'B', isActive: false }]
const tables = [
  { zone: 'A', isActive: true, seats: new Array(9).fill({}) },
  { zone: 'A', isActive: true },
  { zone: 'A', isActive: false, seats: new Array(9).fill({}) },
  { zone: 'B', isActive: true, seats: new Array(9).fill({}) },
]
const bookings = [
  { status: 'confirmed', totalPrice: 900, seats: [{ zone: 'A', checkIn: { checkedIn: true } }, { zone: 'A' }, { zone: 'A' }] },
  { status: 'pending_payment', totalPrice: 600, seats: [{ zone: 'A' }, { zone: 'A' }] },
  { status: 'cancelled', totalPrice: 300, seats: [{ zone: 'A' }] },
  { status: 'confirmed', totalPrice: 2400, seats: new Array(9).fill({ zone: 'B' }) },
]

test('counts zone capacity from active tables instead of a fixed number', () => {
  const [zoneA, zoneB] = getZoneOccupancy(zones, tables, bookings)
  assert.equal(zoneA.capacity, 18)
  assert.equal(zoneB.capacity, 9)
})

test('separates confirmed seats from seats held while awaiting payment', () => {
  const [zoneA] = getZoneOccupancy(zones, tables, bookings)
  assert.equal(zoneA.confirmedSeats, 3)
  assert.equal(zoneA.heldSeats, 2)
})

test('summarises confirmed revenue, seats, check-ins and pending payments', () => {
  assert.deepEqual(getBookingSummary(bookings), {
    confirmedRevenue: 3300,
    confirmedBookings: 2,
    confirmedSeats: 12,
    checkedInSeats: 1,
    pendingPaymentBookings: 1,
    pendingPaymentSeats: 2,
  })
})
