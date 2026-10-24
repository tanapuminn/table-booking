"use client";

import type React from "react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart2, BookOpen, LayoutGrid, MapPin, Edit, Trash2, Eye, ScanLine,
  Search, Settings, Home, Plus, Ticket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBooking, type BookingRecord } from "@/components/booking-provider";
import { TableLayoutEditor } from "@/components/table-layout-editor";
import { BookingStats } from "@/components/booking-stats";
import { DashboardCheckInMap } from "@/components/dashboard-checkin-map";
import { useLoadingRouter } from "@/components/navigation-loading";
import axios from "axios";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { apiBaseUrl as baseURL } from "@/lib/api";

type Section = "stats" | "bookings" | "checkin" | "zones" | "layout" | "settings";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "stats", label: "\u0e2a\u0e16\u0e34\u0e15\u0e34\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07", icon: BarChart2 },
  { id: "bookings", label: "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07", icon: BookOpen },
  { id: "checkin", label: "\u0e1c\u0e31\u0e07\u0e40\u0e0a\u0e47\u0e01\u0e2d\u0e34\u0e19\u0e2b\u0e19\u0e49\u0e32\u0e07\u0e32\u0e19", icon: ScanLine },
  { id: "zones", label: "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e42\u0e0b\u0e19", icon: MapPin },
  { id: "layout", label: "\u0e1c\u0e31\u0e07\u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07", icon: LayoutGrid },
  { id: "settings", label: "\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e40\u0e27\u0e47\u0e1a", icon: Settings },
];

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useLoadingRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { bookingHistory, updateBookingRecord, zoneConfigs, updateZoneConfig, setBookingHistory } = useBooking();

  const [activeSection, setActiveSection] = useState<Section>("stats");
  const [searchTerm, setSearchTerm] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [newZone, setNewZone] = useState({
    id: "", name: "", description: "",
    allowIndividualSeatBooking: true, seatPrice: 0, tablePrice: 0,
  });

  const [siteSettings, setSiteSettings] = useState({
    projectTitle: "",
    projectSubtitle: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankAccountImage: "",
    paymentType: "bank" as "bank" | "promptpay",
    promptpayName: "",
    promptpayNumber: "",
  });
  const [bankImageFile, setBankImageFile] = useState<File | null>(null);
  const [bankImagePreview, setBankImagePreview] = useState("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  useEffect(() => {
    if (!authLoading && user?.role !== "admin") router.replace("/");
  }, [user, authLoading, router]);
  const loadSiteSettings = () => {
    setIsLoadingSettings(true);
    axios
      .get(`${baseURL}/api/settings?includeBankImage=true&t=${Date.now()}`)
      .then((res) => setSiteSettings({
        projectTitle: res.data?.projectTitle || "",
        projectSubtitle: res.data?.projectSubtitle || "",
        bankName: res.data?.bankName || "",
        bankAccountName: res.data?.bankAccountName || "",
        bankAccountNumber: res.data?.bankAccountNumber || "",
        bankAccountImage: res.data?.bankAccountImage || "",
        paymentType: res.data?.paymentType === "promptpay" ? "promptpay" : "bank",
        promptpayName: res.data?.promptpayName || "",
        promptpayNumber: res.data?.promptpayNumber || "",
      }))
      .catch(() => setSiteSettings({ projectTitle: "", projectSubtitle: "", bankName: "", bankAccountName: "", bankAccountNumber: "", bankAccountImage: "", paymentType: "bank", promptpayName: "", promptpayNumber: "" }))
      .finally(() => setIsLoadingSettings(false));
  };

  useEffect(() => {
    loadSiteSettings();
  }, []);

  const filteredBookings = bookingHistory.filter((booking) => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.includes(searchTerm) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const bookingPageSize = 5;
  const bookingPageCount = Math.max(1, Math.ceil(filteredBookings.length / bookingPageSize));
  const bookingPageStart = (bookingPage - 1) * bookingPageSize;
  const visibleBookings = filteredBookings.slice(bookingPageStart, bookingPageStart + bookingPageSize);

  useEffect(() => {
    setBookingPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (bookingPage > bookingPageCount) setBookingPage(bookingPageCount);
  }, [bookingPage, bookingPageCount]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "pending_payment": return "bg-yellow-100 text-yellow-800";
      case "payment_timeout": return "bg-orange-100 text-orange-800";
      case "pending": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed": return "ยืนยันแล้ว";
      case "cancelled": return "ยกเลิกแล้ว";
      case "pending_payment": return "รอชำระเงิน";
      case "payment_timeout": return "หมดเวลาชำระ";
      case "pending": return "รอดำเนินการ";
      default: return status;
    }
  };

  const handleChangeStatus = async (bookingId: string, newStatus: "pending" | "confirmed" | "cancelled") => {
    try {
      if (newStatus !== "confirmed") {
        const ok = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้?");
        if (!ok) return;
      }
      await axios.patch(`${baseURL}/api/bookings/${bookingId}`, { status: newStatus });
      setBookingHistory((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      toast({ title: "เปลี่ยนสถานะการจองสำเร็จ", description: `${bookingId} → "${getStatusText(newStatus)}"` });
    } catch (error) {
      toast({ title: "ข้อผิดพลาด", description: `ไม่สามารถเปลี่ยนสถานะได้`, variant: "destructive" });
    }
  };

  const handleEditBooking = (updated: BookingRecord) => {
    updateBookingRecord(updated.id, updated);
    setEditingBooking(null);
    toast({ title: "แก้ไขข้อมูลสำเร็จ", description: `การจอง ${updated.id} อัปเดตแล้ว` });
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการจองนี้?")) return;
    try {
      await axios.delete(`${baseURL}/api/bookings/${bookingId}`);
      setBookingHistory((prev) => prev.filter((b) => b.id !== bookingId));
      toast({ title: "ลบการจองเรียบร้อยแล้ว" });
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบการจองได้", variant: "destructive" });
    }
  };

  const handleZoneToggle = (zoneId: string, isActive: boolean) => {
    updateZoneConfig(zoneId, { isActive });
    toast({ title: `${isActive ? "เปิด" : "ปิด"}โซน ${zoneId} สำเร็จ` });
  };

  const handleIndividualSeatBookingToggle = (zoneId: string, allow: boolean) => {
    updateZoneConfig(zoneId, { allowIndividualSeatBooking: allow });
    toast({ title: `${allow ? "เปิด" : "ปิด"}การจองรายที่นั่งในโซน ${zoneId}` });
  };

  const handlePriceChange = (zoneId: string, type: "seatPrice" | "tablePrice", value: number) => {
    if (value < 0) return;
    updateZoneConfig(zoneId, { [type]: value });
    toast({ title: "อัพเดทราคาสำเร็จ" });
  };

  const handleAddZone = async () => {
    if (!newZone.id || !newZone.name || !newZone.description || newZone.seatPrice < 0 || newZone.tablePrice < 0) {
      toast({ title: "ข้อผิดพลาด", description: "กรุณากรอกข้อมูลให้ครบถ้วน", variant: "destructive" });
      return;
    }
    try {
      await axios.post(`${baseURL}/api/zones`, { ...newZone });
      updateZoneConfig(newZone.id, { ...newZone, isActive: true });
      setNewZone({ id: "", name: "", description: "", allowIndividualSeatBooking: true, seatPrice: 0, tablePrice: 0 });
      setIsAddZoneOpen(false);
      toast({ title: "เพิ่มโซนสำเร็จ", description: `โซน ${newZone.id} - ${newZone.name}` });
    } catch {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถเพิ่มโซนได้", variant: "destructive" });
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      await axios.delete(`${baseURL}/api/zones/${zoneId}`);
      updateZoneConfig(zoneId, { isActive: false });
      toast({ title: "ลบโซนสำเร็จ", description: `โซน ${zoneId} ถูกลบแล้ว` });
    } catch {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถลบโซนได้", variant: "destructive" });
    }
  };

  const handleSaveSettings = async () => {
    const projectTitle = siteSettings.projectTitle.trim();
    const projectSubtitle = siteSettings.projectSubtitle.trim();

    if (!projectTitle || !projectSubtitle) {
      toast({ title: "กรุณากรอกชื่อโครงการให้ครบ", variant: "destructive" });
      return;
    }

    setIsSavingSettings(true);
    try {
      const formData = new FormData();
      formData.append("projectTitle", projectTitle);
      formData.append("projectSubtitle", projectSubtitle);
      formData.append("bankName", siteSettings.bankName.trim());
      formData.append("bankAccountName", siteSettings.bankAccountName.trim());
      formData.append("bankAccountNumber", siteSettings.bankAccountNumber.trim());
      formData.append("paymentType", siteSettings.paymentType);
      formData.append("promptpayName", siteSettings.promptpayName.trim());
      formData.append("promptpayNumber", siteSettings.promptpayNumber.replace(/\D/g, ""));
      if (siteSettings.paymentType === "bank" && bankImageFile) formData.append("bankAccountImage", bankImageFile);

      const res = await axios.put(`${baseURL}/api/settings`, formData);
      setSiteSettings(res.data);
      setBankImageFile(null);
      setBankImagePreview(res.data.bankAccountImage || "");
      window.dispatchEvent(new Event("site-settings-updated"));
      toast({ title: "บันทึกการตั้งค่าเว็บสำเร็จ" });
    } catch (error: any) {
      const message = error?.response?.data?.message || "ไม่สามารถบันทึกชื่อโครงการได้";
      toast({ title: "บันทึกไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleBankImageChange = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast({ title: "เลือกรูปไม่สำเร็จ", description: "รองรับ JPG, PNG หรือ WEBP ขนาดไม่เกิน 2 MB", variant: "destructive" });
      return;
    }
    setBankImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setBankImagePreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const getZoneStats = () => {
    const stats: Record<string, number> = zoneConfigs.reduce((acc, z) => ({ ...acc, [z.id]: 0 }), {});
    bookingHistory
      .filter((b) => b.status === "confirmed")
      .forEach((b) => b.seats.forEach((s) => { if (s.zone && stats.hasOwnProperty(s.zone)) stats[s.zone]++; }));
    return stats;
  };
  const zoneStats = getZoneStats();

  const SettingsSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ตั้งค่าเว็บไซต์</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingSettings ? (
          <div className="space-y-3 py-2">
            <div className="h-9 animate-pulse rounded bg-muted" />
            <div className="h-9 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="project" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:w-fit">
                <TabsTrigger value="project">ข้อมูลโครงการ</TabsTrigger>
                <TabsTrigger value="bank">บัญชีธนาคาร</TabsTrigger>
              </TabsList>
              <TabsContent value="project" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="project-title">{"\u0e0a\u0e37\u0e48\u0e2d\u0e23\u0e30\u0e1a\u0e1a / \u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e41\u0e23\u0e01"}</Label>
                  <Input id="project-title" value={siteSettings.projectTitle} onChange={(e) => setSiteSettings((prev) => ({ ...prev, projectTitle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-subtitle">{"\u0e0a\u0e37\u0e48\u0e2d\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23 / \u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e17\u0e35\u0e48\u0e2a\u0e2d\u0e07"}</Label>
                  <Input id="project-subtitle" value={siteSettings.projectSubtitle} onChange={(e) => setSiteSettings((prev) => ({ ...prev, projectSubtitle: e.target.value }))} />
                </div>
                <p className="text-sm text-red-500">{"\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e0a\u0e37\u0e48\u0e2d\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e08\u0e30\u0e41\u0e2a\u0e14\u0e07\u0e43\u0e19\u0e17\u0e38\u0e01\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d"}</p>
                <div className="rounded-md border bg-muted/30 p-4 text-center">
                  {siteSettings.projectTitle && <p className="text-2xl font-bold leading-tight">{siteSettings.projectTitle}</p>}
                  {siteSettings.projectSubtitle && <p className="text-2xl font-bold leading-tight">{siteSettings.projectSubtitle}</p>}
                </div>
              </TabsContent>
              <TabsContent value="bank" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-type">ช่องทางรับชำระเงิน</Label>
                  <Select value={siteSettings.paymentType} onValueChange={(value) => setSiteSettings((prev) => ({ ...prev, paymentType: value as "bank" | "promptpay" }))}>
                    <SelectTrigger id="payment-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">บัญชีธนาคาร</SelectItem>
                      <SelectItem value="promptpay">PromptPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {siteSettings.paymentType === "bank" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bank-name">ธนาคาร</Label>
                        <Input id="bank-name" value={siteSettings.bankName} onChange={(e) => setSiteSettings((prev) => ({ ...prev, bankName: e.target.value }))} placeholder="เช่น ธนาคารไทยพาณิชย์" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank-account-name">ชื่อบัญชี</Label>
                        <Input id="bank-account-name" value={siteSettings.bankAccountName} onChange={(e) => setSiteSettings((prev) => ({ ...prev, bankAccountName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-account-number">เลขบัญชี</Label>
                      <Input id="bank-account-number" value={siteSettings.bankAccountNumber} onChange={(e) => setSiteSettings((prev) => ({ ...prev, bankAccountNumber: e.target.value }))} inputMode="numeric" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-account-image">รูปบัญชีธนาคาร (JPG, PNG หรือ WEBP ไม่เกิน 2 MB)</Label>
                      <Input id="bank-account-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleBankImageChange(e.target.files?.[0])} />
                    </div>
                    {(bankImagePreview || siteSettings.bankAccountImage) && (
                      <div className="rounded-md border bg-muted/30 p-4">
                        <p className="mb-2 text-sm text-muted-foreground">ตัวอย่างรูปบัญชีที่แสดงหน้าชำระเงิน</p>
                        <Image src={bankImagePreview || siteSettings.bankAccountImage} alt="ตัวอย่างรูปบัญชีธนาคาร" width={220} height={220} unoptimized className="mx-auto max-h-56 w-auto object-contain" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="promptpay-name">ชื่อบัญชี PromptPay</Label>
                      <Input id="promptpay-name" value={siteSettings.promptpayName} onChange={(e) => setSiteSettings((prev) => ({ ...prev, promptpayName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promptpay-number">เลขพร้อมเพย์ (เบอร์มือถือ 10 หลัก หรือเลขบัตร/ผู้เสียภาษี 13 หลัก)</Label>
                      <Input id="promptpay-number" value={siteSettings.promptpayNumber} onChange={(e) => setSiteSettings((prev) => ({ ...prev, promptpayNumber: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" maxLength={13} />
                    </div>
                    <p className="text-sm text-muted-foreground">ระบบจะสร้าง QR ตามยอดจองโดยอัตโนมัติ</p>
                  </>
                )}
              </TabsContent>
            </Tabs>
            <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? "กำลังบันทึก..." : "บันทึกการตั้งค่าเว็บ"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
  // Sidebar nav item
  const SidebarItem = ({ item }: { item: typeof NAV_ITEMS[number] }) => (
    <button
      onClick={() => setActiveSection(item.id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
        activeSection === item.id
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
      {item.id === "bookings" && (
        <Badge
          variant={activeSection === "bookings" ? "secondary" : "outline"}
          className="ml-auto text-xs px-1.5 py-0 h-4 min-w-[1.25rem] justify-center"
        >
          {bookingHistory.length}
        </Badge>
      )}
    </button>
  );

  // ─── Section: Bookings ─────────────────────────────────────────────────────
  const BookingsSection = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ, เบอร์โทร, รหัสจอง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="สถานะทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะทั้งหมด</SelectItem>
            <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
            <SelectItem value="pending_payment">รอชำระเงิน</SelectItem>
            <SelectItem value="payment_timeout">หมดเวลาชำระ</SelectItem>
            <SelectItem value="cancelled">ยกเลิกแล้ว</SelectItem>
            <SelectItem value="pending">รอดำเนินการ</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => window.open(`${baseURL}/api/bookings/export/xlsx`, "_blank")}>
          📄 ส่งออก Excel
        </Button>
      </div>

      <div className="grid gap-3">
        {visibleBookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span className="truncate">{booking.customerName}</span>
                    <Badge className={getStatusColor(booking.status)}>{getStatusText(booking.status)}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {booking.id} · {dayjs(booking.bookingDate).format("DD/MM/YYYY HH:mm")}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {booking.paymentProof && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" title="ดูสลิป"><Eye className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>หลักฐานการชำระเงิน</DialogTitle></DialogHeader>
                        <Image src={booking.paymentProof} alt="Payment proof" width={800} height={600} unoptimized className="w-full rounded-lg mt-4" />
                      </DialogContent>
                    </Dialog>
                  )}
                  {booking.status === "confirmed" && (
                    <Button variant="outline" size="sm" title="ดูตั๋ว" onClick={() => router.push(`/ticket?bookingId=${booking.id}`)}>
                      <Ticket className="h-4 w-4" />
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" title="แก้ไข" onClick={() => setEditingBooking(booking)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>แก้ไขข้อมูลการจอง</DialogTitle></DialogHeader>
                      {editingBooking && (
                        <EditBookingForm booking={editingBooking} onSave={handleEditBooking} onCancel={() => setEditingBooking(null)} />
                      )}
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" title="เปลี่ยนสถานะ"><Settings className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>เปลี่ยนสถานะ · {booking.id}</AlertDialogTitle>
                        <AlertDialogDescription>เลือกการดำเนินการสำหรับการจองนี้</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-wrap gap-2">
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        {booking.status === "pending_payment" && (
                          <AlertDialogAction className="bg-green-600 hover:bg-green-500" onClick={() => handleChangeStatus(booking.id, "confirmed")}>
                            ยืนยันการจอง
                          </AlertDialogAction>
                        )}
                        {booking.status !== "confirmed" && (
                          <AlertDialogAction onClick={() => handleDeleteBooking(booking.id)}>ลบ</AlertDialogAction>
                        )}
                        {booking.status !== "cancelled" && booking.status !== "payment_timeout" && (
                          <AlertDialogAction className="bg-red-600 hover:bg-red-500" onClick={() => handleChangeStatus(booking.id, "cancelled")}>
                            ปฏิเสธ
                          </AlertDialogAction>
                        )}
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">เบอร์โทร</p>
                  <p>{booking.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">ที่นั่ง</p>
                  <div className="flex flex-wrap gap-1">
                    {booking.seats.map((seat, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {seat.tableName} ที่ {seat.seatNumber}{seat.studentName ? ` · ${seat.studentName}` : ""}{seat.classLevel ? ` (${seat.classLevel})` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">ราคารวม</p>
                  <p className="text-lg font-bold text-primary">฿{booking.totalPrice}</p>
                </div>
              </div>
              {booking.notes && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">หมายเหตุ: {booking.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredBookings.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">ไม่พบข้อมูลการจองที่ตรงกับการค้นหา</div>
        )}
      </div>
      {filteredBookings.length > bookingPageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            แสดง {bookingPageStart + 1}–{Math.min(bookingPageStart + bookingPageSize, filteredBookings.length)} จาก {filteredBookings.length} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={bookingPage === 1} onClick={() => setBookingPage((page) => Math.max(1, page - 1))}>
              ก่อนหน้า
            </Button>
            <span className="min-w-20 text-center text-sm text-muted-foreground">หน้า {bookingPage} / {bookingPageCount}</span>
            <Button variant="outline" size="sm" disabled={bookingPage === bookingPageCount} onClick={() => setBookingPage((page) => Math.min(bookingPageCount, page + 1))}>
              ถัดไป
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Section: Zones ────────────────────────────────────────────────────────
  const ZonesSection = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isAddZoneOpen} onOpenChange={setIsAddZoneOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />เพิ่มโซนใหม่</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>เพิ่มโซนใหม่</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>รหัสโซน</Label>
                <Input value={newZone.id} onChange={(e) => setNewZone((p) => ({ ...p, id: e.target.value }))} placeholder="เช่น A, B, VIP" />
              </div>
              <div className="space-y-2">
                <Label>ชื่อโซน</Label>
                <Input value={newZone.name} onChange={(e) => setNewZone((p) => ({ ...p, name: e.target.value }))} placeholder="เช่น โซน VIP" />
              </div>
              <div className="space-y-2">
                <Label>คำอธิบาย</Label>
                <Textarea value={newZone.description} onChange={(e) => setNewZone((p) => ({ ...p, description: e.target.value }))} placeholder="เช่น ตำแหน่งหน้าเวที" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ราคาต่อที่นั่ง (บาท)</Label>
                  <Input type="number" min="0" value={newZone.seatPrice} onChange={(e) => setNewZone((p) => ({ ...p, seatPrice: +e.target.value || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>ราคาต่อโต๊ะ (บาท)</Label>
                  <Input type="number" min="0" value={newZone.tablePrice} onChange={(e) => setNewZone((p) => ({ ...p, tablePrice: +e.target.value || 0 }))} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>อนุญาตให้จองรายที่นั่ง</Label>
                <Switch checked={newZone.allowIndividualSeatBooking} onCheckedChange={(v) => setNewZone((p) => ({ ...p, allowIndividualSeatBooking: v }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAddZoneOpen(false)}>ยกเลิก</Button>
                <Button onClick={handleAddZone}>บันทึก</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {zoneConfigs.map((zone) => (
          <Card key={zone.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4" />{zone.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch checked={zone.isActive} onCheckedChange={(v) => handleZoneToggle(zone.id, v)} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ลบโซน {zone.id} - {zone.name}</AlertDialogTitle>
                        <AlertDialogDescription>การดำเนินการนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteZone(zone.id)}>ยืนยันการลบ</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <Badge variant={zone.isActive ? "default" : "secondary"} className="w-fit text-xs">
                {zone.isActive ? "เปิดให้บริการ" : "ปิดให้บริการ"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{zone.description}</p>
              <div className="flex items-center justify-between">
                <Label className="text-sm">จองรายที่นั่ง</Label>
                <Switch checked={zone.allowIndividualSeatBooking} disabled={!zone.isActive}
                  onCheckedChange={(v) => handleIndividualSeatBookingToggle(zone.id, v)} />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ราคา/ที่นั่ง (บาท)</Label>
                  <Input type="number" min="0" value={zone.seatPrice} className="text-right"
                    disabled={!zone.isActive || !zone.allowIndividualSeatBooking}
                    onChange={(e) => handlePriceChange(zone.id, "seatPrice", +e.target.value || 0)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ราคา/โต๊ะ (บาท)</Label>
                  <Input type="number" min="0" value={zone.tablePrice} className="text-right"
                    disabled={!zone.isActive}
                    onChange={(e) => handlePriceChange(zone.id, "tablePrice", +e.target.value || 0)} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-sm text-muted-foreground">ที่นั่งที่จองแล้ว</span>
                <span className="text-xl font-bold text-primary">{zoneStats[zone.id] || 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader><CardTitle className="text-base">สรุปภาพรวม</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{zoneConfigs.filter((z) => z.isActive).length}/{zoneConfigs.length}</p>
              <p className="text-xs text-muted-foreground mt-1">โซนที่เปิดบริการ</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{Object.values(zoneStats).reduce((a, b) => a + b, 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">ที่นั่งที่จองแล้ว</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{zoneConfigs.filter((z) => z.isActive).length * 180}</p>
              <p className="text-xs text-muted-foreground mt-1">ที่นั่งที่เปิดบริการ</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{bookingHistory.filter((b) => b.status === "confirmed").length}</p>
              <p className="text-xs text-muted-foreground mt-1">การจองที่ยืนยันแล้ว</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    // break out of the global main's px-4 py-8 padding
    <div className="flex -mx-4 -mt-8 min-h-screen">

      {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 border-r flex-col bg-muted/30 sticky top-0 self-start h-screen overflow-y-auto">
        <div className="px-4 py-5 border-b">
          <p className="font-bold text-sm leading-tight">Admin Dashboard</p>
          {siteSettings.projectTitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{siteSettings.projectTitle}</p>
          ) : (
            <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5 pt-3">
          {NAV_ITEMS.map((item) => <SidebarItem key={item.id} item={item} />)}
        </nav>

      </aside>

      {/* ── Main Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile nav bar */}
        <div className="md:hidden flex overflow-x-auto border-b bg-muted/30 px-2 py-1.5 gap-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                activeSection === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 md:p-6 space-y-6">

          {/* Page header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold">
                {NAV_ITEMS.find((i) => i.id === activeSection)?.label}
              </h2>
              {activeSection === "bookings" && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  แสดง {filteredBookings.length} / {bookingHistory.length} รายการ
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => router.push("/")}>
              <Home className="h-4 w-4" />
              กลับหน้าหลัก
            </Button>
          </div>

          {/* Section content */}
          {activeSection === "stats" && <BookingStats />}
          {activeSection === "bookings" && <BookingsSection />}
          {activeSection === "checkin" && <DashboardCheckInMap eventName={siteSettings.projectSubtitle || siteSettings.projectTitle || "โครงการปัจจุบัน"} />}
          {activeSection === "zones" && <ZonesSection />}
          {activeSection === "layout" && <TableLayoutEditor />}
          {activeSection === "settings" && SettingsSection()}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Booking Form ─────────────────────────────────────────────────────
function EditBookingForm({
  booking, onSave, onCancel,
}: {
  booking: BookingRecord;
  onSave: (b: BookingRecord) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    customerName: booking.customerName,
    phone: booking.phone,
    notes: booking.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...booking, customerName: formData.customerName, phone: formData.phone, notes: formData.notes || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">ชื่อ-นามสกุล</Label>
        <Input id="edit-name" value={formData.customerName} required
          onChange={(e) => setFormData((p) => ({ ...p, customerName: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">เบอร์โทรศัพท์</Label>
        <Input id="edit-phone" value={formData.phone} required
          onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes">หมายเหตุ</Label>
        <Textarea id="edit-notes" rows={3} value={formData.notes}
          onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>ยกเลิก</Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  );
}
