export const DEFAULT_GRID_SIZE = 10
export const MIN_GRID_SIZE = 5
export const MAX_GRID_SIZE = 20

type GridZone = { gridRows?: number; gridCols?: number }
type PositionedTable = { x: number; y: number }

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
