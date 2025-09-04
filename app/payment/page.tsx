"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CreditCard, QrCode, FileText, Loader2, Clock, X } from "lucide-react";
import { useBooking } from "@/components/booking-provider";
import { useToast } from "@/hooks/use-toast";
import { PriceSummary } from "@/components/price-summary";
import { PaymentQRCode } from "@/components/payment-qr-code";
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

export default function PaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { selectedSeats, bookingInfo, setPaymentProof, calculateTotalPrice, tablePositions, zoneConfigs, addBookingRecord, clearBooking } = useBooking();
  const [paymentImage, setPaymentImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"qrcode" | "upload">("qrcode");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes = 1200 seconds
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [timerSyncInterval, setTimerSyncInterval] = useState<NodeJS.Timeout | null>(null);

  // โหลดข้อมูลการจองที่รอชำระเงิน
  useEffect(() => {
    const loadPendingBooking = async () => {
      const bookingId = sessionStorage.getItem('pendingBookingId');

      if (!bookingId) {
        // ถ้าไม่มี pending booking ID แต่มี selected seats ให้ใช้วิธีเดิม
        if (selectedSeats.length === 0 || !bookingInfo) {
          router.push("/");
          return;
        }

        try {
          const price = calculateTotalPrice(selectedSeats);
          setTotalPrice(price);
        } catch (error) {
          console.error("Error calculating price:", error);
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถคำนวณราคาได้ กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        // ดึงข้อมูลการจองจาก API
        const response = await fetch(`${baseURL}/api/bookings/${bookingId}`);
        if (!response.ok) {
          throw new Error('ไม่พบข้อมูลการจอง');
        }

        const booking = await response.json();
        setPendingBookingId(bookingId);
        setBookingData(booking);
        setTotalPrice(booking.totalPrice);

        // คำนวณเวลาที่เหลือจาก paymentDeadline
        if (booking.paymentDeadline) {
          const deadline = new Date(booking.paymentDeadline);
          const now = new Date();
          const remainingTime = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
          console.log("Remaining time (seconds):", remainingTime);
          setTimeLeft(remainingTime || 20 * 60); // ถ้า remainingTime เป็น 0 ให้ใช้ 20 นาที
        } else {
          setTimeLeft(20 * 60); // ถ้าไม่มี deadline ให้ใช้ 20 นาที
        }

      } catch (error) {
        console.error("Error loading booking:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลการจองได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingBooking();
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (!isTimerActive) return;
    
    // Initial timer setup
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          setIsTimerActive(false);
          handlePaymentTimeout();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Sync timer with server every 30 seconds
    const syncTimer = setInterval(async () => {
      const currentBookingId = pendingBookingId || sessionStorage.getItem('pendingBookingId');
      if (!currentBookingId) return;

      try {
        const response = await axios.post(`${baseURL}/api/bookings/check-expired`);
        const pendingBookings = response.data.pendingBookings;
        const currentBooking = pendingBookings.find((b: any) => b.id === currentBookingId);
        
        if (currentBooking) {
          const serverRemainingTime = Math.floor(currentBooking.remainingTime / 1000); // Convert to seconds
          if (Math.abs(serverRemainingTime - timeLeft) > 5) { // Only sync if difference is more than 5 seconds
            setTimeLeft(serverRemainingTime);
          }
        } else {
          // Booking not found in pending list - might have expired
          setIsTimerActive(false);
          handlePaymentTimeout();
        }
      } catch (error) {
        console.error('Error syncing timer:', error);
      }
    }, 50000); // Sync every 50 seconds

    setTimerSyncInterval(syncTimer);

    return () => {
      clearInterval(timer);
      if (timerSyncInterval) {
        clearInterval(timerSyncInterval);
      }
    };
  }, [isTimerActive, pendingBookingId, timeLeft]);

  // Add this cleanup effect
  useEffect(() => {
    return () => {
      if (timerSyncInterval) {
        clearInterval(timerSyncInterval);
      }
    };
  }, [timerSyncInterval]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "ข้อผิดพลาด",
          description: "ไฟล์มีขนาดใหญ่เกิน 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.match(/image\/(jpeg|png)/)) {
        toast({
          title: "ข้อผิดพลาด",
          description: "กรุณาอัปโหลดไฟล์ JPG หรือ PNG เท่านั้น",
          variant: "destructive",
        });
        return;
      }
      setPaymentImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelPayment = async () => {
    setIsTimerActive(false);

    // ตรวจสอบว่ามี pending booking ID หรือไม่
    const currentBookingId = pendingBookingId || sessionStorage.getItem('pendingBookingId');

    if (currentBookingId) {
      try {
        setIsSubmitting(true);
        // ส่งคำขอไปยัง API เพื่อเปลี่ยนสถานะเป็น cancelled
        await axios.put(`${baseURL}/api/bookings/${currentBookingId}`, {
          status: "cancelled"
        }, {
          headers: { "Content-Type": "application/json" },
        });

        toast({
          title: "ยกเลิกการชำระเงิน",
          description: "การจองของคุณถูกยกเลิกแล้ว",
          variant: "destructive",
        });
      } catch (error: any) {
        console.error("Error cancelling booking:", error);
        toast({
          title: "ข้อผิดพลาด",
          description: "ไม่สามารถยกเลิกการจองได้ กรุณาลองใหม่",
          variant: "destructive",
        });
      }
    }

    // ล้างข้อมูลการจอง
    clearBooking();
    sessionStorage.removeItem('pendingBookingId');
    router.push("/");
  };

  const handlePaymentTimeout = async () => {
    setIsTimerActive(false);

    const currentBookingId = pendingBookingId || sessionStorage.getItem('pendingBookingId');
    if (!currentBookingId) return;

    // Function to check expired status
    const checkExpiredStatus = async (): Promise<boolean> => {
      try {
        const res = await axios.post(`${baseURL}/api/bookings/check-expired`,
          { headers: { "Content-Type": "application/json" } }
        );
        return res.status === 200;
      } catch (error) {
        console.error("Error checking expired status:", error);
        return false;
      }
    };

    // Keep checking until we get a success response
    const retryInterval = setInterval(async () => {
      const isExpired = await checkExpiredStatus();

      if (isExpired) {
        clearInterval(retryInterval);

        toast({
          title: "หมดเวลาชำระเงิน",
          description: "การจองของคุณถูกยกเลิกแล้ว",
          variant: "destructive",
        });

        // Clear booking data and redirect
        clearBooking();
        sessionStorage.removeItem('pendingBookingId');
        router.push("/");
      }
    }, 5000); // Check every 5 seconds

    // Clear interval after 2 minutes to prevent infinite checking
    setTimeout(() => {
      clearInterval(retryInterval);
      console.log("Stopped checking expired status after timeout");
    }, 2 * 60 * 1000);
  };

  const handleConfirmPayment = async () => {
    // ตรวจสอบว่ามี pending booking หรือไม่
    const currentBookingId = pendingBookingId || sessionStorage.getItem('pendingBookingId');

    if (!currentBookingId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่พบข้อมูลการจอง",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "upload" && !paymentImage) {
      toast({
        title: "กรุณาอัปโหลดหลักฐานการชำระเงิน",
        description: "โปรดอัปโหลดรูปภาพหลักฐานการชำระเงิน",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setIsTimerActive(false);

    try {
      if (paymentMethod === "upload" && paymentImage) {
        // ใช้ confirm payment API สำหรับ upload
        const formData = new FormData();
        formData.append("paymentProof", paymentImage);
        formData.append("amount", totalPrice.toString());

        const response = await axios.post(`${baseURL}/api/bookings/${currentBookingId}/confirm-payment`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // อัปเดต state ด้วยข้อมูลการจอง
        addBookingRecord({
          id: response.data.id,
          customerName: response.data.customerName,
          phone: response.data.phone,
          seats: response.data.seats,
          notes: response.data.notes,
          totalPrice: response.data.totalPrice,
          status: "confirmed",
          bookingDate: response.data.bookingDate,
          paymentProof: response.data.paymentProof,
        });

        toast({
          title: "ยืนยันการชำระเงินสำเร็จ",
          description: "กำลังสร้างตั๋วของคุณ...",
        });

        setTimeout(() => {
          router.push(`/ticket?bookingId=${response.data.id}`);
        }, 1500);
      }
      // else {
      //   // สำหรับ QR Code payment - อัปเดตสถานะเป็น confirmed โดยตรง
      //   const response = await axios.put(`${baseURL}/api/bookings/${currentBookingId}`, {
      //     status: "confirmed"
      //   }, {
      //     headers: { "Content-Type": "application/json" },
      //   });

      //   // อัปเดต state ด้วยข้อมูลการจอง
      //   addBookingRecord({
      //     id: response.data.id,
      //     customerName: response.data.customerName,
      //     phone: response.data.phone,
      //     seats: response.data.seats,
      //     notes: response.data.notes,
      //     totalPrice: response.data.totalPrice,
      //     status: "confirmed",
      //     bookingDate: response.data.bookingDate,
      //     paymentProof: null,
      //   });

      //   toast({
      //     title: "ยืนยันการชำระเงินสำเร็จ",
      //     description: "กำลังสร้างตั๋วของคุณ...",
      //   });

      //   setTimeout(() => {
      //     router.push(`/ticket?bookingId=${response.data.id}`);
      //   }, 1500);
      // }

      // ล้างข้อมูลการจอง
      clearBooking();
      sessionStorage.removeItem('pendingBookingId');

    } catch (error: any) {
      console.log("Error confirming payment:", error);
      if (error.response?.status === 409) {
        toast({
          title: "ข้อผิดพลาด",
          description: `ที่นั่งที่เลือกมีการจองแล้ว กรุณาเลือกที่นั่งอื่น`,
          variant: "destructive",
        });
        setTimeout(() => {
          router.push(`/`);
          window.location.reload();
        }, 1500);
      } else if (error.response?.status === 400) {
        toast({
          title: "ข้อผิดพลาด",
          description: error.response.data.message || "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่",
          variant: "destructive",
        });
      } else {
        toast({
          title: "ข้อผิดพลาด",
          description: `ไม่สามารถยืนยันการชำระเงินได้: ${error instanceof Error ? error.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // ตรวจสอบว่ามีข้อมูลการจองหรือไม่ (ทั้งแบบเก่าและใหม่)
  const hasBookingData = bookingData || (selectedSeats.length > 0 && bookingInfo);

  if (!hasBookingData) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p>ไม่พบข้อมูลการจอง กรุณาเลือกที่นั่งก่อน</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          กลับไปเลือกที่นั่ง
        </Button>
      </div>
    );
  }

  // กำหนดข้อมูลที่จะแสดง (จาก API หรือจาก state)
  const displayBookingInfo = bookingData ? {
    name: bookingData.customerName,
    phone: bookingData.phone,
    notes: bookingData.notes
  } : bookingInfo;

  const displaySeats = bookingData ? bookingData.seats : selectedSeats;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">กำลังประมวลผล...</p>
            <p className="text-sm text-muted-foreground">กรุณารอสักครู่</p>
          </div>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">ชำระเงิน</h2>
        <p className="text-muted-foreground">ตรวจสอบข้อมูลการจองและทำการชำระเงิน</p>
      </div>



      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ข้อมูลการจอง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">ชื่อผู้จอง</Label>
              <p className="text-lg">{displayBookingInfo?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">เบอร์โทรศัพท์</Label>
              <p className="text-lg">{displayBookingInfo?.phone}</p>
            </div>
          </div>

          {displayBookingInfo?.notes && (
            <div>
              <Label className="text-sm font-medium">หมายเหตุ</Label>
              <p className="text-lg">{displayBookingInfo.notes}</p>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-sm font-medium">ที่นั่งที่จอง</Label>
            <div className="mt-2 space-y-2">
              {displaySeats.map((seat: any, index: number) => {
                const tablePosition = tablePositions.find((t) => t.id === seat.tableId);
                const seatKey = seat.id || `${seat.tableId}-${seat.seatNumber}-${index}`;
                return (
                  <div key={seatKey} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>
                      {tablePosition?.name || `โต๊ะ ${seat.tableId}`} ที่นั่ง {seat.seatNumber}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <PriceSummary selectedSeats={displaySeats} />
        </CardContent>
      </Card>

      {/* Timer Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-lg font-semibold text-orange-800">
              เวลาที่เหลือ: {formatTime(timeLeft)}
            </span>
          </div>
          <p className="text-center text-sm text-orange-600 mt-2">
            กรุณาทำการชำระเงินภายในเวลาที่กำหนด
          </p>
        </CardContent>
      </Card>

      <Tabs
        defaultValue="qrcode"
        className="w-full"
        onValueChange={(value) => setPaymentMethod(value as "qrcode" | "upload")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qrcode" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            ช่องทางชำระเงิน
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            อัพโหลดหลักฐาน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qrcode" className="mt-4">
          <PaymentQRCode amount={totalPrice} />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                อัพโหลดหลักฐานการชำระเงิน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Label htmlFor="payment-image" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <span className="text-lg font-medium">คลิกเพื่อเลือกรูปภาพ</span>
                  <p className="text-sm text-muted-foreground mt-1">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB</p>
                </Label>
                <Input
                  id="payment-image"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {imagePreview && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">ตัวอย่างรูปภาพ</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Payment proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={handleCancelPayment}
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          ยกเลิกการจอง
        </Button>
        <Button
          onClick={handleConfirmPayment}
          className="w-full"
          size="lg"
          disabled={isLoading || isSubmitting || !paymentImage}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังประมวลผล...
            </>
          ) : (
            "ยืนยันการชำระเงิน"
          )}
        </Button>
      </div>
    </div>
  );
}