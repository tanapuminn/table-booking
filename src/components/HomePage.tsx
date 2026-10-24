"use client"
import React from "react"
import { useEffect, useRef, useState } from "react"
import { useLoadingRouter } from "@/components/navigation-loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TableMap } from "@/components/table-map"
import { useBooking } from "@/components/booking-provider"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { User, Loader2 } from "lucide-react"
import { apiBaseUrl as baseURL } from "@/lib/api"


export default function HomePage() {
    const router = useLoadingRouter()
    const { selectedSeats, setBookingInfo, calculateTotalPrice, tablePositions } = useBooking()
    const { user } = useAuth()
    const { toast } = useToast()

    const [customerInfo, setCustomerInfo] = useState({
        name: "",
        phone: "",
        notes: "",
    })
    const [isLoading, setIsLoading] = useState(false)

    const formRef = useRef<HTMLDivElement | null>(null)
    const hasPrefilledUserRef = useRef(false)
    const currentStep = selectedSeats.length > 0 ? 2 : 1

    useEffect(() => {
        if (!user || hasPrefilledUserRef.current) return

        setCustomerInfo((prev) => ({
            ...prev,
            name: prev.name || user.fullname || "",
            phone: prev.phone || user.phone || "",
        }))
        hasPrefilledUserRef.current = true
    }, [user])
    const scrollToForm = () => {
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)  // หน่วงนิดหน่อยเพื่อให้ state อัปเดตทัน
    }


    const handleBooking = async () => {
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

        try {
            // บันทึกข้อมูลการจองก่อน
            setBookingInfo(customerInfo)

            setIsLoading(true)

            // แสดงข้อความกำลังดำเนินการ
            toast({
                title: "กำลังดำเนินการจอง...",
                description: "โปรดรอสักครู่",
            })

            // สร้างการจองผ่าน API
            const bookingData = {
                customerName: customerInfo.name,
                phone: customerInfo.phone,
                seats: JSON.stringify(selectedSeats.map(seat => ({
                    tableId: seat.tableId,
                    seatNumber: seat.seatNumber,
                    zone: tablePositions.find((t) => t.id === seat.tableId)?.zone || "",
                    studentName: seat.studentName,
                    classLevel: seat.classLevel,
                }))),
                notes: customerInfo.notes || "",
                bookingDate: new Date().toISOString(),
            };

            const response = await fetch(`${baseURL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(bookingData),
            });

            const bookingResponse = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    toast({
                        title: "ข้อผิดพลาด",
                        description: `ที่นั่งที่เลือกมีการจองแล้ว กรุณาเลือกที่นั่งอื่น`,
                        variant: "destructive",
                        duration: 1500,
                    });

                    setTimeout(() => {
                        window.location.reload();
                    }, 2000)
                } else {
                    throw new Error(bookingResponse.message || 'เกิดข้อผิดพลาดในการสร้างการจอง');
                }
            } else {
                // บันทึก booking ID เพื่อใช้ในหน้า payment
                sessionStorage.setItem('pendingBookingId', bookingResponse.id);

                // แสดงข้อความสำเร็จ
                toast({
                    title: "สร้างการจองสำเร็จ",
                    description: "กำลังนำท่านไปยังหน้าชำระเงิน",
                })

                // ไปที่หน้าชำระเงิน
                setTimeout(() => {
                    router.push("/payment")
                }, 500)
            }
        } catch (error: any) {
            console.error('Booking error:', error);
            if (error.statusCode === 409) {
                toast({
                    title: "ข้อผิดพลาด",
                    description: `ที่นั่งที่เลือกมีการจองแล้ว กรุณาเลือกที่นั่งอื่น`,
                    variant: "destructive",
                });

                setTimeout(() => {
                    router.push("/")
                }, 1000)
            } else {
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: error instanceof Error ? error.message : "ไม่สามารถสร้างการจองได้ กรุณาลองใหม่อีกครั้ง",
                    variant: "destructive",
                })
            }
        }
    }

    return (
        <div className="space-y-8">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 text-xs font-medium sm:text-sm" aria-label="ขั้นตอนการจอง">
                {[
                    { number: 1, label: "เลือกโต๊ะ" },
                    { number: 2, label: "ข้อมูลผู้จอง" },
                    { number: 3, label: "ชำระเงิน" },
                ].map((step, index) => (
                    <React.Fragment key={step.number}>
                        {index > 0 && <div className={`h-px min-w-3 flex-1 ${step.number <= currentStep ? "bg-primary" : "bg-slate-200"}`} />}
                        <div aria-current={step.number === currentStep ? "step" : undefined} className={`flex items-center gap-1.5 whitespace-nowrap ${step.number === currentStep ? "text-primary" : "text-slate-500"}`}>
                            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${step.number <= currentStep ? "bg-primary text-white" : "bg-slate-100"}`}>{step.number}</span>
                            <span>{step.label}</span>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {/* Stage section */}
            {/* <div className="bg-red-400 text-white px-12 py-6 rounded-lg font-bold text-2xl shadow text-center">
                เวที
            </div> */}

            {/* Unified table map */}
            <TableMap onConfirmSelection={scrollToForm} />

            {/* Booking form */}
            {selectedSeats.length > 0 && (
                <Card ref={formRef} className="rounded-2xl border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            ข้อมูลผู้จอง
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            ยืนยันการจอง {new Set(selectedSeats.map((seat) => seat.tableId)).size} โต๊ะ · {selectedSeats.length} ที่นั่ง · {calculateTotalPrice(selectedSeats).toLocaleString("th-TH")} บาท
                            <span className="ml-1 text-slate-500">(แก้ไขรายการได้จากสรุปรายการด้านบน)</span>
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">ชื่อผู้จอง
                                    <span className="text-red-500"> * </span>
                                </Label>
                                <Input
                                    id="name"
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="กรอกชื่อ-นามสกุล"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">เบอร์โทรศัพท์
                                    <span className="text-red-500"> * </span>
                                </Label>
                                <Input
                                    id="phone"
                                    value={customerInfo.phone}
                                    maxLength={10}
                                    onChange={(e) => {
                                        const numericValue = e.target.value.replace(/\D/g, '');
                                        setCustomerInfo((prev) => ({ ...prev, phone: numericValue }));
                                    }}
                                    placeholder="กรอกเบอร์โทรศัพท์"
                                    pattern="[0-9]*"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
                            <p className="text-sm text-muted-foreground">หากรวมโต๊ะกับผู้อื่น กรุณาระบุชื่อนักเรียนและจำนวนที่นั่งเพื่อออกตั๋วเข้างาน</p>
                            <Textarea
                                id="notes"
                                value={customerInfo.notes}
                                onChange={(e) => setCustomerInfo((prev) => ({ ...prev, notes: e.target.value }))}
                                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                                rows={3}
                            />
                        </div>

                        <Button onClick={handleBooking} className="h-12 w-full text-base" size="lg" disabled={isLoading}>
                            ดำเนินการจอง
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-lg font-medium">กำลังประมวลผล...</p>
                        <p className="text-sm text-muted-foreground">กรุณารอสักครู่</p>
                    </div>
                </div>
            )}

        </div>
    )
}
