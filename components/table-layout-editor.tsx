"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Grid, Move, Plus, Power, RotateCcw, Trash2, X } from "lucide-react"
import { useBooking, type TablePosition } from "./booking-provider"
import { useToast } from "@/hooks/use-toast"
import { StatCard } from "@/components/stat-card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { SEATS_PER_TABLE } from "@/lib/dashboard-metrics"
import { MAX_GRID_SIZE, MIN_GRID_SIZE, getEffectiveGrid, getResetPositions } from "@/lib/table-layout"

const CELL_SIZE = 64

export function TableLayoutEditor() {
  const { tablePositions, updateTablePosition, addTable, removeTable, toggleTableActive, zoneConfigs, updateZoneConfig } = useBooking()
  const { toast } = useToast()
  const [selectedZone, setSelectedZone] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [draggedTable, setDraggedTable] = useState<TablePosition | null>(null)
  const [busyCell, setBusyCell] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [gridDialogOpen, setGridDialogOpen] = useState(false)
  const [gridDraft, setGridDraft] = useState({ rows: "", cols: "" })
  const [gridError, setGridError] = useState<string | null>(null)
  const [isSavingGrid, setIsSavingGrid] = useState(false)

  // เลือกโซนแรกเมื่อโหลดข้อมูลเสร็จ หรือเมื่อโซนที่เลือกถูกลบไป
  useEffect(() => {
    if (zoneConfigs.length > 0 && !zoneConfigs.some((zone) => zone.id === selectedZone)) {
      setSelectedZone(zoneConfigs[0].id)
    }
  }, [zoneConfigs, selectedZone])

  useEffect(() => {
    setSelectedTableId(null)
  }, [selectedZone, isEditMode])

  const activeZone = zoneConfigs.find((zone) => zone.id === selectedZone)
  const zoneTables = tablePositions.filter((table) => table.zone === selectedZone)
  const grid = getEffectiveGrid(activeZone, zoneTables)
  const selectedTable = zoneTables.find((table) => table.id === selectedTableId) ?? null
  const seatCount = (table: TablePosition) => table.seats?.length || SEATS_PER_TABLE
  const activeTables = zoneTables.filter((table) => table.isActive)

  const moveTable = async (table: TablePosition, x: number, y: number) => {
    if (zoneTables.some((other) => other.x === x && other.y === y && other.id !== table.id)) {
      toast({ title: "ย้ายไม่ได้", description: "ตำแหน่งนี้มีโต๊ะอื่นอยู่แล้ว", variant: "destructive" })
      return
    }
    setBusyCell(`${x}-${y}`)
    try {
      await updateTablePosition(table.id, x, y)
      toast({ title: `ย้าย${table.name}แล้ว` })
      setSelectedTableId(null)
    } catch {
      toast({ title: "ย้ายโต๊ะไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" })
    } finally {
      setBusyCell(null)
    }
  }

  const handleCellClick = async (x: number, y: number) => {
    if (!isEditMode || busyCell) return
    const tableAtCell = zoneTables.find((table) => table.x === x && table.y === y)

    // แตะโต๊ะเพื่อเลือก แตะซ้ำเพื่อยกเลิก
    if (tableAtCell) {
      setSelectedTableId((current) => (current === tableAtCell.id ? null : tableAtCell.id))
      return
    }
    // มีโต๊ะที่เลือกอยู่ แตะช่องว่างเพื่อย้ายไปที่นั่น
    if (selectedTable) {
      await moveTable(selectedTable, x, y)
      return
    }

    setBusyCell(`${x}-${y}`)
    try {
      const table = await addTable(selectedZone, x, y)
      toast({ title: `เพิ่ม${table.name}แล้ว` })
    } catch (error) {
      toast({
        title: "เพิ่มโต๊ะไม่สำเร็จ",
        description: error instanceof Error ? error.message : "กรุณาลองอีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setBusyCell(null)
    }
  }

  const handleDrop = async (x: number, y: number) => {
    const table = draggedTable
    setDraggedTable(null)
    if (!table || !isEditMode || (table.x === x && table.y === y)) return
    await moveTable(table, x, y)
  }

  const handleRemoveTable = async (table: TablePosition) => {
    try {
      await removeTable(table.id)
      setSelectedTableId(null)
      toast({ title: `ลบ${table.name}แล้ว` })
    } catch (error) {
      toast({
        title: "ลบโต๊ะไม่สำเร็จ",
        description: axios.isAxiosError(error) && error.response?.status === 409
          ? "โต๊ะนี้มีประวัติการจองที่เกี่ยวข้อง จึงไม่สามารถลบได้"
          : "ไม่สามารถลบโต๊ะได้ กรุณาลองอีกครั้ง",
        variant: "destructive",
      })
    }
  }

  const handleToggleTableActive = async (table: TablePosition) => {
    try {
      const updatedTable = await toggleTableActive(table.id)
      toast({ title: `${updatedTable.isActive ? "เปิด" : "ปิด"}${table.name}แล้ว` })
    } catch {
      toast({ title: "เปลี่ยนสถานะโต๊ะไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" })
    }
  }

  const resetLayout = async () => {
    const sortedTables = [...zoneTables].sort((a, b) => a.y - b.y || a.x - b.x)
    const positions = getResetPositions(sortedTables.length, grid.rows, grid.cols)
    setIsResetting(true)
    try {
      await Promise.all(sortedTables.map((table, index) => updateTablePosition(table.id, positions[index].x, positions[index].y)))
      toast({ title: "จัดผังใหม่แล้ว", description: `เรียงโต๊ะทั้งหมดใน${activeZone?.name ?? "โซนนี้"}ใหม่` })
    } catch {
      toast({ title: "จัดผังใหม่ไม่สำเร็จ", description: "มีบางตำแหน่งที่บันทึกไม่ได้ กรุณาลองอีกครั้ง", variant: "destructive" })
    } finally {
      setIsResetting(false)
    }
  }

  const openGridDialog = () => {
    setGridDraft({ rows: String(grid.rows), cols: String(grid.cols) })
    setGridError(null)
    setGridDialogOpen(true)
  }

  const saveGridSize = async () => {
    const rows = Number(gridDraft.rows)
    const cols = Number(gridDraft.cols)
    const isValid = (value: number) => Number.isInteger(value) && value >= MIN_GRID_SIZE && value <= MAX_GRID_SIZE
    if (!isValid(rows) || !isValid(cols)) {
      setGridError(`กรอกจำนวนเต็ม ${MIN_GRID_SIZE}–${MAX_GRID_SIZE}`)
      return
    }
    const outside = zoneTables.filter((table) => table.x >= cols || table.y >= rows).length
    if (outside > 0) {
      setGridError(`มี ${outside} โต๊ะที่จะอยู่นอกผังใหม่ ย้ายโต๊ะเข้ามาก่อนแล้วลองอีกครั้ง`)
      return
    }
    setIsSavingGrid(true)
    try {
      await updateZoneConfig(selectedZone, { gridRows: rows, gridCols: cols })
      setGridDialogOpen(false)
      toast({ title: "บันทึกขนาดผังแล้ว", description: `${rows} แถว × ${cols} คอลัมน์ · ใช้กับแอดมินทุกเครื่อง` })
    } catch (error) {
      setGridError(axios.isAxiosError(error) && error.response?.data?.message ? String(error.response.data.message) : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally {
      setIsSavingGrid(false)
    }
  }

  const hint = !isEditMode
    ? "เปิดโหมดแก้ไขเพื่อเพิ่ม ย้าย หรือปิดโต๊ะ"
    : selectedTable
      ? `แตะช่องว่างเพื่อย้าย${selectedTable.name} หรือแตะโต๊ะเดิมเพื่อยกเลิก`
      : "แตะช่องว่างเพื่อเพิ่มโต๊ะ · แตะโต๊ะเพื่อเลือกแล้วย้าย · ลากวางด้วยเมาส์ได้"

  if (zoneConfigs.length === 0) {
    return <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">ยังไม่มีโซน เพิ่มโซนในหน้า “โซนและราคา” ก่อน</div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="เลือกโซน">
            {zoneConfigs.map((zone) => {
              const isActive = zone.id === selectedZone
              const count = tablePositions.filter((table) => table.zone === zone.id).length
              return (
                <button
                  key={zone.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedZone(zone.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "border-primary/30 bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
                    !zone.isActive && "opacity-60"
                  )}
                >
                  {zone.name}
                  <span className="tabular-nums text-xs">{count}</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isEditMode} onCheckedChange={setIsEditMode} id="edit-mode" />
            <Label htmlFor="edit-mode" className="text-sm font-medium">โหมดแก้ไข</Label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <p className="mr-auto flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Move className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{hint}</span>
          </p>
          {activeZone && !activeZone.isActive && (
            <span className="rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">โซนนี้ปิดให้บริการ</span>
          )}
          {isEditMode && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openGridDialog}>
                <Grid className="h-4 w-4" aria-hidden="true" />
                ขนาดผัง {grid.rows}×{grid.cols}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={isResetting || zoneTables.length === 0}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {isResetting ? "กำลังจัด..." : "จัดผังใหม่"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>จัดผัง{activeZone?.name}ใหม่?</AlertDialogTitle>
                    <AlertDialogDescription>
                      โต๊ะทั้ง {zoneTables.length} โต๊ะจะถูกเรียงเป็นแถวใหม่ตั้งแต่มุมซ้ายบน ตำแหน่งเดิมจะหายไป
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void resetLayout()}>จัดผังใหม่</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>

        {/* แถบคำสั่งของโต๊ะที่เลือก */}
        {isEditMode && selectedTable && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="mr-auto text-sm">
              <span className="font-semibold">{selectedTable.name}</span>
              <span className="text-muted-foreground"> · {selectedTable.isActive ? "เปิดขาย" : "ปิดอยู่"} · {seatCount(selectedTable)} ที่นั่ง</span>
            </span>
            <Button variant="outline" size="sm" className="gap-1.5 bg-card" onClick={() => void handleToggleTableActive(selectedTable)}>
              <Power className="h-4 w-4" aria-hidden="true" />
              {selectedTable.isActive ? "ปิดโต๊ะ" : "เปิดโต๊ะ"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-destructive/40 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />ลบ
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบ{selectedTable.name}?</AlertDialogTitle>
                  <AlertDialogDescription>โต๊ะจะถูกลบออกจากผังและกู้คืนไม่ได้ ถ้าโต๊ะนี้มีประวัติการจอง ระบบจะไม่อนุญาตให้ลบ</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => void handleRemoveTable(selectedTable)}>ลบโต๊ะ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedTableId(null)} aria-label="ยกเลิกการเลือกโต๊ะ">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border bg-card p-4">
        <div className="mx-auto mb-3 max-w-md rounded-b-[40px] border-x border-b border-primary/20 bg-primary/5 py-2 text-center text-sm font-semibold text-primary">เวที</div>
        <div
          className="mx-auto grid w-max gap-1"
          style={{ gridTemplateColumns: `repeat(${grid.cols}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${grid.rows}, ${CELL_SIZE}px)` }}
        >
          {Array.from({ length: grid.rows * grid.cols }, (_, index) => {
            const x = index % grid.cols
            const y = Math.floor(index / grid.cols)
            const table = zoneTables.find((item) => item.x === x && item.y === y)
            const isSelected = table && table.id === selectedTableId
            const isBusy = busyCell === `${x}-${y}`
            const isMoveTarget = isEditMode && Boolean(selectedTable) && !table

            // ใช้ div แทน button เพราะ Firefox ไม่ให้ลาก element ที่อยู่ใน button
            return (
              <div
                key={`${x}-${y}`}
                role={isEditMode ? "button" : undefined}
                tabIndex={isEditMode ? 0 : undefined}
                onClick={() => void handleCellClick(x, y)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    void handleCellClick(x, y)
                  }
                }}
                onDragOver={(event) => isEditMode && event.preventDefault()}
                onDrop={() => void handleDrop(x, y)}
                aria-label={table ? `${table.name} ${table.isActive ? "เปิดขาย" : "ปิดอยู่"}` : `ช่องว่าง แถว ${y + 1} คอลัมน์ ${x + 1}`}
                className={cn(
                  "group relative flex items-center justify-center rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isEditMode && "cursor-pointer",
                  !table && "border border-dashed border-border/70",
                  !table && isEditMode && "hover:border-primary/50 hover:bg-primary/5",
                  isMoveTarget && "border-primary/40 bg-primary/[0.03]"
                )}
              >
                {table ? (
                  <span
                    draggable={isEditMode}
                    onDragStart={() => setDraggedTable(table)}
                    onDragEnd={() => setDraggedTable(null)}
                    title={`${table.name} (${x + 1}, ${y + 1})`}
                    className={cn(
                      "flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full border-2 leading-tight transition-all",
                      table.isActive ? "border-primary/40 bg-primary/10 text-foreground" : "border-dashed border-muted-foreground/40 bg-muted text-muted-foreground",
                      isEditMode && "cursor-grab active:cursor-grabbing group-hover:scale-105",
                      isSelected && "ring-2 ring-primary ring-offset-2",
                      draggedTable?.id === table.id && "opacity-40"
                    )}
                  >
                    <span className="max-w-[46px] truncate text-xs font-bold">{table.name}</span>
                    <span className="text-[10px]">{table.isActive ? `${seatCount(table)} ที่` : "ปิด"}</span>
                  </span>
                ) : isBusy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                ) : (
                  isEditMode && <Plus className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="โต๊ะทั้งหมด" value={zoneTables.length} suffix="โต๊ะ" />
        <StatCard label="เปิดขาย" value={activeTables.length} suffix="โต๊ะ" />
        <StatCard label="ที่นั่งที่เปิดขาย" value={activeTables.reduce((sum, table) => sum + seatCount(table), 0)} suffix="ที่นั่ง" />
      </div>

      <Dialog open={gridDialogOpen} onOpenChange={(open) => !isSavingGrid && setGridDialogOpen(open)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ขนาดผัง{activeZone?.name}</DialogTitle>
            <DialogDescription>บันทึกไว้ที่ระบบ แอดมินทุกเครื่องจะเห็นขนาดเดียวกัน</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grid-rows">จำนวนแถว</Label>
              <Input id="grid-rows" type="number" inputMode="numeric" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE} value={gridDraft.rows}
                onChange={(event) => { setGridDraft((previous) => ({ ...previous, rows: event.target.value })); setGridError(null) }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid-cols">จำนวนคอลัมน์</Label>
              <Input id="grid-cols" type="number" inputMode="numeric" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE} value={gridDraft.cols}
                onChange={(event) => { setGridDraft((previous) => ({ ...previous, cols: event.target.value })); setGridError(null) }} />
            </div>
          </div>
          <p className={cn("text-sm", gridError ? "text-destructive" : "text-muted-foreground")} role={gridError ? "alert" : undefined}>
            {gridError ?? `กำหนดได้ ${MIN_GRID_SIZE}–${MAX_GRID_SIZE} ช่อง`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGridDialogOpen(false)} disabled={isSavingGrid}>ยกเลิก</Button>
            <Button onClick={() => void saveGridSize()} disabled={isSavingGrid}>{isSavingGrid ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
