"use client"
import React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TableMap } from "@/components/table-map"
import { useBooking } from "@/components/booking-provider"
import { useToast } from "@/hooks/use-toast"
import { Settings, User, Copyright, Loader2 } from "lucide-react"


export default function HomePage() {
    const router = useRouter()
    const { selectedSeats, setBookingInfo, calculateTotalPrice, tablePositions } = useBooking()
    const { toast } = useToast()

    const [customerInfo, setCustomerInfo] = useState({
        name: "",
        phone: "",
        notes: "",
    })
    const [isLoading, setIsLoading] = useState(false)

    const formRef = useRef<HTMLDivElement | null>(null)

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
                }))),
                notes: customerInfo.notes || "",
                bookingDate: new Date().toISOString(),
            };

            const baseURL = process.env.NEXT_PUBLIC_BASE_URL;
            const response = await fetch(`${baseURL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

    const navigateToDashboard = () => {
        router.push("/psmnlp-dashboard")
    }

    return (
        <div className="space-y-8">
            {/* Header section */}
            <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                    <h2 className="text-3xl font-bold mb-2">แผนผังการจอง</h2>
                    <p className="text-muted-foreground">เลือกโต๊ะหรือที่นั่งที่ต้องการจอง</p>
                </div>
            </div>

            {/* Stage section */}
            {/* <div className="bg-red-400 text-white px-12 py-6 rounded-lg font-bold text-2xl shadow text-center">
                เวที
            </div> */}

            {/* Unified table map */}
            <TableMap onConfirmSelection={scrollToForm} />

            {/* Booking form */}
            {selectedSeats.length > 0 && (
                <Card ref={formRef}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            ข้อมูลการจอง
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Selected seats */}
                        <div>
                            <p className="font-medium mb-2">ที่นั่งที่เลือก:</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedSeats.map((seat) => {
                                    const table = tablePositions.find(t => t.id === seat.tableId);
                                    const isVip = table?.zone === "VIP";
                                    return (
                                        <span
                                            key={seat.id}
                                            className={`${isVip ? 'bg-purple-600' : 'bg-blue-600'} text-white px-2 py-1 rounded text-sm`}
                                        >
                                            โต๊ะ {table?.name} ที่นั่ง {seat.seatNumber}
                                            {isVip && ' (VIP)'}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

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
                            <Label htmlFor="notes">หมายเหตุ: ระบุชื่อนักเรียนพร้อมระบุจำนวนที่นั่งที่ทำการจอง (กรณีรวมโต๊ะกับท่านอื่น) เพื่อนำไปออกตั๋วเข้างาน</Label>
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

            {/* New Footer */}
            <footer className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
                <span>Copyright 2025</span>
                <Copyright className="h-4 w-4"
                    // onClick={navigateToDashboard}
                />
                <span>Tanapumin</span>
            </footer>
        </div>
    )
}
