"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { Edit, Trash2, Eye, Search, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useBooking, type BookingRecord } from "@/components/booking-provider"

export default function DashboardPage() {
  const { toast } = useToast()
  const { bookingHistory, updateBookingRecord, zoneConfigs, updateZoneConfig } = useBooking()
  const [searchTerm, setSearchTerm] = useState("")
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null)

  const filteredBookings = bookingHistory.filter(
    (booking) =>
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.includes(searchTerm) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCancelBooking = (bookingId: string) => {
    updateBookingRecord(bookingId, { status: "cancelled" })
    toast({
      title: "ยกเลิกการจองสำเร็จ",
      description: `ยกเลิกการจอง ${bookingId} เรียบร้อยแล้ว`,
    })
  }

  const handleEditBooking = (updatedBooking: BookingRecord) => {
    updateBookingRecord(updatedBooking.id, updatedBooking)
    setEditingBooking(null)
    toast({
      title: "แก้ไขข้อมูลสำเร็จ",
      description: `แก้ไขข้อมูลการจอง ${updatedBooking.id} เรียบร้อยแล้ว`,
    })
  }

  const handleZoneToggle = (zoneId: string, isActive: boolean) => {
    updateZoneConfig(zoneId, isActive)
    toast({
      title: `${isActive ? "เปิด" : "ปิด"}โซน ${zoneId} สำเร็จ`,
      description: `โซน ${zoneId} ${isActive ? "พร้อมให้บริการ" : "ปิดให้บริการชั่วคราว"}`,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "ยืนยันแล้ว"
      case "pending":
        return "รอยืนยัน"
      case "cancelled":
        return "ยกเลิกแล้ว"
      default:
        return status
    }
  }

  const getZoneStats = () => {
    const stats = { A: 0, B: 0, C: 0 }
    bookingHistory
      .filter((booking) => booking.status === "confirmed")
      .forEach((booking) => {
        booking.seats.forEach((seat) => {
          if (seat.zone && stats.hasOwnProperty(seat.zone)) {
            stats[seat.zone as keyof typeof stats]++
          }
        })
      })
    return stats
  }

  const zoneStats = getZoneStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">จัดการระบบจองโต๊ะ</h2>
        <Badge variant="outline" className="text-lg px-3 py-1">
          ทั้งหมด {bookingHistory.length} รายการ
        </Badge>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bookings">จัดการการจอง</TabsTrigger>
          <TabsTrigger value="zones">จัดการโซน</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยชื่อ, เบอร์โทร หรือรหัสการจอง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {booking.customerName}
                        <Badge className={getStatusColor(booking.status)}>{getStatusText(booking.status)}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        รหัสการจอง: {booking.id} | {booking.bookingDate}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {booking.paymentProof && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>หลักฐานการชำระเงิน</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <img
                                src={booking.paymentProof || "/placeholder.svg"}
                                alt="Payment proof"
                                className="w-full rounded-lg"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingBooking(booking)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>แก้ไขข้อมูลการจอง</DialogTitle>
                          </DialogHeader>
                          {editingBooking && (
                            <EditBookingForm
                              booking={editingBooking}
                              onSave={handleEditBooking}
                              onCancel={() => setEditingBooking(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>

                      {booking.status !== "cancelled" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ยกเลิกการจอง</AlertDialogTitle>
                              <AlertDialogDescription>
                                คุณแน่ใจหรือไม่ที่จะยกเลิกการจอง {booking.id}? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancelBooking(booking.id)}>
                                ยืนยันการยกเลิก
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">เบอร์โทรศัพท์</Label>
                      <p>{booking.phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">ที่นั่งที่จอง</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {booking.seats.map((seat, index) => (
                          <Badge key={index} variant="secondary">
                            {seat.zone ? `${seat.zone}${seat.tableId % 20 || 20}` : `โต๊ะ ${seat.tableId}`} ที่{" "}
                            {seat.seatNumber}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">ราคารวม</Label>
                      <p className="text-lg font-bold text-primary">฿{booking.totalPrice}</p>
                    </div>
                  </div>
                  {booking.notes && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">หมายเหตุ</Label>
                      <p className="text-sm text-muted-foreground">{booking.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredBookings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">ไม่พบข้อมูลการจองที่ตรงกับการค้นหา</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {zoneConfigs.map((zone) => (
              <Card key={zone.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {zone.name}
                    </CardTitle>
                    <Switch checked={zone.isActive} onCheckedChange={(checked) => handleZoneToggle(zone.id, checked)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">คำอธิบาย</Label>
                    <p className="text-sm text-muted-foreground">{zone.description}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">สถานะ</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={zone.isActive ? "default" : "secondary"}>
                        {zone.isActive ? "เปิดให้บริการ" : "ปิดให้บริการ"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">จำนวนที่นั่งที่จองแล้ว</Label>
                    <p className="text-2xl font-bold text-primary">
                      {zoneStats[zone.id as keyof typeof zoneStats]} ที่นั่ง
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">โซนนี้มีโต๊ะทั้งหมด 20 โต๊ะ (80 ที่นั่ง)</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>สรุปภาพรวม</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{zoneConfigs.filter((z) => z.isActive).length}/3</p>
                  <p className="text-sm text-muted-foreground">โซนที่เปิดให้บริการ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {Object.values(zoneStats).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">ที่นั่งที่จองแล้ว</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {zoneConfigs.filter((z) => z.isActive).length * 80}
                  </p>
                  <p className="text-sm text-muted-foreground">ที่นั่งที่เปิดให้บริการ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {bookingHistory.filter((b) => b.status === "confirmed").length}
                  </p>
                  <p className="text-sm text-muted-foreground">การจองที่ยืนยันแล้ว</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EditBookingForm({
  booking,
  onSave,
  onCancel,
}: {
  booking: BookingRecord
  onSave: (booking: BookingRecord) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    customerName: booking.customerName,
    phone: booking.phone,
    notes: booking.notes || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...booking,
      customerName: formData.customerName,
      phone: formData.phone,
      notes: formData.notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">ชื่อ-นามสกุล</Label>
        <Input
          id="edit-name"
          value={formData.customerName}
          onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">เบอร์โทรศัพท์</Label>
        <Input
          id="edit-phone"
          value={formData.phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes">หมายเหตุ</Label>
        <Textarea
          id="edit-notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  )
}
