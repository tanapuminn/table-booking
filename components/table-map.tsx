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

  // สร้างข้อมูลโต๊ะสำหรับ 3 โซน โซนละ 20 โต๊ะ
  const [tables] = useState<Table[]>(() => {
    const allTables: Table[] = []
    const zones = ["A", "B", "C"]

    zones.forEach((zone, zoneIndex) => {
      for (let i = 1; i <= 20; i++) {
        const tableId = zoneIndex * 20 + i
        const row = Math.floor((i - 1) / 5)
        const col = (i - 1) % 5

        allTables.push({
          id: tableId,
          name: `${zone}${i}`,
          zone: zone,
          x: col * 180 + 20,
          y: row * 120 + 20,
          seats: [
            { id: `${tableId}-1`, tableId, seatNumber: 1, isBooked: Math.random() > 0.8 },
            { id: `${tableId}-2`, tableId, seatNumber: 2, isBooked: Math.random() > 0.8 },
            { id: `${tableId}-3`, tableId, seatNumber: 3, isBooked: Math.random() > 0.8 },
            { id: `${tableId}-4`, tableId, seatNumber: 4, isBooked: Math.random() > 0.8 },
          ],
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
        return "bg-red-500 text-white cursor-not-allowed"
      case "selected":
        return "bg-primary text-primary-foreground"
      case "available":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      default:
        return "bg-gray-100"
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

  const renderZoneMap = (zone: string) => {
    const zoneTables = activeTables.filter((table) => table.zone === zone)

    if (zoneTables.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">โซนนี้ปิดให้บริการในขณะนี้</div>
    }

    return (
      <div className={cn("relative rounded-lg p-4 min-h-[500px] overflow-auto", getZoneColor(zone))}>
        {zoneTables.map((table) => (
          <div key={table.id} className="absolute" style={{ left: table.x, top: table.y }}>
            <Card className="w-36">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xs">{table.name}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleTableSelect(table)} className="text-xs h-6">
                    เลือก
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-1">
                  {table.seats.map((seat) => {
                    const status = getSeatStatus(seat)
                    return (
                      <Button
                        key={seat.id}
                        variant="outline"
                        size="sm"
                        className={cn("h-6 text-xs", getSeatColor(status))}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.isBooked}
                      >
                        {seat.seatNumber}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
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
              <div className="w-4 h-4 bg-green-100 border rounded"></div>
              <span>ว่าง</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary border rounded"></div>
              <span>เลือกแล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 border rounded"></div>
              <span>จองแล้ว</span>
            </div>
          </div>
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
