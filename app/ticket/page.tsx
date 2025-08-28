"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Download, Home } from "lucide-react";
import { useBooking } from "@/components/booking-provider";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

type BookingSeat = {
  tableId: string;
  seatNumber: number;
};

type Booking = {
  id: string;
  customerName: string;
  phone: string;
  bookingDate: string;
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
  const router = useRouter();
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

  const handleDownloadTicket = () => {
    // Placeholder for PDF/image download
    alert("ฟีเจอร์ดาวน์โหลดตั๋วจะพร้อมใช้งานเร็วๆ นี้");
    // TODO: Implement PDF generation (e.g., using jsPDF)
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
            <p className="text-sm font-medium text-muted-foreground mb-2">ที่นั่งที่จอง</p>
            <div className="grid grid-cols-3 gap-2">
              {booking.seats.map((seat, index) => {
                const table = tablePositions.find((t) => String(t.id) === String(seat.tableId));
                return (
                  <div
                    key={index}
                    className="bg-primary text-primary-foreground p-2 rounded text-center font-medium text-sm"
                  >
                    {table?.name || `โต๊ะ ${seat.tableId}`} ที่ {seat.seatNumber}
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
              <img
                src={`${booking.paymentProof}`}
                alt="Payment proof"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>หมายเหตุ:</strong> กรุณาบันทึกภาพ(Capture)ตั๋วนี้ไว้เป็นหลักฐานการจอง
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        {/* <Button onClick={handleDownloadTicket} variant="outline" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          ดาวน์โหลดตั๋ว
        </Button> */}
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