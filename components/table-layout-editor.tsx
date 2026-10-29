"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Eye, Grid3X3, MousePointer2, Move, Plus, Trash2, X } from "lucide-react"
import { useBooking, type TablePosition, type ZoneConfig } from "./booking-provider"
import { useToast } from "@/hooks/use-toast"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { apiBaseUrl as baseURL } from "@/lib/api"
import { SEATS_PER_TABLE } from "@/lib/dashboard-metrics"
import { getZoneColor, ZONE_COLOR_PRESETS } from "@/lib/zone-colors"
import {
  DEFAULT_GRID_SIZE,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  TABLE_LAYOUT_CELL_HEIGHT,
  TABLE_LAYOUT_CELL_WIDTH,
  TABLE_LAYOUT_PADDING_X,
  TABLE_LAYOUT_PADDING_Y,
  TABLE_LAYOUT_STAGE_HEIGHT,
  getCombinedGrid,
  getTableLayoutDimensions,
} from "@/lib/table-layout"

const CELL_WIDTH = TABLE_LAYOUT_CELL_WIDTH
const CELL_HEIGHT = TABLE_LAYOUT_CELL_HEIGHT
const STAGE_HEIGHT = TABLE_LAYOUT_STAGE_HEIGHT
const EMPTY_ZONE = { id: "", name: "", description: "", color: ZONE_COLOR_PRESETS[0] as string }

function colorOf(zoneId: string, zones: ZoneConfig[]) {
  return getZoneColor(zoneId, zones)
}

function seatCount(table: TablePosition) {
  return table.seats?.length || SEATS_PER_TABLE
}

