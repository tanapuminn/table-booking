"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Edit, Trash2, Eye, Search, Settings, Home, Plus, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBooking, type BookingRecord } from "@/components/booking-provider";
import { TableLayoutEditor } from "@/components/table-layout-editor";
import { useRouter } from "next/navigation";
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { bookingHistory, updateBookingRecord, zoneConfigs, updateZoneConfig, setBookingHistory } = useBooking();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [newZone, setNewZone] = useState({
    id: "",
    name: "",
    description: "",
    allowIndividualSeatBooking: true,
    seatPrice: 0,
    tablePrice: 0,
  });
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");

  // const filteredBookings = bookingHistory.filter(
  //   (booking) =>
  //     booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     booking.phone.includes(searchTerm) ||
  //     booking.id.toLowerCase().includes(searchTerm.toLowerCase()),
  // );
  const filteredBookings = bookingHistory.filter((booking) => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.includes(searchTerm) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });




  const handleChangeStatus = async (bookingId: string, newStatus: "confirmed" | "cancelled") => {
    try {
      const confirmDelete = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้?");
      if (!confirmDelete) return;
      // เรียก API เพื่ออัปเดตสถานะ
      await axios.patch(`${baseURL}/api/bookings/${bookingId}`, { status: newStatus });

      // อัปเดต bookingHistory ใน BookingProvider
      // updateBookingRecord(bookingId, { status: newStatus });
      setBookingHistory((prev) =>
        prev.map((booking) => (booking.id === bookingId ? { ...booking, status: newStatus } : booking))
      );

      toast({
        title: "เปลี่ยนสถานะการจองสำเร็จ",
        description: `การจอง ${bookingId} ถูกเปลี่ยนเป็น "${getStatusText(newStatus)}"`,
      });
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: `ไม่สามารถเปลี่ยนสถานะการจองได้: ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`,
        variant: "destructive",
      });
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    handleChangeStatus(bookingId, "cancelled");
  };

  const handleEditBooking = (updatedBooking: BookingRecord) => {
    updateBookingRecord(updatedBooking.id, updatedBooking);
    setEditingBooking(null);
    toast({
      title: "แก้ไขข้อมูลสำเร็จ",
      description: `แก้ไขข้อมูลการจอง ${updatedBooking.id} เรียบร้อยแล้ว`,
    });
  };

  const handleZoneToggle = (zoneId: string, isActive: boolean) => {
    updateZoneConfig(zoneId, { isActive });
    toast({
      title: `${isActive ? "เปิด" : "ปิด"}โซน ${zoneId} สำเร็จ`,
      description: `โซน ${zoneId} ${isActive ? "พร้อมให้บริการ" : "ปิดให้บริการชั่วคราว"}`,
    });
  };

  const handleIndividualSeatBookingToggle = (zoneId: string, allowIndividualSeatBooking: boolean) => {
    updateZoneConfig(zoneId, { allowIndividualSeatBooking });
    toast({
      title: `${allowIndividualSeatBooking ? "เปิด" : "ปิด"}การจองรายที่นั่งในโซน ${zoneId}`,
      description: `โซน ${zoneId} ${allowIndividualSeatBooking ? "สามารถจองรายที่นั่งได้" : "จองได้เฉพาะทั้งโต๊ะ"}`,
    });
  };

  const handlePriceChange = (zoneId: string, type: "seatPrice" | "tablePrice", value: number) => {
    if (value < 0) return;
    updateZoneConfig(zoneId, { [type]: value });
    toast({
      title: "อัพเดทราคาสำเร็จ",
      description: `อัพเดทราคา${type === "seatPrice" ? "ต่อที่นั่ง" : "ต่อโต๊ะ"}ของโซน ${zoneId} เป็น ${value} บาท`,
    });
  };

  const handleAddZone = async () => {
    try {
      if (!newZone.id || !newZone.name || !newZone.description || newZone.seatPrice < 0 || newZone.tablePrice < 0) {
        toast({
          title: "ข้อผิดพลาด",
          description: "กรุณากรอกข้อมูลให้ครบถ้วนและตรวจสอบว่าราคาไม่ติดลบ",
          variant: "destructive",
        });
        return;
      }

      await axios.post(`${baseURL}/api/zones`, {
        id: newZone.id,
        name: newZone.name,
        description: newZone.description,
        allowIndividualSeatBooking: newZone.allowIndividualSeatBooking,
        seatPrice: newZone.seatPrice,
        tablePrice: newZone.tablePrice,
      });

      updateZoneConfig(newZone.id, {
        id: newZone.id,
        name: newZone.name,
        description: newZone.description,
        isActive: true,
        allowIndividualSeatBooking: newZone.allowIndividualSeatBooking,
        seatPrice: newZone.seatPrice,
        tablePrice: newZone.tablePrice,
      });

      setNewZone({
        id: "",
        name: "",
        description: "",
        allowIndividualSeatBooking: true,
        seatPrice: 0,
        tablePrice: 0,
      });
      setIsAddZoneOpen(false);
      toast({
        title: "เพิ่มโซนสำเร็จ",
        description: `โซน ${newZone.id} - ${newZone.name} ถูกเพิ่มเรียบร้อยแล้ว`,
      });
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: `ไม่สามารถเพิ่มโซนได้: ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      await axios.delete(`${baseURL}/api/zones/${zoneId}`);
      updateZoneConfig(zoneId, { isActive: false }); // อัปเดต state ให้โซนถูกปิด
      toast({
        title: "ลบโซนสำเร็จ",
        description: `โซน ${zoneId} ถูกลบเรียบร้อยแล้ว`,
      });
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: `ไม่สามารถลบโซนได้: ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`,
        variant: "destructive",
      });
    }
  };

  const navigateToHome = () => {
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "ยืนยันแล้ว";
      case "cancelled":
        return "ยกเลิกแล้ว";
      default:
        return status;
    }
  };

  const getZoneStats = () => {
    const stats: Record<string, number> = zoneConfigs.reduce((acc, zone) => ({ ...acc, [zone.id]: 0 }), {});
    bookingHistory
      .filter((booking) => booking.status === "confirmed")
      .forEach((booking) => {
        booking.seats.forEach((seat) => {
          if (seat.zone && stats.hasOwnProperty(seat.zone)) {
            stats[seat.zone]++;
          }
        });
      });
    return stats;
  };

  const zoneStats = getZoneStats();

  const handleOpenTicket = (bookingId: string) => {
    router.push(`/ticket?bookingId=${bookingId}`);
  }

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const confirmDelete = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการจองนี้?");
      if (!confirmDelete) return;

      await axios.delete(`${baseURL}/api/bookings/${bookingId}`);

      toast({
        title: "ลบการจองเรียบร้อยแล้ว",
      });

      // router.refresh(); // รีเฟรชหน้าเพื่ออัปเดตข้อมูลการจอง
      setBookingHistory((prev) => prev.filter((booking) => booking.id !== bookingId));
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถลบการจองได้: ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">จัดการระบบจองโต๊ะ</h2>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            ทั้งหมด {bookingHistory.length} รายการ
          </Badge>
          <Button variant="outline" onClick={navigateToHome} className="flex items-center gap-2" title="กลับสู่หน้าหลัก">
            <Home className="h-4 w-4" />
            หน้าหลัก
          </Button>
        </div>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings">จัดการการจอง</TabsTrigger>
          <TabsTrigger value="zones">จัดการโซน</TabsTrigger>
          <TabsTrigger value="layout">จัดการตำแหน่งโต๊ะ</TabsTrigger>
        </TabsList>


        {/* จัดการการจอง */}
        <TabsContent value="bookings" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยชื่อ, เบอร์โทร หรือรหัสการจอง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="เลือกสถานะการจอง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                  <SelectItem value="cancelled">ยกเลิกแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ประวัติการจอง */}
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
                                src={`${baseURL}/${booking.paymentProof}` || "/placeholder.svg"}
                                alt="Payment proof"
                                className="w-full rounded-lg"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleOpenTicket(booking.id)}>
                            <Ticket className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                      </Dialog>

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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>เปลี่ยนสถานะการจอง {booking.id}</AlertDialogTitle>
                            <AlertDialogDescription>
                              เลือกสถานะใหม่สำหรับการจองนี้
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            {booking.status !== "confirmed" && (
                              <AlertDialogAction
                                onClick={() => handleDeleteBooking(booking.id)}
                              >
                                ลบ
                              </AlertDialogAction>
                              // <AlertDialogAction
                              //   onClick={() => handleChangeStatus(booking.id, "confirmed")}
                              // >
                              //   ยืนยันการจอง
                              // </AlertDialogAction>
                            )}
                            {booking.status !== "cancelled" && (
                              <AlertDialogAction
                                onClick={() => handleCancelBooking(booking.id)}
                                className="text-white bg-red-600 hover:bg-red-400"
                              >
                                ปฏิเสธการจอง
                              </AlertDialogAction>
                            )}
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
            ))
            }
          </div >

          {
            filteredBookings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">ไม่พบข้อมูลการจองที่ตรงกับการค้นหา</p>
              </div>
            )
          }
        </TabsContent >

        {/* จัดการโซน */}
        <TabsContent value="zones" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isAddZoneOpen} onOpenChange={setIsAddZoneOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  เพิ่มโซนใหม่
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เพิ่มโซนใหม่</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="zone-id">รหัสโซน</Label>
                    <Input
                      id="zone-id"
                      value={newZone.id}
                      onChange={(e) => setNewZone((prev) => ({ ...prev, id: e.target.value }))}
                      placeholder="เช่น A, B, C"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zone-name">ชื่อโซน</Label>
                    <Input
                      id="zone-name"
                      value={newZone.name}
                      onChange={(e) => setNewZone((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="เช่น โซน VIP"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zone-description">คำอธิบาย</Label>
                    <Textarea
                      id="zone-description"
                      value={newZone.description}
                      onChange={(e) => setNewZone((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="เช่น ตำแหน่งหน้าเวที"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zone-seat-price">ราคาต่อที่นั่ง</Label>
                    <Input
                      id="zone-seat-price"
                      type="number"
                      min="0"
                      value={newZone.seatPrice}
                      onChange={(e) => setNewZone((prev) => ({ ...prev, seatPrice: Number.parseInt(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zone-table-price">ราคาต่อโต๊ะ</Label>
                    <Input
                      id="zone-table-price"
                      type="number"
                      min="0"
                      value={newZone.tablePrice}
                      onChange={(e) => setNewZone((prev) => ({ ...prev, tablePrice: Number.parseInt(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="zone-individual-booking">อนุญาตให้จองรายที่นั่ง</Label>
                    <Switch
                      id="zone-individual-booking"
                      checked={newZone.allowIndividualSeatBooking}
                      onCheckedChange={(checked) => setNewZone((prev) => ({ ...prev, allowIndividualSeatBooking: checked }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsAddZoneOpen(false)}>
                      ยกเลิก
                    </Button>
                    <Button onClick={handleAddZone}>บันทึก</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {zoneConfigs.map((zone) => (
              <Card key={zone.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {zone.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Switch checked={zone.isActive} onCheckedChange={(checked) => handleZoneToggle(zone.id, checked)} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ลบโซน</AlertDialogTitle>
                            <AlertDialogDescription>
                              คุณแน่ใจหรือไม่ที่จะลบโซน {zone.id} - {zone.name}? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteZone(zone.id)}>
                              ยืนยันการลบ
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">การจองรายที่นั่ง</Label>
                      <Switch
                        checked={zone.allowIndividualSeatBooking}
                        onCheckedChange={(checked) => handleIndividualSeatBookingToggle(zone.id, checked)}
                        disabled={!zone.isActive}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {zone.allowIndividualSeatBooking ? "ลูกค้าสามารถเลือกจองรายที่นั่งได้" : "ลูกค้าต้องจองทั้งโต๊ะเท่านั้น"}
                    </p>
                  </div>
                  <div className="space-y-3 border-t pt-3">
                    <Label className="text-sm font-medium">ตั้งค่าราคา</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`seat-price-${zone.id}`} className="text-xs">
                            ราคาต่อที่นั่ง
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            บาท
                          </Badge>
                        </div>
                        <div className="flex items-center">
                          <Input
                            id={`seat-price-${zone.id}`}
                            type="number"
                            min="0"
                            value={zone.seatPrice}
                            onChange={(e) =>
                              handlePriceChange(zone.id, "seatPrice", Number.parseInt(e.target.value) || 0)
                            }
                            disabled={!zone.isActive || !zone.allowIndividualSeatBooking}
                            className="text-right"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`table-price-${zone.id}`} className="text-xs">
                            ราคาต่อโต๊ะ
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            บาท
                          </Badge>
                        </div>
                        <div className="flex items-center">
                          <Input
                            id={`table-price-${zone.id}`}
                            type="number"
                            min="0"
                            value={zone.tablePrice}
                            onChange={(e) =>
                              handlePriceChange(zone.id, "tablePrice", Number.parseInt(e.target.value) || 0)
                            }
                            disabled={!zone.isActive}
                            className="text-right"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {zone.allowIndividualSeatBooking
                        ? `จองรายที่นั่ง: ${zone.seatPrice} บาท/ที่นั่ง, จองทั้งโต๊ะ: ${zone.tablePrice} บาท/โต๊ะ (ประหยัด ${zone.seatPrice * 9 - zone.tablePrice} บาท)`
                        : `จองได้เฉพาะทั้งโต๊ะในราคา ${zone.tablePrice} บาท/โต๊ะ (9 ที่นั่ง)`}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">จำนวนที่นั่งที่จองแล้ว</Label>
                    <p className="text-2xl font-bold text-primary">
                      {zoneStats[zone.id] || 0} ที่นั่ง
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">โซนนี้มีโต๊ะทั้งหมด 20 โต๊ะ (180 ที่นั่ง)</div>
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
                  <p className="text-2xl font-bold text-primary">{zoneConfigs.filter((z) => z.isActive).length}/{zoneConfigs.length}</p>
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
                    {zoneConfigs.filter((z) => z.isActive).length * 180}
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

        {/* จัดการตำแหน่งโต๊ะ */}
        <TabsContent value="layout" className="space-y-6">
          <TableLayoutEditor />
        </TabsContent>
      </Tabs >
    </div >
  );
}

function EditBookingForm({
  booking,
  onSave,
  onCancel,
}: {
  booking: BookingRecord;
  onSave: (booking: BookingRecord) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    customerName: booking.customerName,
    phone: booking.phone,
    notes: booking.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...booking,
      customerName: formData.customerName,
      phone: formData.phone,
      notes: formData.notes || undefined,
    });
  };

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
  );
}
