"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Upload, CreditCard } from "lucide-react"
import { useBooking } from "@/components/booking-provider"
import { useToast } from "@/hooks/use-toast"

export default function PaymentPage() {
  const router = useRouter()
  const { selectedSeats, bookingInfo, setPaymentProof } = useBooking()
  const { toast } = useToast()
  const [paymentImage, setPaymentImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const pricePerSeat = 150
  const totalPrice = selectedSeats.length * pricePerSeat

  useEffect(() => {
    if (selectedSeats.length === 0) {
      router.push("/")
    }
  }, [selectedSeats.length, router])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPaymentImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleConfirmPayment = () => {
    if (!paymentImage) {
      toast({
        title: "กรุณาอัพโหลดหลักฐานการชำระเงิน",
        description: "โปรดอัพโหลดรูปภาพหลักฐานการชำระเงิน",
        variant: "destructive",
      })
      return
    }

    setPaymentProof(paymentImage)
    toast({
      title: "ยืนยันการชำระเงินสำเร็จ",
      description: "กำลังสร้างตั๋วของคุณ...",
    })

    setTimeout(() => {
      router.push("/ticket")
    }, 1500)
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
        <h2 className="text-3xl font-bold mb-2">ชำระเงิน</h2>
        <p className="text-muted-foreground">ตรวจสอบข้อมูลการจองและทำการชำระเงิน</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ข้อมูลการจอง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">ชื่อผู้จอง</Label>
              <p className="text-lg">{bookingInfo?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">เบอร์โทรศัพท์</Label>
              <p className="text-lg">{bookingInfo?.phone}</p>
            </div>
          </div>

          {bookingInfo?.notes && (
            <div>
              <Label className="text-sm font-medium">หมายเหตุ</Label>
              <p className="text-lg">{bookingInfo.notes}</p>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-sm font-medium">ที่นั่งที่จอง</Label>
            <div className="mt-2 space-y-2">
              {selectedSeats.map((seat) => (
                <div key={seat.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>
                    โต๊ะ {seat.tableId} ที่นั่ง {seat.seatNumber}
                  </span>
                  <span className="font-medium">฿{pricePerSeat}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center text-lg font-bold">
            <span>ราคารวม</span>
            <span className="text-2xl text-primary">฿{totalPrice}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>อัพโหลดหลักฐานการชำระเงิน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <Label htmlFor="payment-image" className="cursor-pointer">
              <span className="text-lg font-medium">คลิกเพื่อเลือกรูปภาพ</span>
              <p className="text-sm text-muted-foreground mt-1">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB</p>
            </Label>
            <Input id="payment-image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {imagePreview && (
            <div className="mt-4">
              <Label className="text-sm font-medium">ตัวอย่างรูปภาพ</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Payment proof"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          )}

          <Button onClick={handleConfirmPayment} className="w-full" size="lg" disabled={!paymentImage}>
            ยืนยันการชำระเงิน
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
