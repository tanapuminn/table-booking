"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useBooking } from "./booking-provider"
import { cn } from "@/lib/utils"
import { Info, InfoIcon as InfoCircle, Lock } from "lucide-react"
// เพิ่ม import PriceSummary
import { PriceSummary } from "./price-summary"
import axios from "axios"

interface Seat {
  id: string
  tableId: number
  seatNumber: number
  isBooked: boolean
}

interface Table {
  id: number
  name: string
  zone: string
  seats: Seat[]
  x: number
  y: number
}

interface BookingRecord {
  id: string
  customerName: string
  phone: string
  seats: Array<{ tableId: number; seatNumber: number; zone: string }>
  notes?: string
  totalPrice: number
  status: "confirmed" | "cancelled"
  bookingDate: string
  paymentProof?: string | null
}

export function TableMap() {
  const { selectedSeats, setSelectedSeats, zoneConfigs, tablePositions } = useBooking()
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ดึงข้อมูลการจองจาก API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get("http://localhost:8080/api/bookings")
        setBookings(response.data.filter((booking: BookingRecord) => booking.status === "confirmed"))
        setError(null)
      } catch (err) {
        console.error("Error fetching bookings:", err)
        setError("ไม่สามารถโหลดข้อมูลการจองได้ กรุณาลองใหม่")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [])

  // สร้าง tables ด้วย useMemo
  const tables = useMemo(() => {
    return tablePositions.map((tablePos) => {
      const seats = tablePos.seats.map((seat) => {
        // ตรวจสอบว่าที่นั่งนี้ถูกจองแล้วจาก bookings หรือไม่
        const isBookedFromBookings = bookings.some((booking) =>
          booking.seats.some(
            (bookedSeat) => bookedSeat.tableId === tablePos.id && bookedSeat.seatNumber === seat.seatNumber
          )
        )

        return {
          id: `${tablePos.id} -${seat.seatNumber}`,
          tableId: tablePos.id,
          seatNumber: seat.seatNumber,
          isBooked: isBookedFromBookings,
        }
      })

      const cellSize = 60
      const padding = 20

      return {
        id: tablePos.id,
        name: tablePos.name,
        zone: tablePos.zone,
        seats,
        x: tablePos.x * (cellSize + padding) + 50,
        y: tablePos.y * (cellSize + padding) + 50,
      }
    })
  }, [tablePositions, bookings])

  // กรองโต๊ะตามโซนที่เปิดใช้งานและโต๊ะที่ active
  const activeZones = zoneConfigs.filter((zone) => zone.isActive).map((zone) => zone.id)
  const activeTables = tables.filter((table) => {
    const tablePos = tablePositions.find((t) => t.id === table.id)
    return activeZones.includes(table.zone) && tablePos?.isActive
  })

  // ฟังก์ชันตรวจสอบว่าโต๊ะเต็มหรือไม่
  const isTableFull = (table: Table) => {
    return table.seats.every((seat) => seat.isBooked)
  }

  // ฟังก์ชันตรวจสอบว่าโต๊ะมีที่นั่งว่างหรือไม่
  const hasAvailableSeats = (table: Table) => {
    return table.seats.some((seat) => !seat.isBooked)
  }

  const handleTableClick = (table: Table) => {
    // ตรวจสอบว่าโต๊ะเต็มหรือไม่
    if (isTableFull(table)) {
      return // ไม่ให้คลิกได้ถ้าโต๊ะเต็ม
    }

    setSelectedTable(table)
    setIsDialogOpen(true)
  }

  const handleSeatClick = (seat: Seat) => {
    if (seat.isBooked) return

    const table = tables.find((t) => t.id === seat.tableId)
    const zoneConfig = zoneConfigs.find((z) => z.id === table?.zone)

    if (!zoneConfig?.allowIndividualSeatBooking) {
      if (table) {
        handleTableSelect(table)
      }
      return
    }

    const isSelected = selectedSeats.some((s) => s.id === seat.id)

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id))
    } else {
      setSelectedSeats([...selectedSeats, seat])
    }
  }

  const handleTableSelect = (table: Table) => {
    const availableSeats = table.seats.filter((seat) => !seat.isBooked)
    const allTableSeatsSelected = availableSeats.every((seat) => selectedSeats.some((s) => s.id === seat.id))

    if (allTableSeatsSelected) {
      setSelectedSeats(selectedSeats.filter((seat) => seat.tableId !== table.id))
    } else {
      const otherSeats = selectedSeats.filter((seat) => seat.tableId !== table.id)
      setSelectedSeats([...otherSeats, ...availableSeats])
    }
  }

  const getSeatStatus = (seat: Seat) => {
    if (seat.isBooked) return "booked"
    if (selectedSeats.some((s) => s.id === seat.id)) return "selected"
    return "available"
  }

  const getSeatColor = (status: string) => {
    switch (status) {
      case "booked":
        return "bg-red-500 text-white cursor-not-allowed border-red-600"
      case "selected":
        return "bg-primary text-primary-foreground border-primary"
      case "available":
        return "bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
      default:
        return "bg-gray-100 border-gray-300"
    }
  }

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case "A":
        return "border-blue-200 bg-blue-50"
      case "B":
        return "border-green-200 bg-green-50"
      case "C":
        return "border-purple-200 bg-purple-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  const getTableColor = (table: Table) => {
    const hasSelectedSeats = table.seats.some((seat) => selectedSeats.some((s) => s.id === seat.id))
    const hasBookedSeats = table.seats.some((seat) => seat.isBooked)
    const allSeatsAvailable = table.seats.every((seat) => !seat.isBooked)
    const allSeatsBooked = table.seats.every((seat) => seat.isBooked)

    if (hasSelectedSeats) {
      return "bg-primary border-primary-600 text-primary-foreground"
    } else if (allSeatsBooked) {
      return "bg-red-200 border-red-400 text-red-800 cursor-not-allowed opacity-60"
    } else if (hasBookedSeats) {
      return "bg-amber-200 border-amber-400 text-amber-800"
    } else {
      switch (table.zone) {
        case "A":
          return "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
        case "B":
          return "bg-green-100 border-green-300 text-green-800 hover:bg-green-200"
        case "C":
          return "bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200"
        default:
          return "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
      }
    }
  }

  const getTableStatus = (table: Table) => {
    const bookedSeats = table.seats.filter((seat) => seat.isBooked).length
    const totalSeats = table.seats.length

    if (bookedSeats === totalSeats) {
      return "เต็ม"
    } else if (bookedSeats > 0) {
      return `ว่าง ${totalSeats - bookedSeats}/${totalSeats}`
    } else {
      return `ว่าง ${totalSeats}/${totalSeats}`
    }
  }

  // ฟังก์ชันคำนวณตำแหน่งเก้าอี้รอบโต๊ะวงกลม (สำหรับ modal)
  const getSeatPosition = (seatNumber: number, tableRadius = 100) => {
    const angle = ((seatNumber - 1) * 40 - 90) * (Math.PI / 180)
    const x = Math.cos(angle) * tableRadius
    const y = Math.sin(angle) * tableRadius
    return { x, y }
  }

  const renderZoneMap = (zone: string) => {
    const zoneTables = activeTables.filter((table) => table.zone === zone)
    const zoneConfig = zoneConfigs.find((z) => z.id === zone)

    if (zoneTables.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">โซนนี้ปิดให้บริการในขณะนี้</div>
    }

    return (
      <div className="space-y-4">
        {/* แสดงข้อมูลการจองของโซน */}
        {zoneConfig && !zoneConfig.allowIndividualSeatBooking && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>โซนนี้จองได้เฉพาะทั้งโต๊ะเท่านั้น ไม่สามารถเลือกที่นั่งแยกได้</AlertDescription>
          </Alert>
        )}

        {/* เพิ่ม grid layout เพื่อให้โต๊ะวางตามตำแหน่งที่กำหนดใน table-layout-editor */}
        <div className={cn("relative rounded-lg p-4 min-h-[600px] overflow-auto", getZoneColor(zone))}>
          {/* สร้าง grid เพื่อแสดงตำแหน่งโต๊ะ */}
          <div className="grid grid-cols-10 gap-4 opacity-10 pointer-events-none absolute inset-0 p-4">
            {Array.from({ length: 100 }, (_, i) => (
              <div key={i} className="w-full h-16 border border-dashed border-gray-300 rounded"></div>
            ))}
          </div>

          {zoneTables.map((table) => {
            const isFull = isTableFull(table)

            return (
              <div
                key={table.id}
                className="absolute"
                style={{
                  left: table.x,
                  top: table.y,
                  transition: "all 0.3s ease",
                }}
              >
                {/* โต๊ะวงกลม */}
                <button
                  className={cn(
                    "w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-lg border-4 transition-all relative",
                    getTableColor(table),
                    isFull ? "cursor-not-allowed" : "hover:scale-105",
                  )}
                  onClick={() => handleTableClick(table)}
                  disabled={isFull}
                  title={isFull ? "โต๊ะเต็มแล้ว" : `คลิกเพื่อเลือกที่นั่ง - ${getTableStatus(table)}`}
                >
                  <span className="font-bold">{table.name}</span>
                  <span className="text-xs">{getTableStatus(table)}</span>

                  {/* แสดงไอคอนล็อคสำหรับโต๊ะที่เต็ม */}
                  {isFull && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                      <Lock className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const calculateTotalPrice = (seats: Seat[]) => {
    let totalPrice = 0
    seats.forEach((seat) => {
      const table = tables.find((t) => t.id === seat.tableId)
      const zoneConfig = zoneConfigs.find((z) => z.id === table?.zone)
      if (zoneConfig?.allowIndividualSeatBooking) {
        totalPrice += zoneConfig.seatPrice || 150 // Default seat price
      } else {
        totalPrice = zoneConfig?.tablePrice || 0 // Use table price if individual seats are not allowed
      }
    })
    return totalPrice
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>แผนผังโต๊ะและที่นั่ง</CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded-full"></div>
              <span>ว่างทั้งหมด</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-200 border border-amber-400 rounded-full"></div>
              <span>มีบางที่นั่งจองแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border border-red-400 rounded-full"></div>
              <span>เต็มแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary border border-primary rounded-full"></div>
              <span>เลือกแล้ว</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            คลิกที่โต๊ะเพื่อดูรายละเอียดและเลือกที่นั่ง (โต๊ะที่เต็มแล้วจะไม่สามารถคลิกได้)
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="A" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {zoneConfigs.map((zone) => (
                <TabsTrigger key={zone.id} value={zone.id} disabled={!zone.isActive} className="relative">
                  {zone.name}
                  {!zone.isActive && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      ปิด
                    </Badge>
                  )}
                  {zone.isActive && !zone.allowIndividualSeatBooking && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      ทั้งโต๊ะ
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {zoneConfigs.map((zone) => (
              <TabsContent key={zone.id} value={zone.id} className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{zone.name}</h3>
                  <p className="text-sm text-muted-foreground">{zone.description}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <p className="text-xs text-muted-foreground">โซนนี้มี 20 โต๊ะ (180 ที่นั่ง) - แต่ละโต๊ะมี 9 ที่นั่ง</p>
                    <Badge variant={zone.allowIndividualSeatBooking ? "default" : "secondary"} className="text-xs">
                      {zone.allowIndividualSeatBooking ? "จองรายที่นั่งได้" : "จองทั้งโต๊ะเท่านั้น"}
                    </Badge>

                    <div className="flex items-center gap-1">
                      <InfoCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {zone.allowIndividualSeatBooking
                          ? `ราคา: ${zone.seatPrice} บาท/ที่นั่ง หรือ ${zone.tablePrice} บาท/โต๊ะ`
                          : `ราคา: ${zone.tablePrice} บาท/โต๊ะ`}
                      </span>
                    </div>
                  </div>
                </div>
                {renderZoneMap(zone.id)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal สำหรับเลือกที่นั่ง */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTable?.name} - {selectedTable && getTableStatus(selectedTable)}
            </DialogTitle>
          </DialogHeader>

          {selectedTable && (
            <div className="py-4">
              <div className="relative w-64 h-64 mx-auto mb-4">
                {/* โต๊ะวงกลม */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-100 border-4 border-amber-300 rounded-full flex items-center justify-center">
                  <span className="font-bold">{selectedTable.name}</span>
                </div>

                {/* เก้าอี้รอบโต๊ะ */}
                {selectedTable.seats.map((seat) => {
                  const position = getSeatPosition(seat.seatNumber)
                  const status = getSeatStatus(seat)
                  const zoneConfig = zoneConfigs.find((z) => z.id === selectedTable.zone)
                  const canSelectIndividual = zoneConfig?.allowIndividualSeatBooking

                  return (
                    <button
                      key={seat.id}
                      className={cn(
                        "absolute w-10 h-10 rounded-full border-2 text-sm font-medium transition-all duration-200 transform hover:scale-110 flex items-center justify-center shadow-md",
                        getSeatColor(status),
                        seat.isBooked
                          ? "cursor-not-allowed"
                          : canSelectIndividual
                            ? "cursor-pointer"
                            : "cursor-pointer",
                      )}
                      style={{
                        left: `calc(50% + ${position.x}px - 20px)`,
                        top: `calc(50% + ${position.y}px - 20px)`,
                      }}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.isBooked}
                      title={`ที่นั่ง ${seat.seatNumber} - ${seat.isBooked ? "จองแล้ว" : status === "selected" ? "เลือกแล้ว" : "ว่าง"
                        }${!canSelectIndividual ? " (จองทั้งโต๊ะเท่านั้น)" : ""}`}
                    >
                      {seat.seatNumber}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></div>
                      <span className="text-xs">ว่าง</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-primary border border-primary rounded-full"></div>
                      <span className="text-xs">เลือกแล้ว</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 border border-red-600 rounded-full"></div>
                      <span className="text-xs">จองแล้ว</span>
                    </div>
                  </div>

                  {hasAvailableSeats(selectedTable) && (
                    <Button size="sm" onClick={() => handleTableSelect(selectedTable)} variant="outline">
                      {selectedTable.seats
                        .filter((seat) => !seat.isBooked)
                        .every((seat) => selectedSeats.some((s) => s.id === seat.id))
                        ? "ยกเลิกทั้งโต๊ะ"
                        : "เลือกทั้งโต๊ะ"}
                    </Button>
                  )}
                </div>

                {selectedTable.seats.some((seat) => selectedSeats.some((s) => s.id === seat.id)) && (
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        ที่นั่งที่เลือก:{" "}
                        {selectedTable.seats.filter((seat) => selectedSeats.some((s) => s.id === seat.id)).length} ที่นั่ง
                      </span>
                      <span className="font-bold text-primary">
                        ฿{calculateTotalPrice(selectedSeats.filter((seat) => seat.tableId === selectedTable.id))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ปิด
            </Button>
            <Button
              onClick={() => setIsDialogOpen(false)}
              disabled={
                !selectedTable || !selectedTable.seats.some((seat) => selectedSeats.some((s) => s.id === seat.id))
              }
            >
              ยืนยันการเลือก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* แทนที่ส่วนแสดงราคาเดิมในส่วนท้ายของ component */}
      {selectedSeats.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>ที่นั่งที่เลือก ({selectedSeats.length} ที่นั่ง)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSeats.map((seat) => {
                  const table = tables.find((t) => t.id === seat.tableId)
                  return (
                    <Badge key={seat.id} variant="default" className="text-sm">
                      {table?.name} ที่นั่ง {seat.seatNumber}
                    </Badge>
                  )
                })}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedSeats([])}>
                  ยกเลิกทั้งหมด
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* เพิ่ม PriceSummary */}
          <PriceSummary selectedSeats={selectedSeats} />
        </>
      )}
    </div>
  )
}
