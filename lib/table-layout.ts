export const DEFAULT_GRID_SIZE = 10
export const MIN_GRID_SIZE = 5
export const MAX_GRID_SIZE = 20
export const TABLE_LAYOUT_CELL_WIDTH = 78
export const TABLE_LAYOUT_CELL_HEIGHT = 72
export const TABLE_LAYOUT_PADDING_X = 14
export const TABLE_LAYOUT_PADDING_Y = 6
export const TABLE_LAYOUT_STAGE_HEIGHT = 102

type GridZone = { gridRows?: number; gridCols?: number }
type PositionedTable = { x: number; y: number }

// DEFAULT_GRID_SIZE เป็นค่า fallback เท่านั้น ไม่ใช่ขนาดขั้นต่ำของผังที่บันทึกแล้ว
export function getCombinedGrid(zones: GridZone[], tables: PositionedTable[]) {
  const configuredRows = zones.length
    ? Math.max(...zones.map((zone) => zone.gridRows ?? DEFAULT_GRID_SIZE))
    : DEFAULT_GRID_SIZE
  const configuredCols = zones.length
    ? Math.max(...zones.map((zone) => zone.gridCols ?? DEFAULT_GRID_SIZE))
    : DEFAULT_GRID_SIZE

  return getEffectiveGrid(
    { gridRows: configuredRows, gridCols: configuredCols },
    tables,
  )
}

// Canvas, เวที และระยะขอบใช้ขนาดจาก grid ชุดเดียวกัน เพื่อให้สัดส่วนสมดุลทุกขนาด
export function getTableLayoutDimensions(grid: { rows: number; cols: number }) {
  return {
    width: grid.cols * TABLE_LAYOUT_CELL_WIDTH + TABLE_LAYOUT_PADDING_X * 2,
    height: grid.rows * TABLE_LAYOUT_CELL_HEIGHT + TABLE_LAYOUT_PADDING_Y * 2,
  }
}

// ใช้ขนาดผังจากฐานข้อมูล แต่ขยายให้ครอบโต๊ะที่อยู่นอกผังเสมอ เพื่อไม่ให้โต๊ะหายจากหน้าจอ
export function getEffectiveGrid(zone: GridZone | undefined, tables: PositionedTable[]) {
  const rows = zone?.gridRows || DEFAULT_GRID_SIZE
  const cols = zone?.gridCols || DEFAULT_GRID_SIZE
  return {
    rows: Math.max(rows, ...tables.map((table) => table.y + 1)),
    cols: Math.max(cols, ...tables.map((table) => table.x + 1)),
  }
}

// จัดโต๊ะใหม่เป็นแถว เว้นช่องระหว่างโต๊ะเมื่อพื้นที่พอ และชิดกันเมื่อพื้นที่ไม่พอ
export function getResetPositions(count: number, rows: number, cols: number): PositionedTable[] {
  const spacedPerRow = Math.ceil(cols / 2)
  const spacing = spacedPerRow * Math.ceil(rows / 2) >= count ? 2 : 1
  const perRow = spacing === 2 ? spacedPerRow : cols
  return Array.from({ length: count }, (_, index) => ({
    x: (index % perRow) * spacing,
    y: Math.floor(index / perRow) * spacing,
  }))
}
