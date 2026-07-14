"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ArrowLeft, CalendarDays, Loader2, Mail, Phone, Save, Ticket, User } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

const baseURL = process.env.NEXT_PUBLIC_BASE_URL

type Screen = "profile" | "history"

type Seat = {
  tableId: number
  seatNumber: number
  zone: string
  tableName: string
}

type Booking = {
  id: string
  customerName: string
  phone: string
  seats: Seat[]
  totalPrice: number
  status: "pending_payment" | "confirmed" | "cancelled" | "payment_timeout"
  bookingDate: string
  notes?: string
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_payment: {
    label: "รอชำระเงิน",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  },
  confirmed: {
    label: "ยืนยันแล้ว",
    className: "bg-green-100 text-green-800 border border-green-300",
  },
  cancelled: {
    label: "ยกเลิก",
    className: "bg-gray-100 text-gray-600 border border-gray-300",
  },
  payment_timeout: {
    label: "หมดเวลา",
    className: "bg-red-100 text-red-700 border border-red-300",
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getSeatLabel(seats: Seat[]) {
  return seats
    .map((seat) => `${seat.tableName || `โต๊ะ ${seat.tableId}`} ที่นั่ง ${seat.seatNumber}`)
    .join(", ")
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [activeScreen, setActiveScreen] = useState<Screen>("profile")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({ fullname: "", phone: "" })

  useEffect(() => {
    setFormData({
      fullname: user?.fullname || "",
      phone: user?.phone || "",
    })
  }, [user?.fullname, user?.phone])

  const fetchBookings = useCallback(() => {
    setIsLoadingBookings(true)
    axios
      .get(`${baseURL}/api/bookings/my`)
      .then((res) => setBookings(res.data))
      .catch(() => setBookings([]))
      .finally(() => setIsLoadingBookings(false))
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleSaveProfile = async () => {
    const fullname = formData.fullname.trim()
    const phone = formData.phone.trim()

    if (!fullname) {
      toast({ title: "กรุณากรอกชื่อ-นามสกุล", variant: "destructive" })
      return
    }

    if (!/^0\d{9}$/.test(phone)) {
      toast({ title: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วย 0", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      await updateProfile({ fullname, phone })
      toast({ title: "บันทึกข้อมูลโปรไฟล์แล้ว" })
      fetchBookings()
    } catch (error: any) {
      const message = error?.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่"
      toast({ title: "บันทึกไม่สำเร็จ", description: message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const sidebarItems = [
    { id: "profile" as const, label: "โปรไฟล์", icon: User },
    { id: "history" as const, label: "ประวัติการจอง", icon: CalendarDays },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-5 gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        ย้อนกลับ
      </Button>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-2 border-b pb-4 md:border-b-0 md:border-r md:pr-4 md:pb-0">
          <div className="px-2 pb-3">
            <p className="text-sm text-muted-foreground">บัญชีผู้ใช้</p>
            <p className="truncate font-semibold">{user?.fullname || "ผู้ใช้งาน"}</p>
          </div>
          <nav className="flex gap-2 md:flex-col">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreen(item.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main>
          {activeScreen === "profile" ? (
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลโปรไฟล์</CardTitle>
                <CardDescription>แก้ไขข้อมูลที่ใช้สำหรับการจองและการติดต่อ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullname">ชื่อ-นามสกุล</Label>
                    <Input
                      id="fullname"
                      value={formData.fullname}
                      onChange={(event) => setFormData((prev) => ({ ...prev, fullname: event.target.value }))}
                      placeholder="กรอกชื่อ-นามสกุล"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) => {
                        const phone = event.target.value.replace(/\D/g, "")
                        setFormData((prev) => ({ ...prev, phone }))
                      }}
                      placeholder="0xxxxxxxxx"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{user?.phone || "ยังไม่ได้เพิ่มเบอร์โทร"}</span>
                  </div>
                </div>

                {user?.role === "admin" && (
                  <div className="inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                    Admin
                  </div>
                )}

                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  บันทึกข้อมูล
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>ประวัติการจอง</CardTitle>
                <CardDescription>รายการจองทั้งหมดที่ผูกกับเบอร์โทรของบัญชีนี้</CardDescription>
              </CardHeader>
              {isLoadingBookings ? (
                <CardContent className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              ) : bookings.length === 0 ? (
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  ยังไม่มีประวัติการจอง
                </CardContent>
              ) : (
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสการจอง</TableHead>
                        <TableHead>วันที่จอง</TableHead>
                        <TableHead>โต๊ะ / ที่นั่ง</TableHead>
                        <TableHead className="text-center">จำนวน</TableHead>
                        <TableHead className="text-right">ราคา</TableHead>
                        <TableHead className="text-center">สถานะ</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => {
                        const status = STATUS_CONFIG[booking.status] ?? {
                          label: booking.status,
                          className: "bg-gray-100 text-gray-600 border border-gray-300",
                        }

                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{booking.id}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{formatDate(booking.createdAt)}</TableCell>
                            <TableCell className="max-w-[260px] text-sm">
                              <span className="line-clamp-2">{getSeatLabel(booking.seats)}</span>
                            </TableCell>
                            <TableCell className="text-center text-sm">{booking.seats.length}</TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                              ฿{booking.totalPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
                                {status.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {booking.status === "confirmed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => router.push(`/ticket?bookingId=${booking.id}`)}
                                >
                                  <Ticket className="h-3.5 w-3.5" />
                                  ดูตั๋ว
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}