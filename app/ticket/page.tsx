"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Home } from "lucide-react"
import { useBooking } from "@/components/booking-provider"
import type { BookingRecord } from "@/components/booking-provider"

export default function TicketPage() {
  const router = useRouter()
  const { selectedSeats, bookingInfo, clearBooking, addBookingRecord } = useBooking()
  const [bookingId] = useState(`BK${Date.now().toString().slice(-6)}`)
  const [bookingDate] = useState(
    new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  )

  const hasBookingSaved = useRef(false)

  useEffect(() => {
    if (selectedSeats.length === 0) {
      router.push("/")
      return
    }

    if (bookingInfo && selectedSeats.length > 0 && !hasBookingSaved.current) {
      // สร้างข้อมูลการจองพร้อมข้อมูลโซน
      const seatsWithZone = selectedSeats.map((seat) => {
        // คำนวณโซนจาก tableId
        let zone = "A"
        if (seat.tableId > 20 && seat.tableId <= 40) zone = "B"
        else if (seat.tableId > 40) zone = "C"

        return {
          tableId: seat.tableId,
          seatNumber: seat.seatNumber,
          zone: zone,
        }
      })

      const newBookingRecord: BookingRecord = {
        id: bookingId,
        customerName: bookingInfo.name,
        phone: bookingInfo.phone,
        seats: seatsWithZone,
        notes: bookingInfo.notes || undefined,
        totalPrice: selectedSeats.length * 150,
        status: "confirmed",
        bookingDate: bookingDate,
        paymentProof: "/placeholder.svg?height=200&width=300",
      }

      addBookingRecord(newBookingRecord)
      hasBookingSaved.current = true
    }
  }, [selectedSeats, bookingInfo, router, bookingId, bookingDate])

  const handleNewBooking = () => {
    clearBooking()
    router.push("/")
  }

  const handleDownloadTicket = () => {
    alert("ฟีเจอร์ดาวน์โหลดตั๋วจะพร้อมใช้งานเร็วๆ นี้")
  }

  if (selectedSeats.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p>กำลังตรวจสอบข้อมูล...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2 text-green-600">จองสำเร็จ!</h2>
        <p className="text-muted-foreground">ขอบคุณที่ใช้บริการ กรุณาเก็บตั๋วนี้ไว้เป็นหลักฐาน</p>
      </div>

      <Card className="border-2 border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-center text-2xl">ตั๋วจองโต๊ะ</CardTitle>
          <p className="text-center text-lg font-mono">{bookingId}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ชื่อผู้จอง</p>
              <p className="text-lg font-medium">{bookingInfo?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">เบอร์โทรศัพท์</p>
              <p className="text-lg font-medium">{bookingInfo?.phone}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">วันที่จอง</p>
            <p className="text-lg font-medium">{bookingDate}</p>
          </div>

          {bookingInfo?.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">หมายเหตุ</p>
              <p className="text-lg">{bookingInfo.notes}</p>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">ที่นั่งที่จอง</p>
            <div className="grid grid-cols-3 gap-2">
              {selectedSeats.map((seat) => {
                // คำนวณโซนและชื่อโต๊ะ
                let zone = "A"
                let tableNumber = seat.tableId
                if (seat.tableId > 20 && seat.tableId <= 40) {
                  zone = "B"
                  tableNumber = seat.tableId - 20
                } else if (seat.tableId > 40) {
                  zone = "C"
                  tableNumber = seat.tableId - 40
                }

                return (
                  <div
                    key={seat.id}
                    className="bg-primary text-primary-foreground p-2 rounded text-center font-medium text-sm"
                  >
                    {zone}
                    {tableNumber} ที่ {seat.seatNumber}
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">จำนวนที่นั่ง: {selectedSeats.length} ที่นั่ง</p>
            <p className="text-2xl font-bold text-primary">ราคารวม ฿{selectedSeats.length * 150}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>หมายเหตุ:</strong> กรุณานำตั๋วนี้มาแสดงเมื่อมาใช้บริการ และมาถึงก่อนเวลา 15 นาที
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleDownloadTicket} variant="outline" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          ดาวน์โหลดตั๋ว
        </Button>
        <Button onClick={handleNewBooking} className="flex-1">
          <Home className="h-4 w-4 mr-2" />
          จองใหม่
        </Button>
      </div>
    </div>
  )
}
