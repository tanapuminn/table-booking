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
import { Upload, CreditCard, QrCode, FileText } from "lucide-react";
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

  // คำนวณราคารวมเมื่อ component โหลด
  useEffect(() => {
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
  }, [selectedSeats, bookingInfo, calculateTotalPrice, router, toast]);

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

  const handleConfirmPayment = async () => {
    if (!bookingInfo) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่พบข้อมูลผู้จอง",
        variant: "destructive",
      });
      return;
    }

    if (!paymentImage) {
      toast({
        title: "กรุณาอัปโหลดหลักฐานการชำระเงิน",
        description: "โปรดอัปโหลดรูปภาพหลักฐานการชำระเงิน",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("customerName", bookingInfo.name);
      formData.append("phone", bookingInfo.phone);
      formData.append("seats", JSON.stringify(selectedSeats.map(seat => ({
        tableId: seat.tableId,
        seatNumber: seat.seatNumber,
        zone: tablePositions.find(t => t.id === seat.tableId)?.zone || "",
      }))));
      formData.append("notes", bookingInfo.notes || "");
      formData.append("totalPrice", totalPrice.toString());
      formData.append("bookingDate", new Date().toISOString());
      formData.append("status", "confirmed");
      if (paymentMethod === "upload" && paymentImage) {
        formData.append("paymentProof", paymentImage);
      }

      const response = await axios.post(`${baseURL}/api/bookings`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // อัปเดต state ด้วยข้อมูลการจอง
      addBookingRecord({
        id: response.data.id,
        customerName: bookingInfo.name,
        phone: bookingInfo.phone,
        seats: selectedSeats.map(seat => ({
          tableId: seat.tableId,
          seatNumber: seat.seatNumber,
          zone: tablePositions.find(t => t.id === seat.tableId)?.zone || "",
        })),
        notes: bookingInfo.notes,
        totalPrice,
        status: "confirmed",
        bookingDate: new Date().toISOString(),
        paymentProof: paymentMethod === "upload" && paymentImage ? URL.createObjectURL(paymentImage) : null,
      });

      // ล้างข้อมูลการจอง
      clearBooking();

      toast({
        title: "ยืนยันการชำระเงินสำเร็จ",
        description: "กำลังสร้างตั๋วของคุณ...",
      });

      setTimeout(() => {
        router.push(`/ticket?bookingId=${response.data.id}`);
      }, 1500);
    } catch (error: any) {
      console.log("Error confirming payment:", error);
      if (error.response.status === 409) {
        toast({
          title: "ข้อผิดพลาด",
          description: `ที่นั่งที่เลือกมีการจองแล้ว กรุณาเลือกที่นั่งอื่น`,
          variant: "destructive",
        });
        setTimeout(() => {
          router.push(`/`);
          window.location.reload();
        }, 1500);
      } else {
        toast({
          title: "ข้อผิดพลาด",
          description: `ไม่สามารถสร้างการจองได้: ${error instanceof Error ? error.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"}`,
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (selectedSeats.length === 0 || !bookingInfo) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p>ไม่พบข้อมูลการจอง กรุณาเลือกที่นั่งก่อน</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          กลับไปเลือกที่นั่ง
        </Button>
      </div>
    );
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
            <FileText className="h-5 w-5" />
            ข้อมูลการจอง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">ชื่อผู้จอง</Label>
              <p className="text-lg">{bookingInfo.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">เบอร์โทรศัพท์</Label>
              <p className="text-lg">{bookingInfo.phone}</p>
            </div>
          </div>

          {bookingInfo.notes && (
            <div>
              <Label className="text-sm font-medium">หมายเหตุ</Label>
              <p className="text-lg">{bookingInfo.notes}</p>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-sm font-medium">ที่นั่งที่จอง</Label>
            <div className="mt-2 space-y-2">
              {selectedSeats.map((seat) => {
                const tablePosition = tablePositions.find((t) => t.id === seat.tableId);
                return (
                  <div key={seat.id} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>
                      {tablePosition?.name || `โต๊ะ ${seat.tableId}`} ที่นั่ง {seat.seatNumber}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <PriceSummary selectedSeats={selectedSeats} />
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
            สแกน QR Code
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
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="payment-image" className="cursor-pointer">
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
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleConfirmPayment} className="w-full" size="lg" disabled={isLoading}>
        ยืนยันการชำระเงิน
      </Button>
    </div>
  );
}