function TableDot({ table, zones, selected, editing, onSelect, onDragStart, onDragEnd }: {
  table: TablePosition
  zones: ZoneConfig[]
  selected: boolean
  editing: boolean
  onSelect: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const zone = zones.find((item) => item.id === table.zone)
  const available = table.seats?.filter((seat) => !seat.isBooked).length ?? seatCount(table)
  const full = available === 0
  return (
    <button
      type="button"
      draggable={editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(event) => { event.stopPropagation(); onSelect() }}
      className={cn(
        "absolute z-10 flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full border-2 bg-white text-center shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        editing && "cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md",
        !table.isActive && "border-dashed bg-muted text-muted-foreground",
        full && table.isActive && "border-slate-400 bg-slate-400 text-white",
        selected && "z-20 ring-2 ring-primary ring-offset-2",
      )}
      style={{ left: table.x * CELL_WIDTH + 20, top: table.y * CELL_HEIGHT + 12, borderColor: table.isActive && !full ? colorOf(table.zone, zones) : undefined }}
      aria-label={`${table.name} ${zone?.name ?? table.zone}`}
    >
      <span className="max-w-[58px] truncate text-sm font-bold">{table.name}</span>
      <span className="text-[10px] leading-3">{!table.isActive ? "ปิด" : full ? "เต็ม" : zone?.allowIndividualSeatBooking ? `ว่าง ${available}` : "ทั้งโต๊ะ"}</span>
    </button>
  )
}

export function TableLayoutEditor() {
  const { tablePositions, updateTablePosition, addTable, removeTable, toggleTableActive, zoneConfigs, addZoneConfig, updateZoneConfig, removeZoneConfig } = useBooking()
  const { toast } = useToast()
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [toolMode, setToolMode] = useState<"select" | "add">("select")
  const [selectedZone, setSelectedZone] = useState("")
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [draggedTable, setDraggedTable] = useState<TablePosition | null>(null)
  const [busyCell, setBusyCell] = useState<string | null>(null)
  const [gridOpen, setGridOpen] = useState(false)
  const [gridDraft, setGridDraft] = useState({ rows: String(DEFAULT_GRID_SIZE), cols: String(DEFAULT_GRID_SIZE) })
  const [gridError, setGridError] = useState<string | null>(null)
  const [savingGrid, setSavingGrid] = useState(false)
  const [addZoneOpen, setAddZoneOpen] = useState(false)
  const [zoneDraft, setZoneDraft] = useState(EMPTY_ZONE)
  const [creatingZone, setCreatingZone] = useState(false)
  const [deletingZone, setDeletingZone] = useState(false)

  useEffect(() => {
    if (zoneConfigs.length && !zoneConfigs.some((zone) => zone.id === selectedZone)) setSelectedZone(zoneConfigs[0].id)
  }, [zoneConfigs, selectedZone])

  const grid = getCombinedGrid(zoneConfigs, tablePositions)
  const activeZone = zoneConfigs.find((zone) => zone.id === selectedZone)
  const selectedTable = tablePositions.find((table) => table.id === selectedTableId) ?? null
  const activeZones = zoneConfigs.filter((zone) => zone.isActive)
  const previewTables = tablePositions.filter((table) => table.isActive && activeZones.some((zone) => zone.id === table.zone))
  const visibleTables = mode === "preview" ? previewTables : tablePositions
  const { width: canvasWidth, height: canvasHeight } = getTableLayoutDimensions(grid)
  const summary = useMemo(() => ({
    all: tablePositions.length,
    active: tablePositions.filter((table) => table.isActive).length,
    seats: tablePositions.filter((table) => table.isActive).reduce((sum, table) => sum + seatCount(table), 0),
  }), [tablePositions])

  const moveTable = async (table: TablePosition, x: number, y: number) => {
    if (tablePositions.some((other) => other.x === x && other.y === y && other.id !== table.id)) {
      toast({ title: "ย้ายไม่ได้", description: "ตำแหน่งนี้มีโต๊ะอื่นอยู่แล้ว", variant: "destructive" })
      return
    }
    setBusyCell(`${x}-${y}`)
    try {
      await updateTablePosition(table.id, x, y)
      toast({ title: `ย้าย${table.name}แล้ว`, description: "Preview อัปเดตตามตำแหน่งใหม่ทันที" })
    } catch {
      toast({ title: "ย้ายโต๊ะไม่สำเร็จ", variant: "destructive" })
    } finally {
      setBusyCell(null)
      setDraggedTable(null)
    }
  }

  const cellClick = async (x: number, y: number) => {
    if (mode !== "edit" || busyCell) return
    const existing = tablePositions.find((table) => table.x === x && table.y === y)
    if (existing) {
      setToolMode("select")
      setSelectedZone(existing.zone)
      setSelectedTableId((current) => current === existing.id ? null : existing.id)
      return
    }
    if (toolMode === "select") {
      if (selectedTable) return void await moveTable(selectedTable, x, y)
      return
    }
    if (!selectedZone) return
    setBusyCell(`${x}-${y}`)
    try {
      const table = await addTable(selectedZone, x, y)
      setSelectedTableId(null)
      toast({ title: `เพิ่ม${table.name}ใน${activeZone?.name ?? selectedZone}แล้ว`, description: "ยังอยู่ในโหมดเพิ่มโต๊ะ คลิกช่องถัดไปเพื่อเพิ่มต่อ" })
    } catch (error) {
      toast({ title: "เพิ่มโต๊ะไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองอีกครั้ง", variant: "destructive" })
    } finally {
      setBusyCell(null)
    }
  }

  const dropTable = async (x: number, y: number) => {
    if (!draggedTable || mode !== "edit" || toolMode !== "select" || (draggedTable.x === x && draggedTable.y === y)) return
    await moveTable(draggedTable, x, y)
  }

  const deleteTable = async (table: TablePosition) => {
    try {
      await removeTable(table.id)
      setSelectedTableId(null)
      toast({ title: `ลบ${table.name}แล้ว` })
    } catch (error) {
      toast({ title: "ลบโต๊ะไม่สำเร็จ", description: axios.isAxiosError(error) && error.response?.status === 409 ? "โต๊ะนี้มีประวัติการจองที่เกี่ยวข้อง" : "กรุณาลองอีกครั้ง", variant: "destructive" })
    }
  }

  const toggleTable = async (table: TablePosition) => {
    try {
      const updated = await toggleTableActive(table.id)
      toast({ title: `${updated.isActive ? "เปิด" : "ปิด"}${table.name}แล้ว` })
    } catch {
      toast({ title: "เปลี่ยนสถานะโต๊ะไม่สำเร็จ", variant: "destructive" })
    }
  }

  const openGrid = () => {
    setGridDraft({ rows: String(grid.rows), cols: String(grid.cols) })
    setGridError(null)
    setGridOpen(true)
  }

  const saveGrid = async () => {
    const nextRows = Number(gridDraft.rows)
    const nextCols = Number(gridDraft.cols)
    const valid = (value: number) => Number.isInteger(value) && value >= MIN_GRID_SIZE && value <= MAX_GRID_SIZE
    if (!valid(nextRows) || !valid(nextCols)) return setGridError(`กรอกจำนวนเต็ม ${MIN_GRID_SIZE}–${MAX_GRID_SIZE}`)
    const outside = tablePositions.filter((table) => table.x >= nextCols || table.y >= nextRows)
    if (outside.length) return setGridError(`มี ${outside.length} โต๊ะอยู่นอกผังใหม่: ${outside.slice(0, 4).map((table) => table.name).join(", ")}${outside.length > 4 ? "…" : ""}`)
    setSavingGrid(true)
    try {
      await Promise.all(zoneConfigs.map((zone) => updateZoneConfig(zone.id, { gridRows: nextRows, gridCols: nextCols })))
      setGridOpen(false)
      toast({ title: "บันทึกขนาดผังรวมแล้ว", description: `${nextRows} แถว × ${nextCols} คอลัมน์ · ใช้ร่วมกันทุกโซน` })
    } catch {
      setGridError("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally {
      setSavingGrid(false)
    }
  }

  const createZone = async () => {
    const id = zoneDraft.id.trim().toUpperCase().replace(/\s/g, "")
    const name = zoneDraft.name.trim()
    if (!id || !name) return toast({ title: "กรอกรหัสและชื่อโซนให้ครบ", variant: "destructive" })
    if (zoneConfigs.some((zone) => zone.id === id)) return toast({ title: "มีรหัสโซนนี้แล้ว", variant: "destructive" })
    setCreatingZone(true)
    try {
      const { data } = await axios.post<ZoneConfig>(`${baseURL}/api/zones`, { id, name, description: zoneDraft.description.trim(), color: zoneDraft.color, isActive: true, allowIndividualSeatBooking: false, seatPrice: 0, tablePrice: 0, gridRows: grid.rows, gridCols: grid.cols })
      addZoneConfig(data)
      setSelectedZone(data.id)
      setZoneDraft({ ...EMPTY_ZONE, color: ZONE_COLOR_PRESETS[zoneConfigs.length % ZONE_COLOR_PRESETS.length] })
      setAddZoneOpen(false)
      toast({ title: `เพิ่ม${data.name}แล้ว`, description: "เลือกช่องว่างบนผังเพื่อเพิ่มโต๊ะ" })
    } catch (error) {
      toast({ title: "เพิ่มโซนไม่สำเร็จ", description: axios.isAxiosError(error) && error.response?.status === 409 ? "มีรหัสโซนนี้แล้ว" : "กรุณาลองอีกครั้ง", variant: "destructive" })
    } finally {
      setCreatingZone(false)
    }
  }

  const updateZone = async (updates: Partial<ZoneConfig>, message?: string) => {
    if (!activeZone) return
    try {
      await updateZoneConfig(activeZone.id, updates)
      if (message) toast({ title: message })
    } catch {
      toast({ title: "บันทึกการตั้งค่าโซนไม่สำเร็จ", variant: "destructive" })
    }
  }

  const deleteZone = async () => {
    if (!activeZone) return
    const count = tablePositions.filter((table) => table.zone === activeZone.id).length
    if (count > 0) {
      toast({ title: "ยังลบโซนไม่ได้", description: `โซนนี้ยังมี ${count} โต๊ะ กรุณาลบโต๊ะในโซนให้หมดก่อน`, variant: "destructive" })
      return
    }

    setDeletingZone(true)
    try {
      await axios.delete(`${baseURL}/api/zones/${activeZone.id}`)
      removeZoneConfig(activeZone.id)
      setSelectedTableId(null)
      setSelectedZone("")
      toast({ title: `ลบ${activeZone.name}แล้ว` })
    } catch (error) {
      const message = axios.isAxiosError(error) && error.response?.status === 409
        ? error.response.data?.message === "Cannot delete zone while it contains tables"
          ? "ยังมีโต๊ะอยู่ในโซนนี้ กรุณาลบโต๊ะก่อน"
          : "โซนนี้มีประวัติการจองที่เกี่ยวข้อง จึงไม่สามารถลบได้"
        : "ไม่สามารถลบโซนได้ กรุณาลองอีกครั้ง"
      toast({ title: "ลบโซนไม่สำเร็จ", description: message, variant: "destructive" })
    } finally {
      setDeletingZone(false)
    }
  }

  if (!zoneConfigs.length) return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center">
      <p className="font-medium">ยังไม่มีโซนในผัง</p><p className="mt-1 text-sm text-muted-foreground">เพิ่มโซนแรก แล้ววางโต๊ะทั้งหมดบนผังเดียวกัน</p>
      <Button className="mt-4 gap-2" onClick={() => setAddZoneOpen(true)}><Plus className="h-4 w-4" />เพิ่มโซน</Button>
      <AddZoneDialog open={addZoneOpen} setOpen={setAddZoneOpen} draft={zoneDraft} setDraft={setZoneDraft} creating={creatingZone} onCreate={createZone} />
    </div>
  )

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="font-semibold">ผังรวมทุกโซน</p><p className="text-sm text-muted-foreground">สิ่งที่เห็นบนผังนี้คือตำแหน่งเดียวกับหน้าที่ผู้จองจะเห็น</p></div>
        <div className="inline-flex w-fit rounded-lg border bg-muted/40 p-1" role="group" aria-label="โหมดแสดงผัง">
          <button type="button" onClick={() => setMode("edit")} className={cn("rounded-md px-4 py-2 text-sm font-medium", mode === "edit" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}>แก้ไขผัง</button>
          <button type="button" onClick={() => { setMode("preview"); setSelectedTableId(null) }} className={cn("rounded-md px-4 py-2 text-sm font-medium", mode === "preview" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}><Eye className="mr-1.5 inline h-4 w-4" />Preview หน้าจอง</button>
        </div>
      </header>

      {mode === "edit" ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
          <ZoneSidebar zones={zoneConfigs} tables={tablePositions} selectedZone={selectedZone} onSelect={(id) => { setSelectedZone(id); setSelectedTableId(null) }} onAdd={() => setAddZoneOpen(true)} summary={summary} />
          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
              <div className="flex rounded-lg border bg-muted/40 p-1" role="group" aria-label="เครื่องมือจัดผัง">
                <button type="button" onClick={() => setToolMode("select")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", toolMode === "select" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}><MousePointer2 className="h-4 w-4" />เลือก/ย้ายโต๊ะ</button>
                <button type="button" onClick={() => { setToolMode("add"); setSelectedTableId(null) }} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", toolMode === "add" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}><Plus className="h-4 w-4" />เพิ่มโต๊ะ</button>
              </div>
              <p className="mr-auto flex items-center gap-2 text-sm text-muted-foreground"><Move className="h-4 w-4" />{toolMode === "add" ? `คลิกช่องว่างเพื่อเพิ่มโต๊ะใน${activeZone?.name ?? "โซนที่เลือก"}` : selectedTable ? `คลิกช่องว่างเพื่อย้าย${selectedTable.name} หรือลากโต๊ะไปตำแหน่งใหม่` : "คลิกโต๊ะเพื่อเลือก แล้วลากหรือคลิกตำแหน่งใหม่"}</p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openGrid}><Grid3X3 className="h-4 w-4" />ขนาดผัง {grid.rows}×{grid.cols}</Button>
            </div>
            {activeZone && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <div className="mr-auto">
                  <p className="text-sm font-medium">สีประจำ{activeZone.name}</p>
                  <p className="text-xs text-muted-foreground">ใช้กับเส้นโต๊ะและสัญลักษณ์โซนในหน้าจอง</p>
                </div>
                <ZoneColorPicker value={colorOf(activeZone.id, zoneConfigs)} onChange={(color) => void updateZone({ color }, "บันทึกสีประจำโซนแล้ว")} />
              </div>
            )}
            <MapCanvas tables={visibleTables} zones={zoneConfigs} grid={grid} width={canvasWidth} height={canvasHeight} editing toolMode={toolMode} selectedTableId={selectedTableId} busyCell={busyCell} onCellClick={cellClick} onDrop={dropTable} onTableSelect={(table) => { setToolMode("select"); setSelectedZone(table.zone); setSelectedTableId((current) => current === table.id ? null : table.id) }} onDragStart={setDraggedTable} onDragEnd={() => setDraggedTable(null)} />
          </section>
          <Inspector table={selectedTable} zone={activeZone} zones={zoneConfigs} zoneTableCount={tablePositions.filter((table) => table.zone === activeZone?.id).length} deletingZone={deletingZone} onClose={() => setSelectedTableId(null)} onToggleTable={toggleTable} onDeleteTable={deleteTable} onUpdateZone={updateZone} onDeleteZone={deleteZone} />
        </div>
      ) : (
        <Preview zones={zoneConfigs} activeZones={activeZones} tables={visibleTables} grid={grid} width={canvasWidth} height={canvasHeight} />
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <p className="text-sm"><span className="font-medium text-success">บันทึกอัตโนมัติแล้ว</span><span className="text-muted-foreground"> · {summary.active} จาก {summary.all} โต๊ะเปิดให้จอง</span></p>
        {mode === "edit" ? <Button onClick={() => { setMode("preview"); setSelectedTableId(null) }} className="gap-2"><Eye className="h-4 w-4" />ดู Preview หน้าจอง</Button> : <Button onClick={() => setMode("edit")}>กลับไปแก้ไขผัง</Button>}
      </footer>

      <GridDialog open={gridOpen} setOpen={setGridOpen} draft={gridDraft} setDraft={setGridDraft} error={gridError} setError={setGridError} saving={savingGrid} onSave={saveGrid} />
      <AddZoneDialog open={addZoneOpen} setOpen={setAddZoneOpen} draft={zoneDraft} setDraft={setZoneDraft} creating={creatingZone} onCreate={createZone} />
    </div>
  )
}

function ZoneSidebar({ zones, tables, selectedZone, onSelect, onAdd, summary }: { zones: ZoneConfig[]; tables: TablePosition[]; selectedZone: string; onSelect: (id: string) => void; onAdd: () => void; summary: { all: number; active: number; seats: number } }) {
  return <aside className="self-start rounded-xl border bg-card p-3 xl:sticky xl:top-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">จัดการโซน</h2><Button variant="outline" size="sm" className="h-8 gap-1 px-2" onClick={onAdd}><Plus className="h-3.5 w-3.5" />เพิ่ม</Button></div><div className="space-y-2">{zones.map((zone) => { const count = tables.filter((table) => table.zone === zone.id).length; return <button key={zone.id} type="button" onClick={() => onSelect(zone.id)} className={cn("w-full rounded-lg border p-3 text-left", selectedZone === zone.id ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50", !zone.isActive && "opacity-60")}><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(zone.id, zones) }} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{zone.name}</span><span className={cn("text-[11px] font-medium", zone.isActive ? "text-success" : "text-muted-foreground")}>{zone.isActive ? "เปิด" : "ปิด"}</span></span><span className="mt-1 block pl-[18px] text-xs text-muted-foreground">{count} โต๊ะ · {zone.allowIndividualSeatBooking ? "เลือกที่นั่งได้" : "จองทั้งโต๊ะ"}</span></button> })}</div><div className="mt-4 border-t pt-3 text-xs text-muted-foreground"><p>{summary.all} โต๊ะ · {summary.seats} ที่นั่งเปิดขาย</p><p className="mt-1">เลือกโซนก่อน แล้วคลิกช่องว่างเพื่อเพิ่มโต๊ะ</p></div></aside>
}

function Inspector({ table, zone, zones, zoneTableCount, deletingZone, onClose, onToggleTable, onDeleteTable, onUpdateZone, onDeleteZone }: { table: TablePosition | null; zone?: ZoneConfig; zones: ZoneConfig[]; zoneTableCount: number; deletingZone: boolean; onClose: () => void; onToggleTable: (table: TablePosition) => void; onDeleteTable: (table: TablePosition) => void; onUpdateZone: (updates: Partial<ZoneConfig>, message?: string) => void; onDeleteZone: () => void }) {
  return <aside className="self-start space-y-3 xl:sticky xl:top-6">{table && <div className="rounded-xl border bg-card p-4"><div className="flex justify-between"><div><h2 className="font-semibold">ตั้งค่าโต๊ะที่เลือก</h2><p className="text-sm text-muted-foreground">{table.name} · {zone?.name}</p></div><Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">จำนวนที่นั่ง</p><p className="mt-1 font-medium">{seatCount(table)} ที่นั่ง</p></div><div><p className="text-xs text-muted-foreground">ตำแหน่ง</p><p className="mt-1 font-medium">แถว {table.y + 1} · คอลัมน์ {table.x + 1}</p></div></div><div className="mt-4 flex items-center justify-between border-t pt-4"><Label htmlFor="table-active">เปิดให้จอง</Label><Switch id="table-active" checked={table.isActive} onCheckedChange={() => void onToggleTable(table)} /></div><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="mt-4 w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" />ลบโต๊ะนี้</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>ลบ{table.name}?</AlertDialogTitle><AlertDialogDescription>โต๊ะจะถูกลบออกจากผัง หากมีประวัติการจอง ระบบจะไม่อนุญาตให้ลบ</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => void onDeleteTable(table)}>ลบโต๊ะ</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>}{zone && <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorOf(zone.id, zones) }} /><h2 className="font-semibold">ตั้งค่า{zone.name}</h2></div><div className="mt-4 flex items-center justify-between"><div><Label htmlFor="zone-active">เปิดให้จอง</Label><p className="text-xs text-muted-foreground">แสดงโซนนี้ในหน้าจอง</p></div><Switch id="zone-active" checked={zone.isActive} onCheckedChange={(value) => void onUpdateZone({ isActive: value }, `${value ? "เปิด" : "ปิด"}${zone.name}แล้ว`)} /></div><div className="mt-4 border-t pt-4"><Label>รูปแบบการจอง</Label><div className="mt-2 grid grid-cols-2 rounded-lg border p-1 text-sm"><button type="button" onClick={() => void onUpdateZone({ allowIndividualSeatBooking: true })} className={cn("rounded-md px-2 py-2", zone.allowIndividualSeatBooking && "bg-primary text-primary-foreground")}>รายที่นั่ง</button><button type="button" onClick={() => void onUpdateZone({ allowIndividualSeatBooking: false })} className={cn("rounded-md px-2 py-2", !zone.allowIndividualSeatBooking && "bg-primary text-primary-foreground")}>ทั้งโต๊ะ</button></div></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="seat-price" className="text-xs">ราคา/ที่นั่ง</Label><Input key={`${zone.id}-seat`} id="seat-price" type="number" min="0" defaultValue={zone.seatPrice} disabled={!zone.allowIndividualSeatBooking} onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value !== zone.seatPrice) void onUpdateZone({ seatPrice: value }, "บันทึกราคาที่นั่งแล้ว") }} /></div><div className="space-y-1.5"><Label htmlFor="table-price" className="text-xs">ราคา/โต๊ะ</Label><Input key={`${zone.id}-table`} id="table-price" type="number" min="0" defaultValue={zone.tablePrice} onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value !== zone.tablePrice) void onUpdateZone({ tablePrice: value }, "บันทึกราคาโต๊ะแล้ว") }} /></div></div><p className="mt-3 text-xs text-muted-foreground">ราคาบันทึกอัตโนมัติเมื่อออกจากช่อง</p><div className="mt-4 border-t pt-4"><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deletingZone}><Trash2 className="h-4 w-4" />{deletingZone ? "กำลังลบ..." : "ลบโซนนี้"}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>ลบ{zone.name}?</AlertDialogTitle><AlertDialogDescription>{zoneTableCount > 0 ? `โซนนี้ยังมี ${zoneTableCount} โต๊ะ ต้องลบโต๊ะทั้งหมดก่อนจึงจะลบโซนได้` : "โซนจะถูกลบออกจากผัง หากมีประวัติการจองที่เกี่ยวข้อง ระบบจะไม่อนุญาตให้ลบ"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction className={buttonVariants({ variant: "destructive" })} disabled={zoneTableCount > 0 || deletingZone} onClick={() => void onDeleteZone()}>ยืนยันลบโซน</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><p className="mt-2 text-xs text-muted-foreground">{zoneTableCount > 0 ? `ลบโต๊ะในโซนให้หมดก่อน (${zoneTableCount} โต๊ะ)` : "ลบได้เมื่อไม่มีโต๊ะและไม่มีประวัติการจอง"}</p></div></div>}</aside>
}

function Preview({ zones, activeZones, tables, grid, width, height }: { zones: ZoneConfig[]; activeZones: ZoneConfig[]; tables: TablePosition[]; grid: { rows: number; cols: number }; width: number; height: number }) {
  return <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">ผังการจัดโต๊ะ</h2><p className="mt-1 text-sm text-muted-foreground">คลิกโต๊ะเพื่อดูรายละเอียดและเลือกที่นั่ง</p></div><div className="flex gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border bg-white" />ว่าง</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-primary" />เลือกแล้ว</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-slate-400" />เต็ม</span></div></div><div className="mt-5 flex flex-wrap gap-2 text-xs sm:text-sm">{activeZones.map((zone) => <span key={zone.id} className="rounded-full bg-pink-50 px-3 py-1.5"><strong className="text-primary">{zone.name}</strong> · {zone.allowIndividualSeatBooking ? "เลือกที่นั่งได้" : "จองทั้งโต๊ะ"}</span>)}</div><div className="mt-6"><MapCanvas tables={tables} zones={zones} grid={grid} width={width} height={height} editing={false} toolMode="select" selectedTableId={null} busyCell={null} onCellClick={() => {}} onDrop={() => {}} onTableSelect={() => {}} onDragStart={() => {}} onDragEnd={() => {}} /></div></section><aside className="self-start rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-6"><h2 className="text-xl font-bold">รายการที่เลือก</h2><p className="mt-6 rounded-xl bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">เลือกโต๊ะบนผังเพื่อเริ่มจอง</p><p className="mt-4 text-center text-xs text-muted-foreground">โหมด Preview ไม่ทำรายการจองจริง</p></aside></div>
}

function MapCanvas({ tables, zones, grid, width, height, editing, toolMode, selectedTableId, busyCell, onCellClick, onDrop, onTableSelect, onDragStart, onDragEnd }: { tables: TablePosition[]; zones: ZoneConfig[]; grid: { rows: number; cols: number }; width: number; height: number; editing: boolean; toolMode: "select" | "add"; selectedTableId: number | null; busyCell: string | null; onCellClick: (x: number, y: number) => void; onDrop: (x: number, y: number) => void; onTableSelect: (table: TablePosition) => void; onDragStart: (table: TablePosition) => void; onDragEnd: () => void }) {
  return <div className="overflow-x-auto rounded-xl border bg-[#fdf9fc]"><div className="relative mx-auto" style={{ width, height: height + STAGE_HEIGHT }}><div className="absolute top-5 rounded-b-[64px] bg-pink-100 py-4 text-center text-xl font-bold text-primary" style={{ left: TABLE_LAYOUT_PADDING_X, right: TABLE_LAYOUT_PADDING_X }}>เวที</div><div className="absolute inset-x-0 bottom-0" style={{ top: STAGE_HEIGHT }}>{editing && Array.from({ length: grid.rows * grid.cols }, (_, index) => { const x = index % grid.cols; const y = Math.floor(index / grid.cols); const occupied = tables.some((table) => table.x === x && table.y === y); const busy = busyCell === `${x}-${y}`; const moveTarget = toolMode === "select" && selectedTableId !== null && !occupied; return <button key={`${x}-${y}`} type="button" tabIndex={-1} onClick={() => onCellClick(x, y)} onDragOver={(event) => toolMode === "select" && event.preventDefault()} onDrop={() => onDrop(x, y)} aria-label={`${toolMode === "add" ? "เพิ่มโต๊ะที่" : "ตำแหน่ง"}แถว ${y + 1} คอลัมน์ ${x + 1}`} className={cn("absolute rounded-lg border border-dashed border-slate-200/70 transition-colors", !occupied && toolMode === "add" && "cursor-copy hover:border-primary/50 hover:bg-primary/[0.06]", moveTarget && "cursor-pointer border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.08]")} style={{ left: x * CELL_WIDTH + TABLE_LAYOUT_PADDING_X, top: y * CELL_HEIGHT + TABLE_LAYOUT_PADDING_Y, width: CELL_WIDTH, height: CELL_HEIGHT }}>{!occupied && !busy && toolMode === "add" && <Plus className="mx-auto h-4 w-4 text-primary/50" />}{!occupied && !busy && moveTarget && <Move className="mx-auto h-4 w-4 text-primary/40" />}{busy && <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}</button> })}{tables.map((table) => <TableDot key={table.id} table={table} zones={zones} selected={table.id === selectedTableId} editing={editing && toolMode === "select"} onSelect={() => onTableSelect(table)} onDragStart={() => onDragStart(table)} onDragEnd={onDragEnd} />)}</div></div></div>
}

function ZoneColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="เลือกสีประจำโซน">
      {ZONE_COLOR_PRESETS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value.toUpperCase() === color}
          aria-label={`เลือกสี ${color}`}
          onClick={() => onChange(color)}
          className={cn(
            "h-7 w-7 rounded-full border-2 border-white shadow-sm ring-offset-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value.toUpperCase() === color && "ring-2 ring-foreground",
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

function GridDialog({ open, setOpen, draft, setDraft, error, setError, saving, onSave }: { open: boolean; setOpen: (open: boolean) => void; draft: { rows: string; cols: string }; setDraft: (draft: { rows: string; cols: string }) => void; error: string | null; setError: (error: string | null) => void; saving: boolean; onSave: () => void }) {
  return <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>ขนาดผังรวมทุกโซน</DialogTitle><DialogDescription>ทุกโซนใช้พิกัดบนผังเดียวกัน การเพิ่มขนาดจะไม่เปลี่ยนตำแหน่งโต๊ะเดิม</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="grid-rows">จำนวนแถว</Label><Input id="grid-rows" type="number" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE} value={draft.rows} onChange={(event) => { setDraft({ ...draft, rows: event.target.value }); setError(null) }} /></div><div className="space-y-2"><Label htmlFor="grid-cols">จำนวนคอลัมน์</Label><Input id="grid-cols" type="number" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE} value={draft.cols} onChange={(event) => { setDraft({ ...draft, cols: event.target.value }); setError(null) }} /></div></div><p className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")} role={error ? "alert" : undefined}>{error ?? `กำหนดได้ ${MIN_GRID_SIZE}–${MAX_GRID_SIZE} ช่อง`}</p><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>ยกเลิก</Button><Button onClick={onSave} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกขนาดผังรวม"}</Button></DialogFooter></DialogContent></Dialog>
}

function AddZoneDialog({ open, setOpen, draft, setDraft, creating, onCreate }: { open: boolean; setOpen: (open: boolean) => void; draft: typeof EMPTY_ZONE; setDraft: (draft: typeof EMPTY_ZONE) => void; creating: boolean; onCreate: () => void }) {
  return <Dialog open={open} onOpenChange={(next) => !creating && setOpen(next)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>เพิ่มโซนในผังรวม</DialogTitle><DialogDescription>สร้างโซนแล้วเลือกช่องว่างบนผังเพื่อเพิ่มโต๊ะได้ทันที</DialogDescription></DialogHeader><div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3"><div className="space-y-1.5"><Label htmlFor="new-zone-id">รหัสโซน</Label><Input id="new-zone-id" maxLength={10} placeholder="VIP" value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value.toUpperCase().replace(/\s/g, "") })} /></div><div className="space-y-1.5"><Label htmlFor="new-zone-name">ชื่อโซน</Label><Input id="new-zone-name" placeholder="โซน VIP" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div></div><div className="space-y-1.5"><Label htmlFor="new-zone-description">คำอธิบาย</Label><Input id="new-zone-description" placeholder="เช่น ด้านหน้าเวที" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>ยกเลิก</Button><Button onClick={onCreate} disabled={creating}>{creating ? "กำลังเพิ่ม..." : "เพิ่มโซน"}</Button></DialogFooter></DialogContent></Dialog>
}
