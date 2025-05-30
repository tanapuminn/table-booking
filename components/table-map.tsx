"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBooking } from "./booking-provider"
import { cn } from "@/lib/utils"

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

export function TableMap() {
  const { selectedSeats, setSelectedSeats, zoneConfigs } = useBooking()

  // สร้างข้อมูลโต๊ะสำหรับ 3 โซน โซนละ 20 โต๊ะ แต่ละโต๊ะมี 9 ที่นั่ง
  const [tables] = useState<Table[]>(() => {
    const allTables: Table[] = []
    const zones = ["A", "B", "C"]

    zones.forEach((zone, zoneIndex) => {
      for (let i = 1; i <= 20; i++) {
        const tableId = zoneIndex * 20 + i
        const row = Math.floor((i - 1) / 5)
        const col = (i - 1) % 5

        // สร้าง 9 ที่นั่งสำหรับแต่ละโต๊ะ
        const seats: Seat[] = []
        for (let seatNum = 1; seatNum <= 9; seatNum++) {
          seats.push({
            id: `${tableId}-${seatNum}`,
            tableId,
            seatNumber: seatNum,
            isBooked: Math.random() > 0.8, // สุ่มสถานะการจอง
          })
        }

        allTables.push({
          id: tableId,
          name: `${zone}${i}`,
          zone: zone,
          x: col * 200 + 50, // เพิ่มระยะห่างระหว่างโต๊ะ
          y: row * 200 + 50,
          seats: seats,
        })
      }
    })

    return allTables
  })

  // กรองโต๊ะตามโซนที่เปิดใช้งาน
  const activeZones = zoneConfigs.filter((zone) => zone.isActive).map((zone) => zone.id)
  const activeTables = tables.filter((table) => activeZones.includes(table.zone))

  const handleSeatClick = (seat: Seat) => {
    if (seat.isBooked) return

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

  // ฟังก์ชันคำนวณตำแหน่งเก้าอี้รอบโต๊ะวงกลม
  const getSeatPosition = (seatNumber: number, tableRadius = 60) => {
    // คำนวณมุมสำหรับแต่ละเก้าอี้ (360 องศา / 9 เก้าอี้ = 40 องศาต่อเก้าอี้)
    const angle = ((seatNumber - 1) * 40 - 90) * (Math.PI / 180) // เริ่มจากด้านบน (-90 องศา)
    const x = Math.cos(angle) * tableRadius
    const y = Math.sin(angle) * tableRadius
    return { x, y }
  }

  const renderZoneMap = (zone: string) => {
    const zoneTables = activeTables.filter((table) => table.zone === zone)

    if (zoneTables.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">โซนนี้ปิดให้บริการในขณะนี้</div>
    }

    return (
      <div className={cn("relative rounded-lg p-4 min-h-[800px] overflow-auto", getZoneColor(zone))}>
        {zoneTables.map((table) => (
          <div key={table.id} className="absolute" style={{ left: table.x, top: table.y }}>
            {/* โต๊ะวงกลม */}
            <div className="relative">
              {/* วงกลมโต๊ะ */}
              <div className="w-24 h-24 bg-amber-100 border-4 border-amber-300 rounded-full flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <div className="text-xs font-bold text-amber-800">{table.name}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTableSelect(table)}
                    className="text-xs h-4 p-1 mt-1 bg-amber-200 hover:bg-amber-300"
                  >
                    เลือกทั้งโต๊ะ
                  </Button>
                </div>
              </div>

              {/* เก้าอี้รอบโต๊ะ */}
              {table.seats.map((seat) => {
                const position = getSeatPosition(seat.seatNumber)
                const status = getSeatStatus(seat)

                return (
                  <button
                    key={seat.id}
                    className={cn(
                      "absolute w-8 h-8 rounded-full border-2 text-xs font-medium transition-all duration-200 transform hover:scale-110 flex items-center justify-center shadow-md",
                      getSeatColor(status),
                      seat.isBooked ? "cursor-not-allowed" : "cursor-pointer",
                    )}
                    style={{
                      left: `calc(50% + ${position.x}px - 16px)`, // ลบ 16px (ครึ่งหนึ่งของความกว้าง) เพื่อจัดกึ่งกลาง
                      top: `calc(50% + ${position.y}px - 16px)`, // ลบ 16px (ครึ่งหนึ่งของความสูง) เพื่อจัดกึ่งกลาง
                    }}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.isBooked}
                    title={`ที่นั่ง ${seat.seatNumber} - ${
                      seat.isBooked ? "จองแล้ว" : status === "selected" ? "เลือกแล้ว" : "ว่าง"
                    }`}
                  >
                    {seat.seatNumber}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>แผนผังโต๊ะและที่นั่ง</CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded-full"></div>
              <span>ว่าง</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary border border-primary rounded-full"></div>
              <span>เลือกแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 border border-red-600 rounded-full"></div>
              <span>จองแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-100 border-2 border-amber-300 rounded-full"></div>
              <span>โต๊ะ</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            แต่ละโต๊ะมี 9 ที่นั่งเรียงรอบโต๊ะวงกลม คลิกที่เก้าอี้เพื่อเลือกที่นั่ง หรือคลิก "เลือกทั้งโต๊ะ" เพื่อเลือกทั้งโต๊ะ
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
                </TabsTrigger>
              ))}
            </TabsList>

            {zoneConfigs.map((zone) => (
              <TabsContent key={zone.id} value={zone.id} className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{zone.name}</h3>
                  <p className="text-sm text-muted-foreground">{zone.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">โซนนี้มี 20 โต๊ะ (180 ที่นั่ง) - แต่ละโต๊ะมี 9 ที่นั่ง</p>
                </div>
                {renderZoneMap(zone.id)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {selectedSeats.length > 0 && (
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
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">ราคารวม: ฿{selectedSeats.length * 150}</span>
              <Button variant="outline" onClick={() => setSelectedSeats([])}>
                ยกเลิกทั้งหมด
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
