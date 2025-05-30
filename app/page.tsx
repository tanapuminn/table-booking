"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TableMap } from "@/components/table-map"
import { useBooking } from "@/components/booking-provider"
import { useToast } from "@/hooks/use-toast"

export default function HomePage() {
  const router = useRouter()
  const { selectedSeats, setBookingInfo } = useBooking()
  const { toast } = useToast()

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    notes: "",
  })

  const handleBooking = () => {
    if (selectedSeats.length === 0) {
      toast({
        title: "กรุณาเลือกที่นั่ง",
        description: "โปรดเลือกโต๊ะหรือที่นั่งที่ต้องการจอง",
        variant: "destructive",
      })
      return
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "โปรดกรอกชื่อและเบอร์โทรศัพท์",
        variant: "destructive",
      })
      return
    }

    // บันทึกข้อมูลการจองก่อน
    setBookingInfo(customerInfo)

    // แสดงข้อความยืนยันการจอง
    toast({
      title: "ดำเนินการจองสำเร็จ",
      description: "กำลังนำท่านไปยังหน้าชำระเงิน",
    })

    // ใช้ setTimeout เพื่อให้แน่ใจว่า state ถูกอัพเดตและ toast แสดงก่อนที่จะ redirect
    setTimeout(() => {
      router.push("/payment")
    }, 500)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">เลือกโต๊ะและที่นั่ง</h2>
        <p className="text-muted-foreground">คลิกเพื่อเลือกโต๊ะหรือที่นั่งที่ต้องการจอง</p>
      </div>

      <TableMap />

      {selectedSeats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลการจอง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">ที่นั่งที่เลือก:</p>
              <div className="flex flex-wrap gap-2">
                {selectedSeats.map((seat) => (
                  <span key={seat.id} className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">
                    โต๊ะ {seat.tableId} ที่นั่ง {seat.seatNumber}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="กรอกชื่อ-นามสกุล"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="กรอกเบอร์โทรศัพท์"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea
                id="notes"
                value={customerInfo.notes}
                onChange={(e) => setCustomerInfo((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                rows={3}
              />
            </div>

            <Button onClick={handleBooking} className="w-full" size="lg">
              ดำเนินการจอง
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
