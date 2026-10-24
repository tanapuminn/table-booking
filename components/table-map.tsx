"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowRight, Info, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useBooking, type TablePosition, type ZoneConfig } from "./booking-provider"
import { cn } from "@/lib/utils"

type Seat = { id: string; tableId: number; seatNumber: number; isBooked: boolean; studentName: string; classLevel: string }
type Mode = "seats" | "table"

const money = (value: number) => value.toLocaleString("th-TH") + " บาท"
const seatId = (tableId: number, number: number) => tableId + " -" + number
const individualAllowed = (zone?: ZoneConfig) => Boolean(zone?.allowIndividualSeatBooking)
const zoneName = (zone: ZoneConfig) => zone.name

function bookable(table: TablePosition, zone?: ZoneConfig) {
  if (!zone?.isActive || !table.isActive) return false
  return individualAllowed(zone)
    ? table.seats.some((seat) => !seat.isBooked)
    : table.seats.every((seat) => !seat.isBooked)
}

function Legend({ seat = false }: { seat?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
      {[
        { label: "ว่าง", color: "border-slate-300 bg-white" },
        { label: "เลือกแล้ว", color: "border-primary bg-primary" },
        { label: seat ? "จองแล้ว" : "เต็ม", color: "border-slate-400 bg-slate-400" },
      ].map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span className={cn("h-4 w-4 rounded-full border", item.color)} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function SeatCircle({
  table, selectedNumbers, selectable, onSeatClick,
}: {
  table: TablePosition
  selectedNumbers: number[]
  selectable: boolean
  onSeatClick: (number: number) => void
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[360px]" aria-label={"ผังที่นั่งโต๊ะ " + table.name}>
      <div className="absolute left-1/2 top-1/2 flex h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#d8b59b] bg-[#f7eadc] text-2xl font-bold text-slate-900 shadow-sm">
        {table.name}
      </div>
      {table.seats.map((seat) => {
        const angle = ((seat.seatNumber - 1) * 360) / table.seats.length - 90
        const radians = (angle * Math.PI) / 180
        const left = 50 + Math.cos(radians) * 40
        const top = 50 + Math.sin(radians) * 40
        const selected = selectedNumbers.includes(seat.seatNumber)
        const status = seat.isBooked ? "จองแล้ว" : selected ? "เลือกแล้ว" : "ว่าง"
        return (
          <button
            key={seat.seatNumber}
            type="button"
            disabled={!selectable || seat.isBooked}
            aria-label={"ที่นั่ง " + seat.seatNumber + " " + status}
            aria-pressed={selectable ? selected : undefined}
            title={"ที่นั่ง " + seat.seatNumber + " " + status}
            onClick={() => onSeatClick(seat.seatNumber)}
            className={cn(
              "absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border-2 text-base font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-12 sm:w-12",
              seat.isBooked ? "cursor-not-allowed border-slate-400 bg-slate-400 text-white"
                : selected ? "border-primary bg-primary text-white"
                : "border-slate-300 bg-white text-slate-800",
              selectable && !seat.isBooked && !selected && "hover:border-primary hover:bg-pink-50 hover:text-primary",
              !selectable && "cursor-default",
            )}
            style={{ left: left + "%", top: top + "%" }}
          >
            {seat.seatNumber}
          </button>
        )
      })}
    </div>
  )
}

export function TableMap({ onConfirmSelection }: { onConfirmSelection?: () => void }) {
  const {
    selectedSeats, setSelectedSeats, zoneConfigs, tablePositions,
    calculateTotalPrice, isLoading, error, retryFetchData,
  } = useBooking()
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [draftNumbers, setDraftNumbers] = useState<number[]>([])
  const [draftStudentInfo, setDraftStudentInfo] = useState<Record<number, { studentName: string; classLevel: string }>>({})
  const [validationMessage, setValidationMessage] = useState("")
  const [mode, setMode] = useState<Mode>("seats")
  const summaryRef = useRef<HTMLElement | null>(null)

  const activeZones = zoneConfigs.filter((zone) => zone.isActive)
  const visibleTables = tablePositions.filter((table) =>
    table.isActive && activeZones.some((zone) => zone.id === table.zone),
  )
  const selectedTable = tablePositions.find((table) => table.id === selectedTableId)
  const selectedZone = zoneConfigs.find((zone) => zone.id === selectedTable?.zone)
  const fullTableAvailable = selectedTable?.seats.every((seat) => !seat.isBooked) ?? false

  const selectedGroups = useMemo(() => tablePositions
    .filter((table) => selectedSeats.some((seat) => seat.tableId === table.id))
    .map((table) => ({ table, seats: selectedSeats.filter((seat) => seat.tableId === table.id) })),
  [tablePositions, selectedSeats])

  const maxX = Math.max(9, ...visibleTables.map((table) => table.x))
  const maxY = Math.max(6, ...visibleTables.map((table) => table.y))
  const mapWidth = Math.max(820, (maxX + 1) * 78 + 48)
  const mapHeight = Math.max(510, (maxY + 1) * 72 + 40)

  const openTable = (table: TablePosition) => {
    const zone = zoneConfigs.find((item) => item.id === table.zone)
    if (!bookable(table, zone)) return
    const currentNumbers = selectedSeats
      .filter((seat) => seat.tableId === table.id)
      .map((seat) => seat.seatNumber)
    const currentInfo: Record<number, { studentName: string; classLevel: string }> = {}
    selectedSeats.filter((seat) => seat.tableId === table.id).forEach((seat) => {
      currentInfo[seat.seatNumber] = { studentName: seat.studentName || "", classLevel: seat.classLevel || "" }
    })
    setSelectedTableId(table.id)
    setDraftNumbers(currentNumbers)
    setDraftStudentInfo(currentInfo)
    setValidationMessage("")
    setMode(!individualAllowed(zone) || currentNumbers.length === table.seats.length ? "table" : "seats")
  }

  const toggleSeat = (number: number) => {
    if (mode === "table") return
    setValidationMessage("")
    setDraftNumbers((current) => current.includes(number)
      ? current.filter((item) => item !== number)
      : [...current, number].sort((a, b) => a - b))
  }

  const chooseMode = (nextMode: Mode) => {
    if (!selectedTable || !individualAllowed(selectedZone)) return
    if (nextMode === "table" && !fullTableAvailable) return
    setValidationMessage("")
    setMode(nextMode)
    if (nextMode === "table") setDraftNumbers(selectedTable.seats.map((seat) => seat.seatNumber))
  }

  const confirmTable = () => {
    if (!selectedTable || !selectedZone) return
    const numbers = mode === "table"
      ? selectedTable.seats.map((seat) => seat.seatNumber)
      : draftNumbers
    if (numbers.length === 0 || (mode === "table" && !fullTableAvailable)) return
    const missingStudentInfo = numbers.find((number) =>
      !draftStudentInfo[number]?.studentName.trim() || !draftStudentInfo[number]?.classLevel.trim(),
    )
    if (missingStudentInfo) {
      setValidationMessage(`กรอกชื่อนักเรียนและระดับชั้นของที่นั่ง ${missingStudentInfo} ให้ครบก่อนยืนยัน`)
      return
    }
    const otherSeats = selectedSeats.filter((seat) => seat.tableId !== selectedTable.id)
    const newSeats: Seat[] = selectedTable.seats
      .filter((seat) => numbers.includes(seat.seatNumber) && !seat.isBooked)
      .map((seat) => ({
        id: seatId(selectedTable.id, seat.seatNumber),
        tableId: selectedTable.id,
        seatNumber: seat.seatNumber,
        isBooked: false,
        studentName: draftStudentInfo[seat.seatNumber].studentName.trim(),
        classLevel: draftStudentInfo[seat.seatNumber].classLevel.trim(),
      }))
    setSelectedSeats([...otherSeats, ...newSeats])
    setSelectedTableId(null)
    if (window.innerWidth < 1024) {
      window.setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    }
  }

  const removeTable = (tableId: number) => {
    setSelectedSeats(selectedSeats.filter((seat) => seat.tableId !== tableId))
  }

  const draftCount = mode === "table" ? selectedTable?.seats.length ?? 0 : draftNumbers.length
  const draftSeatNumbers = mode === "table"
    ? selectedTable?.seats.map((seat) => seat.seatNumber) ?? []
    : draftNumbers
  const draftSeatDetailsComplete = draftSeatNumbers.length > 0 && draftSeatNumbers.every((number) =>
    Boolean(draftStudentInfo[number]?.studentName.trim() && draftStudentInfo[number]?.classLevel.trim()),
  )
  const draftPrice = selectedZone
    ? mode === "table" || draftCount === selectedTable?.seats.length
      ? selectedZone.tablePrice
      : draftCount * selectedZone.seatPrice
    : 0

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="table-map-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 id="table-map-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">ผังการจัดโต๊ะ</h1>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">คลิกโต๊ะเพื่อดูรายละเอียดและเลือกที่นั่ง</p>
          </div>
          <Legend />
        </div>

        {activeZones.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600 sm:text-sm">
            {activeZones.map((zone) => (
              <span key={zone.id} className="rounded-full bg-pink-50 px-3 py-1.5">
                <strong className="text-primary">{zoneName(zone)}</strong>
                <span className="ml-1">· {individualAllowed(zone) ? "เลือกที่นั่งได้" : "จองทั้งโต๊ะ"}</span>
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500 lg:hidden">เลื่อนผังซ้ายขวาเพื่อดูโต๊ะทั้งหมด</p>

        {isLoading ? (
          <div className="mt-6 flex min-h-[360px] items-center justify-center text-slate-500" role="status">กำลังโหลดผังโต๊ะ...</div>
        ) : error ? (
          <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-slate-700">โหลดผังโต๊ะไม่สำเร็จ</p>
            <Button variant="outline" onClick={retryFetchData}>ลองอีกครั้ง</Button>
          </div>
        ) : visibleTables.length === 0 ? (
          <div className="mt-6 flex min-h-[300px] items-center justify-center text-center text-slate-600">ยังไม่มีโต๊ะที่เปิดให้จอง</div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl bg-[#fdf9fc]" aria-label="แผนผังโต๊ะ เลื่อนแนวนอนได้บนหน้าจอขนาดเล็ก">
            <div className="relative mx-auto p-5" style={{ width: mapWidth, height: mapHeight + 102 }}>
              <div className="absolute left-8 right-8 top-5 rounded-b-[64px] bg-pink-100 py-4 text-center text-xl font-bold text-primary">เวที</div>
              <div className="absolute inset-x-0 bottom-0 top-[102px]">
                {visibleTables.map((table) => {
                  const zone = zoneConfigs.find((item) => item.id === table.zone)
                  const available = table.seats.filter((seat) => !seat.isBooked).length
                  const unavailable = !bookable(table, zone)
                  const selected = selectedSeats.some((seat) => seat.tableId === table.id)
                  return (
                    <button
                      key={table.id}
                      type="button"
                      disabled={unavailable}
                      onClick={() => openTable(table)}
                      aria-label={"โต๊ะ " + table.name + " " + (zone ? zoneName(zone) : "") + " " + (unavailable ? "เต็ม" : "ว่าง " + available + " ที่นั่ง")}
                      className={cn(
                        "absolute flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full border-2 text-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        unavailable ? "cursor-not-allowed border-slate-400 bg-slate-400 text-white"
                          : selected ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white text-slate-800 hover:border-primary hover:bg-pink-50",
                      )}
                      style={{ left: table.x * 78 + 20, top: table.y * 72 + 12 }}
                    >
                      <span className="font-bold">{table.name}</span>
                      <span className="text-[10px]">{unavailable ? "เต็ม" : individualAllowed(zone) ? "ว่าง " + available : "ทั้งโต๊ะ"}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <aside ref={summaryRef} className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6" aria-labelledby="selected-summary-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="selected-summary-title" className="text-xl font-bold text-slate-900">รายการที่เลือก</h2>
          {selectedSeats.length > 0 && (
            <button type="button" onClick={() => setSelectedSeats([])} className="text-sm font-medium text-primary hover:underline">ล้างรายการ</button>
          )}
        </div>
        {selectedGroups.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">เลือกโต๊ะบนผังเพื่อเริ่มจอง</p>
        ) : (
          <>
            <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
              {selectedGroups.map(({ table, seats }) => {
                const zone = zoneConfigs.find((item) => item.id === table.zone)
                return (
                  <div key={table.id} className="flex items-start justify-between gap-2 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">โต๊ะ {table.name}</p>
                      <p className="text-sm text-slate-600">
                        {zone ? zoneName(zone) : table.zone} · {seats.length === table.seats.length
                          ? "ทั้งโต๊ะ"
                          : "ที่นั่ง " + seats.map((seat) => seat.seatNumber).sort((a, b) => a - b).join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {seats.map((seat) => `${seat.seatNumber}: ${seat.studentName || "ยังไม่ระบุ"}${seat.classLevel ? ` (${seat.classLevel})` : ""}`).join(" · ")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-primary">{money(calculateTotalPrice(seats))}</p>
                    </div>
                    <button type="button" onClick={() => removeTable(table.id)} aria-label={"ลบโต๊ะ " + table.name + " จากรายการ"} className="rounded-lg p-2 text-slate-500 hover:bg-pink-50 hover:text-primary">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex items-end justify-between gap-2">
              <span className="font-medium text-slate-700">ยอดรวมทั้งหมด</span>
              <strong className="text-2xl text-primary">{money(calculateTotalPrice(selectedSeats))}</strong>
            </div>
            <Button className="mt-5 h-12 w-full text-base" onClick={onConfirmSelection}>
              กรอกข้อมูลผู้จอง <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </aside>

      <Sheet open={selectedTableId !== null} onOpenChange={(open) => { if (!open) setSelectedTableId(null) }}>
        <SheetContent side="right" className="flex h-full w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[570px]">
          {selectedTable && selectedZone && (
            <>
              <SheetHeader className="border-b border-slate-200 px-6 pb-5 pt-8 text-left">
                <SheetTitle className="pr-7 text-2xl font-bold text-slate-900">โต๊ะ {selectedTable.name} · {zoneName(selectedZone)}</SheetTitle>
                <SheetDescription className="text-sm text-slate-600">
                  {individualAllowed(selectedZone) ? "เลือกที่นั่งได้ หรือจองทั้งโต๊ะเมื่อทุกที่นั่งว่าง" : "โซนนี้จองครบทั้งโต๊ะเท่านั้น"}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 px-5 py-5 sm:px-7">
                {individualAllowed(selectedZone) ? (
                  <>
                    <div className="grid grid-cols-2 rounded-xl border border-pink-200 bg-pink-50 p-1" role="group" aria-label="รูปแบบการจอง">
                      <button type="button" onClick={() => chooseMode("seats")} aria-pressed={mode === "seats"} className={cn("min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors", mode === "seats" ? "bg-primary text-white" : "text-slate-700 hover:bg-white")}>รายที่นั่ง</button>
                      <button type="button" onClick={() => chooseMode("table")} disabled={!fullTableAvailable} aria-pressed={mode === "table"} className={cn("min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors", mode === "table" ? "bg-primary text-white" : "text-slate-700 hover:bg-white", !fullTableAvailable && "cursor-not-allowed opacity-50")}>ทั้งโต๊ะ</button>
                    </div>
                    {!fullTableAvailable && <p className="mt-2 text-xs text-slate-500">จองทั้งโต๊ะไม่ได้ เนื่องจากมีบางที่นั่งถูกจองแล้ว</p>}
                  </>
                ) : (
                  <div className="rounded-xl bg-pink-50 px-4 py-3 text-sm font-semibold text-primary">จองทั้งโต๊ะเท่านั้น · {selectedTable.seats.length} ที่นั่ง</div>
                )}

                <p className="mt-6 text-center text-sm text-slate-600">
                  {individualAllowed(selectedZone) && mode === "seats" ? "แตะที่นั่งที่ต้องการ เลือกได้หลายที่นั่ง" : "ที่นั่งทั้งหมดรวมอยู่ในการจองโต๊ะนี้"}
                </p>
                <SeatCircle
                  table={selectedTable}
                  selectedNumbers={mode === "table" ? selectedTable.seats.map((seat) => seat.seatNumber) : draftNumbers}
                  selectable={individualAllowed(selectedZone) && mode === "seats"}
                  onSeatClick={toggleSeat}
                />
                {draftSeatNumbers.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">ข้อมูลเจ้าของที่นั่ง</h3>
                      <p className="text-xs text-slate-600">กรอกชื่อนักเรียนและระดับชั้นแยกตามที่นั่ง</p>
                    </div>
                    {draftSeatNumbers.map((seatNumber) => (
                      <div key={seatNumber} className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-sm font-semibold text-primary">ที่นั่ง {seatNumber}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input
                            value={draftStudentInfo[seatNumber]?.studentName || ""}
                            onChange={(event) => {
                              setValidationMessage("")
                              setDraftStudentInfo((current) => ({
                                ...current,
                                [seatNumber]: { studentName: event.target.value, classLevel: current[seatNumber]?.classLevel || "" },
                              }))
                            }}
                            placeholder="ชื่อนักเรียน"
                            aria-label={`ชื่อนักเรียนที่นั่ง ${seatNumber}`}
                            maxLength={120}
                          />
                          <Input
                            value={draftStudentInfo[seatNumber]?.classLevel || ""}
                            onChange={(event) => {
                              setValidationMessage("")
                              setDraftStudentInfo((current) => ({
                                ...current,
                                [seatNumber]: { studentName: current[seatNumber]?.studentName || "", classLevel: event.target.value },
                              }))
                            }}
                            placeholder="ระดับชั้น เช่น ป.3/1"
                            aria-label={`ระดับชั้นของที่นั่ง ${seatNumber}`}
                            maxLength={30}
                          />
                        </div>
                      </div>
                    ))}
                    {!draftSeatDetailsComplete && (
                      <p className="text-sm text-amber-700">กรอกชื่อและระดับชั้นให้ครบทุกที่นั่งก่อนยืนยัน</p>
                    )}
                    {validationMessage && <p className="text-sm text-red-600" role="alert">{validationMessage}</p>}
                  </div>
                )}
                {individualAllowed(selectedZone) ? <Legend seat /> : (
                  <p className="flex items-start gap-2 rounded-xl bg-pink-50 p-3 text-sm text-slate-700"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> ไม่สามารถเลือกแยกรายที่นั่งในโซนนี้</p>
                )}
              </div>

              <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] sm:px-7">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    <p>{mode === "table" ? "1 โต๊ะ · " + selectedTable.seats.length + " ที่นั่ง" : draftCount + " ที่นั่ง × " + money(selectedZone.seatPrice)}</p>
                    {mode === "seats" && draftCount === selectedTable.seats.length && <p className="text-xs text-primary">ครบทั้งโต๊ะ ใช้ราคาโต๊ะ</p>}
                  </div>
                  <strong className="whitespace-nowrap text-xl text-primary sm:text-2xl">{money(draftPrice)}</strong>
                </div>
                <Button className="h-12 w-full text-base" onClick={confirmTable} disabled={draftCount === 0 || !draftSeatDetailsComplete || (mode === "table" && !fullTableAvailable)}>
                  {mode === "table" ? "ยืนยันจองทั้งโต๊ะ" : "ยืนยัน " + draftCount + " ที่นั่ง"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
