"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLoadingRouter } from "@/components/navigation-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock3, Home, XCircle } from "lucide-react";
import { useBooking } from "@/components/booking-provider";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { apiBaseUrl as baseURL } from "@/lib/api";

type BookingSeat = {
  tableId: string;
  seatNumber: number;
  studentName?: string;
  classLevel?: string;
};

type Booking = {
  id: string;
  customerName: string;
  phone: string;
  bookingDate: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "payment_timeout";
  paymentDeadline?: string;
  notes?: string;
  seats: BookingSeat[];
  totalPrice: number;
  paymentProof?: string;
};

// Loading component for Suspense fallback
function TicketLoading() {
  return (
    <div className="max-w-2xl mx-auto text-center py-8">
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  );
}

// Main ticket component that uses useSearchParams
function TicketContent() {
  const router = useLoadingRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { clearBooking, tablePositions } = useBooking();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get bookingId from URL query
  const bookingId = searchParams.get("bookingId");

  useEffect(() => {
    if (!bookingId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่พบรหัสการจอง",
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/bookings/${bookingId}`);
        setBooking(response.data);
      } catch (error) {
        toast({
          title: "ข้อผิดพลาด",
          description: `ไม่สามารถดึงข้อมูลการจองได้: ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`,
          variant: "destructive",
        });
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router, toast]);

  const handleNewBooking = () => {
    clearBooking();
    router.push("/");
  };

  const handleContinuePayment = () => {
    if (!booking) return;
    sessionStorage.setItem("pendingBookingId", booking.id);
    router.push("/payment");
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p>ไม่พบข้อมูลการจอง</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          กลับไปหน้าหลัก
        </Button>
      </div>
    );
  }

  const isConfirmed = booking.status === "confirmed";
  const isPending = booking.status === "pending_payment";
  const paymentExpired = isPending && booking.paymentDeadline
    ? new Date(booking.paymentDeadline).getTime() <= Date.now()
    : false;
  const statusTitle = isConfirmed ? "ยืนยันการจองแล้ว"
    : isPending ? "รอชำระเงิน"
    : booking.status === "cancelled" ? "การจองถูกยกเลิกแล้ว" : "หมดเวลาชำระเงินแล้ว";
  const statusDescription = isConfirmed
    ? "การจองได้รับการยืนยันแล้ว คุณสามารถเก็บหน้านี้ไว้ดูรายละเอียดได้"
    : isPending && paymentExpired
      ? "เลยกำหนดชำระเงินแล้ว กรุณาตรวจสอบสถานะอีกครั้งหรือสร้างการจองใหม่"
      : isPending
        ? "การจองยังไม่สมบูรณ์ กรุณาชำระเงินภายในเวลาที่กำหนด"
        : "รายการนี้ใช้ยืนยันสิทธิ์ที่นั่งไม่ได้ กรุณาสร้างการจองใหม่หากยังต้องการที่นั่ง";
  const statusClass = isConfirmed ? "text-green-700" : isPending ? "text-amber-700" : "text-red-700";
  const cardClass = isConfirmed ? "border-green-200" : isPending ? "border-amber-200" : "border-red-200";
  const headerClass = isConfirmed ? "bg-green-50" : isPending ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        {isConfirmed ? <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          : isPending ? <Clock3 className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            : <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />}
        <h2 className={`text-3xl font-bold mb-2 ${statusClass}`}>{statusTitle}</h2>
        <p className="text-muted-foreground">{statusDescription}</p>
      </div>

      <Card className={`border-2 ${cardClass}`}>
        <CardHeader className={headerClass}>
          <CardTitle className="text-center text-2xl">{isConfirmed ? "ตั๋วจองโต๊ะ" : "รายละเอียดการจอง"}</CardTitle>
          <p className="text-center text-lg font-mono">{booking.id}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ชื่อผู้จอง</p>
              <p className="text-lg font-medium">{booking.customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">เบอร์โทรศัพท์</p>
              <p className="text-lg font-medium">{booking.phone}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">วันที่จอง</p>
            <p className="text-lg font-medium">
              {new Date(booking.bookingDate).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {booking.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">หมายเหตุ</p>
              <p className="text-lg">{booking.notes}</p>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{isConfirmed ? "ที่นั่งที่จอง" : "ที่นั่งในรายการ"}</p>
            <div className="grid grid-cols-3 gap-2">
              {booking.seats.map((seat, index) => {
                const table = tablePositions.find((t) => String(t.id) === String(seat.tableId));
                return (
                  <div
                    key={index}
                    className="bg-primary text-primary-foreground p-2 rounded text-center font-medium text-sm"
                  >
                    <span className="block">{table?.name || `โต๊ะ ${seat.tableId}`} ที่ {seat.seatNumber}</span>
                    {(seat.studentName || seat.classLevel) && (
                      <span className="mt-1 block text-xs font-normal">{seat.studentName}{seat.classLevel ? ` · ${seat.classLevel}` : ""}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">จำนวนที่นั่ง: {booking.seats.length} ที่นั่ง</p>
            <p className="text-2xl font-bold text-primary">ราคารวม ฿{booking.totalPrice}</p>
          </div>

          {booking.paymentProof && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">หลักฐานการชำระเงิน</p>
              <Image src={booking.paymentProof} alt="Payment proof" width={800} height={600} unoptimized className="w-full h-full object-cover rounded-lg" />
            </div>
          )}

          {isConfirmed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>หมายเหตุ:</strong> กรุณาบันทึกภาพหน้าตั๋วนี้ไว้เป็นหลักฐานการจอง
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        {isPending && !paymentExpired && (
          <Button onClick={handleContinuePayment} variant="outline" className="flex-1">
            ไปชำระเงิน
          </Button>
        )}
        <Button onClick={handleNewBooking} className="flex-1">
          <Home className="h-4 w-4 mr-2" />
          จองใหม่
        </Button>
      </div>
    </div>
  );
}

// Main export component wrapped with Suspense
export default function TicketPage() {
  return (
    <Suspense fallback={<TicketLoading />}>
      <TicketContent />
    </Suspense>
  );
}
