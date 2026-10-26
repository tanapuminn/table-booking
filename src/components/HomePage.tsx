"use client"
import React from "react"
import Link from "next/link"
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
import { User, Loader2, ArrowRight, Clock3, Ticket } from "lucide-react"
import { apiBaseUrl as baseURL } from "@/lib/api"


export default function HomePage() {
    const router = useLoadingRouter()
    const { selectedSeats, setSelectedSeats, setBookingInfo, calculateTotalPrice, tablePositions } = useBooking()
    const { user, isLoading: authLoading } = useAuth()
    const { toast } = useToast()

    const [customerInfo, setCustomerInfo] = useState({
        name: "",
        phone: "",
        notes: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [bookingStatus, setBookingStatus] = useState<{ bookingEnabled: boolean; paymentConfigured: boolean } | null>(null)
    const [statusLoadFailed, setStatusLoadFailed] = useState(false)

    useEffect(() => {
        let active = true
        const loadBookingStatus = async () => {
            try {
                const response = await fetch(`${baseURL}/api/settings`, { cache: "no-store" })
                if (!response.ok) throw new Error("Unable to load payment settings")
                const settings = await response.json()
                if (active) setStatusLoadFailed(false)
                if (active) setBookingStatus({
                    bookingEnabled: settings.bookingEnabled === true,
                    paymentConfigured: settings.paymentConfigured === true,
                })
                if (active && (settings.bookingEnabled !== true || settings.paymentConfigured !== true)) setSelectedSeats([])
            } catch {
                if (active) setStatusLoadFailed(true)
                if (active) setBookingStatus({ bookingEnabled: false, paymentConfigured: false })
            }
        }
        const refreshOnVisible = () => { if (!document.hidden) loadBookingStatus() }
        loadBookingStatus()
        window.addEventListener("site-settings-updated", loadBookingStatus)
        window.addEventListener("focus", loadBookingStatus)
        document.addEventListener("visibilitychange", refreshOnVisible)
        return () => {
            active = false
            window.removeEventListener("site-settings-updated", loadBookingStatus)
            window.removeEventListener("focus", loadBookingStatus)
            document.removeEventListener("visibilitychange", refreshOnVisible)
        }
    }, [setSelectedSeats])

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
        if (!bookingStatus?.bookingEnabled || !bookingStatus.paymentConfigured) {
            toast({ title: "ยังไม่เปิดรับจอง", description: "กรุณารอผู้ดูแลระบบเปิดรับจอง", variant: "destructive" })
            return
        }
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

        let bookingCreated = false
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
                    throw new Error(response.status === 503
                        ? "ยังไม่เปิดรับจอง กรุณาติดต่อผู้ดูแลระบบ"
                        : response.status >= 500
                            ? "ระบบไม่สามารถสร้างการจองได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
                            : bookingResponse.error?.message || bookingResponse.message || 'เกิดข้อผิดพลาดในการสร้างการจอง');
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
                bookingCreated = true
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
        } finally {
            if (!bookingCreated) setIsLoading(false)
        }
    }

    if (bookingStatus === null) {
        return <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />กำลังตรวจสอบสถานะการจอง...</div>
    }

    if (statusLoadFailed) {
        return (
            <Card className="mx-auto max-w-2xl rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="space-y-4 px-6 py-10 text-center">
                    <h1 className="text-2xl font-bold">ตรวจสอบสถานะการจองไม่สำเร็จ</h1>
                    <p className="text-muted-foreground">กรุณาลองโหลดหน้าใหม่อีกครั้ง</p>
                    <Button onClick={() => window.location.reload()}>ลองอีกครั้ง</Button>
                </CardContent>
            </Card>
        )
    }

    if (!bookingStatus.bookingEnabled || !bookingStatus.paymentConfigured) {
        return (
            <section className="prelaunch-enter relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#f2d9e6] bg-[radial-gradient(circle_at_82%_12%,#ffe6f0_0,transparent_34%),linear-gradient(135deg,#fffafc_0%,#fff_56%,#fff8f1_100%)] shadow-[0_20px_70px_-40px_rgba(165,36,103,0.35)]" aria-labelledby="prebooking-title">
                <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-primary/10" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full border border-primary/10" aria-hidden="true" />
                <div className="relative flex min-h-[440px] flex-col items-center justify-center gap-7 px-6 py-12 text-center sm:px-12 sm:py-16">
                    <div className="prelaunch-float flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-white text-primary shadow-[0_16px_32px_-18px_rgba(181,31,112,0.65)]" aria-hidden="true">
                        <Ticket className="h-8 w-8" />
                    </div>
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/85 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
                            <span className="relative flex h-2.5 w-2.5" aria-hidden="true"><span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" /></span>
                            ยังไม่เปิดรับจอง
                        </div>
                        <div className="space-y-4">
                            <h1 id="prebooking-title" className="mx-auto max-w-2xl text-4xl font-extrabold leading-[1.2] tracking-tight text-slate-950 sm:text-5xl">
                                เตรียมพบกับการ<span className="text-primary">เปิดรับจอง</span>
                            </h1>
                            <p className="mx-auto max-w-xl text-base leading-8 text-slate-600">
                                ขณะนี้ยังไม่เปิดให้เลือกโต๊ะและที่นั่ง เมื่อเปิดรับจองแล้วสามารถกลับมาจองที่หน้านี้ได้
                            </p>
                        </div>
                        <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-primary/10 bg-white/80 px-4 py-2 text-sm text-slate-600">
                            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                            <span>วันและเวลาเปิดรับจองจะประกาศอีกครั้ง</span>
                        </div>
                        {!authLoading && (!user ? (
                            <div className="flex flex-col justify-center gap-3 sm:flex-row">
                                <Button asChild size="lg" className="h-12 rounded-xl px-7 text-base shadow-[0_12px_24px_-12px_rgba(181,31,112,0.75)] transition-transform hover:-translate-y-0.5"><Link href="/register">สมัครสมาชิก <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-primary/20 bg-white/80 px-7 text-base"><Link href="/login">เข้าสู่ระบบ</Link></Button>
                            </div>
                        ) : null)}
                    </div>
                </div>
            </section>
        )
    }

    if (authLoading) {
        return <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />กำลังตรวจสอบบัญชีผู้ใช้...</div>
    }

    if (!user) {
        return (
            <section className="mx-auto max-w-3xl px-1 py-6 sm:py-12" aria-labelledby="booking-login-title">
                <Card className="rounded-2xl border-primary/20 shadow-sm">
                    <CardContent className="space-y-6 px-6 py-10 text-center sm:px-12 sm:py-14">
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800">เปิดรับจองแล้ว</span>
                        <div className="space-y-3">
                            <h1 id="booking-login-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">เข้าสู่ระบบเพื่อเลือกที่นั่ง</h1>
                            <p className="text-sm text-slate-600 sm:text-base">เข้าสู่ระบบหรือสมัครสมาชิกก่อนเริ่มจองโต๊ะและที่นั่ง</p>
                        </div>
                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                            <Button asChild size="lg"><Link href="/login">เข้าสู่ระบบ</Link></Button>
                            <Button asChild size="lg" variant="outline"><Link href="/register">สมัครสมาชิก</Link></Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        )
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
