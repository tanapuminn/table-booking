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
  LayoutDashboard, BookOpen, LayoutGrid, MapPin, Trash2, ScanLine,
  Settings, Plus, LogOut, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBooking, type ZoneConfig } from "@/components/booking-provider";
import { TableLayoutEditor } from "@/components/table-layout-editor";
import { DashboardOverview } from "@/components/dashboard-overview";
import { DashboardBookings } from "@/components/dashboard-bookings";
import { DashboardCheckInMap } from "@/components/dashboard-checkin-map";
import { StatCard } from "@/components/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { useLoadingRouter } from "@/components/navigation-loading";
import axios from "axios";
import { cn } from "@/lib/utils";
import { apiBaseUrl as baseURL } from "@/lib/api";
import { type BookingStatus } from "@/lib/booking-status";
import { getZoneOccupancy } from "@/lib/dashboard-metrics";

type Section = "overview" | "bookings" | "checkin" | "zones" | "layout" | "settings";

const NAV_ITEMS: { id: Section; label: string; description: string; icon: React.ElementType }[] = [
  { id: "overview", label: "\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21", description: "\u0e22\u0e2d\u0e14\u0e08\u0e2d\u0e07 \u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07 \u0e41\u0e25\u0e30\u0e2a\u0e34\u0e48\u0e07\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21", icon: LayoutDashboard },
  { id: "bookings", label: "\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07", description: "\u0e04\u0e49\u0e19\u0e2b\u0e32 \u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a \u0e41\u0e25\u0e30\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07", icon: BookOpen },
  { id: "checkin", label: "\u0e40\u0e0a\u0e47\u0e01\u0e2d\u0e34\u0e19\u0e2b\u0e19\u0e49\u0e32\u0e07\u0e32\u0e19", description: "\u0e15\u0e23\u0e27\u0e08\u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d\u0e41\u0e25\u0e30\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e01\u0e32\u0e23\u0e21\u0e32\u0e16\u0e36\u0e07\u0e15\u0e32\u0e21\u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07", icon: ScanLine },
  { id: "zones", label: "\u0e42\u0e0b\u0e19\u0e41\u0e25\u0e30\u0e23\u0e32\u0e04\u0e32", description: "\u0e40\u0e1b\u0e34\u0e14/\u0e1b\u0e34\u0e14\u0e42\u0e0b\u0e19 \u0e41\u0e25\u0e30\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e23\u0e32\u0e04\u0e32\u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07\u0e2b\u0e23\u0e37\u0e2d\u0e17\u0e31\u0e49\u0e07\u0e42\u0e15\u0e4a\u0e30", icon: MapPin },
  { id: "layout", label: "\u0e1c\u0e31\u0e07\u0e42\u0e15\u0e4a\u0e30", description: "\u0e08\u0e31\u0e14\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e42\u0e15\u0e4a\u0e30\u0e43\u0e19\u0e41\u0e15\u0e48\u0e25\u0e30\u0e42\u0e0b\u0e19", icon: LayoutGrid },
  { id: "settings", label: "\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32", description: "\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23 \u0e01\u0e32\u0e23\u0e23\u0e31\u0e1a\u0e08\u0e2d\u0e07 \u0e41\u0e25\u0e30\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19", icon: Settings },
];
const DEFAULT_SECTION: Section = "overview";

// \u0e40\u0e01\u0e47\u0e1a\u0e40\u0e21\u0e19\u0e39\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e44\u0e27\u0e49\u0e43\u0e19 ?section= \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e43\u0e2b\u0e49 refresh, \u0e1b\u0e38\u0e48\u0e21 back \u0e41\u0e25\u0e30\u0e01\u0e32\u0e23\u0e41\u0e0a\u0e23\u0e4c\u0e25\u0e34\u0e07\u0e01\u0e4c\u0e01\u0e25\u0e31\u0e1a\u0e21\u0e32\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e49\u0e32\u0e40\u0e14\u0e34\u0e21
const readSectionFromUrl = (): Section => {
  const value = new URLSearchParams(window.location.search).get("section");
  return NAV_ITEMS.some((item) => item.id === value) ? (value as Section) : DEFAULT_SECTION;
};

function ZonePriceInput({ value, disabled, onSave }: { value: number; disabled: boolean; onSave: (value: number) => Promise<void> }) {
  const [draft, setDraft] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setDraft(String(value)), [value]);

  const commit = async () => {
    const nextValue = Number(draft);
    if (!Number.isFinite(nextValue) || nextValue < 0) {
      setDraft(String(value));
      return;
    }
    if (nextValue === value) return;

    setIsSaving(true);
    try {
      await onSave(nextValue);
    } catch {
      setDraft(String(value));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Input
      type="number"
      min="0"
      value={draft}
      className="text-right"
      disabled={disabled || isSaving}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setDraft(String(value));
      }}
    />
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useLoadingRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { bookingHistory, zoneConfigs, addZoneConfig, updateZoneConfig, removeZoneConfig, tablePositions } = useBooking();

  const [activeSection, setActiveSection] = useState<Section>(DEFAULT_SECTION);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [newZone, setNewZone] = useState({
    id: "", name: "", description: "",
    allowIndividualSeatBooking: true, seatPrice: 0, tablePrice: 0,
  });

  const [siteSettings, setSiteSettings] = useState({
    paymentConfigured: false,
    bookingEnabled: false,
    paymentTimeoutMinutes: 20,
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
  const [isUpdatingBookingStatus, setIsUpdatingBookingStatus] = useState(false);
  const [isSavingPaymentTimeout, setIsSavingPaymentTimeout] = useState(false);
  useEffect(() => {
    if (!authLoading && user?.role !== "admin") router.replace("/");
  }, [user, authLoading, router]);

  useEffect(() => {
    const syncSection = () => setActiveSection(readSectionFromUrl());
    syncSection();
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  const navigateTo = (section: Section) => {
    setActiveSection(section);
    const url = new URL(window.location.href);
    if (section === DEFAULT_SECTION) url.searchParams.delete("section");
    else url.searchParams.set("section", section);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  const openBookings = (status: BookingStatus | "all" = "all") => {
    setSearchTerm("");
    setStatusFilter(status);
    navigateTo("bookings");
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  const loadSiteSettings = () => {
    setIsLoadingSettings(true);
    axios
      .get(`${baseURL}/api/settings?includeBankImage=true&t=${Date.now()}`)
      .then((res) => setSiteSettings({
        paymentConfigured: res.data?.paymentConfigured === true,
        bookingEnabled: res.data?.bookingEnabled === true,
        paymentTimeoutMinutes: Number.isInteger(res.data?.paymentTimeoutMinutes) ? res.data.paymentTimeoutMinutes : 20,
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
      .catch(() => setSiteSettings({ paymentConfigured: false, bookingEnabled: false, paymentTimeoutMinutes: 20, projectTitle: "", projectSubtitle: "", bankName: "", bankAccountName: "", bankAccountNumber: "", bankAccountImage: "", paymentType: "bank", promptpayName: "", promptpayNumber: "" }))
      .finally(() => setIsLoadingSettings(false));
  };

  useEffect(() => {
    loadSiteSettings();
  }, []);

  const handleZoneToggle = async (zoneId: string, isActive: boolean) => {
    try {
      await updateZoneConfig(zoneId, { isActive });
      toast({ title: `${isActive ? "เปิด" : "ปิด"}โซน ${zoneId} สำเร็จ` });
    } catch {
      toast({ title: "เปลี่ยนสถานะโซนไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" });
    }
  };

  const handleIndividualSeatBookingToggle = async (zoneId: string, allow: boolean) => {
    try {
      await updateZoneConfig(zoneId, { allowIndividualSeatBooking: allow });
      toast({ title: `${allow ? "เปิด" : "ปิด"}การจองรายที่นั่งในโซน ${zoneId}` });
    } catch {
      toast({ title: "เปลี่ยนการจองรายที่นั่งไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" });
    }
  };

  const handlePriceChange = async (zoneId: string, type: "seatPrice" | "tablePrice", value: number) => {
    try {
      await updateZoneConfig(zoneId, { [type]: value });
      toast({ title: "อัปเดตราคาสำเร็จ" });
    } catch (error) {
      toast({ title: "อัปเดตราคาไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" });
      throw error;
    }
  };

  const handleAddZone = async () => {
    if (!newZone.id || !newZone.name || !newZone.description || newZone.seatPrice < 0 || newZone.tablePrice < 0) {
      toast({ title: "ข้อผิดพลาด", description: "กรุณากรอกข้อมูลให้ครบถ้วน", variant: "destructive" });
      return;
    }
    try {
      const { data: createdZone } = await axios.post<ZoneConfig>(`${baseURL}/api/zones`, { ...newZone });
      addZoneConfig(createdZone);
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
      removeZoneConfig(zoneId);
      toast({ title: "ลบโซนสำเร็จ", description: `โซน ${zoneId} ถูกลบแล้ว` });
    } catch (error) {
      const message = axios.isAxiosError(error) && error.response?.status === 409
        ? error.response.data?.message === "Cannot delete zone while it contains tables"
          ? "ยังมีโต๊ะอยู่ในโซนนี้ กรุณาลบโต๊ะก่อน"
          : "โซนนี้มีประวัติการจองที่เกี่ยวข้อง จึงไม่สามารถลบได้"
        : "ไม่สามารถลบโซนได้";
      toast({ title: "ลบโซนไม่สำเร็จ", description: message, variant: "destructive" });
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

  const handleBookingStatusChange = async (bookingEnabled: boolean) => {
    if (bookingEnabled && !siteSettings.paymentConfigured) {
      toast({ title: "ยังเปิดรับจองไม่ได้", description: "กรุณาตั้งค่าช่องทางรับชำระเงินก่อน", variant: "destructive" });
      return;
    }
    setIsUpdatingBookingStatus(true);
    try {
      const res = await axios.patch(`${baseURL}/api/settings/booking-status`, { bookingEnabled });
      setSiteSettings(res.data);
      window.dispatchEvent(new Event("site-settings-updated"));
      toast({ title: bookingEnabled ? "เปิดรับจองแล้ว" : "ปิดรับจองแล้ว" });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error?.message || "เปลี่ยนสถานะการจองไม่สำเร็จ";
      toast({ title: "เปลี่ยนสถานะไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setIsUpdatingBookingStatus(false);
    }
  };

  const handleSavePaymentTimeout = async () => {
    const minutes = siteSettings.paymentTimeoutMinutes;
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      toast({ title: "กรุณาระบุเวลา 1–180 นาที", variant: "destructive" });
      return;
    }
    setIsSavingPaymentTimeout(true);
    try {
      const res = await axios.patch(`${baseURL}/api/settings/payment-timeout`, { paymentTimeoutMinutes: minutes });
      setSiteSettings((previous) => ({ ...previous, paymentTimeoutMinutes: res.data.paymentTimeoutMinutes }));
      toast({ title: `ตั้งเวลาชำระเงินเป็น ${minutes} นาทีแล้ว` });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error?.message || "บันทึกเวลาไม่สำเร็จ";
      toast({ title: "บันทึกไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setIsSavingPaymentTimeout(false);
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
  const zoneOccupancy = getZoneOccupancy(zoneConfigs, tablePositions, bookingHistory);
  const zoneStats: Record<string, number> = Object.fromEntries(zoneOccupancy.map((item) => [item.zone.id, item.confirmedSeats]));
  const openSeatCapacity = zoneOccupancy.filter((item) => item.zone.isActive).reduce((sum, item) => sum + item.capacity, 0);
  const pendingPaymentCount = bookingHistory.filter((booking) => booking.status === "pending_payment").length;
  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];
  const eventName = siteSettings.projectSubtitle || siteSettings.projectTitle;

  const SettingsSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ตั้งค่าระบบ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoadingSettings && (
          <div className={cn("flex items-center justify-between gap-4 rounded-lg border p-4", siteSettings.bookingEnabled ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50")}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="booking-enabled" className="font-medium">เปิดรับจอง</Label>
                <Badge role="status" className={siteSettings.bookingEnabled ? "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100"}>
                  {siteSettings.bookingEnabled ? "สถานะ: เปิดรับจอง" : "สถานะ: ปิดรับจอง"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {siteSettings.bookingEnabled ? "ผู้ใช้สามารถจองที่นั่งได้" : "ปิดรับจองชั่วคราว ผู้ใช้ยังสมัครสมาชิกและเข้าสู่ระบบได้"}
              </p>
            </div>
            <Switch id="booking-enabled" checked={siteSettings.bookingEnabled} onCheckedChange={handleBookingStatusChange} disabled={isUpdatingBookingStatus || (!siteSettings.paymentConfigured && !siteSettings.bookingEnabled)} aria-label="เปิดหรือปิดรับจอง" />
          </div>
        )}
        {!isLoadingSettings && !siteSettings.paymentConfigured && (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            ระบบยังไม่เปิดรับจอง กรุณากรอกบัญชีธนาคารหรือพร้อมเพย์ที่ใช้รับเงินจริง แล้วกดบันทึกการตั้งค่าเว็บ
          </p>
        )}
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
                <TabsTrigger value="bank">การชำระเงิน</TabsTrigger>
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
                <p className="text-sm text-muted-foreground">{"\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e0a\u0e37\u0e48\u0e2d\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e08\u0e30\u0e41\u0e2a\u0e14\u0e07\u0e43\u0e19\u0e17\u0e38\u0e01\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d"}</p>
                <div className="rounded-md border bg-muted/30 p-4 text-center">
                  {siteSettings.projectTitle && <p className="text-2xl font-bold leading-tight">{siteSettings.projectTitle}</p>}
                  {siteSettings.projectSubtitle && <p className="text-2xl font-bold leading-tight">{siteSettings.projectSubtitle}</p>}
                </div>
              </TabsContent>
              <TabsContent value="bank" className="space-y-4 pt-2">
                <div className="rounded-lg border p-4">
                  <Label htmlFor="payment-timeout-minutes" className="font-medium">เวลาชำระเงินหลังจอง</Label>
                  <p className="mt-1 text-sm text-muted-foreground">กำหนดได้ 1–180 นาที มีผลกับการจองใหม่เท่านั้น รายการที่จองแล้วจะใช้กำหนดเวลาเดิม</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Input id="payment-timeout-minutes" type="number" min={1} max={180} step={1} inputMode="numeric" className="w-28" value={siteSettings.paymentTimeoutMinutes || ""} onChange={(event) => setSiteSettings((previous) => ({ ...previous, paymentTimeoutMinutes: event.target.value === "" ? 0 : Number(event.target.value) }))} />
                    <span className="text-sm text-muted-foreground">นาที</span>
                    <Button type="button" variant="outline" onClick={handleSavePaymentTimeout} disabled={isSavingPaymentTimeout}>
                      {isSavingPaymentTimeout ? "กำลังบันทึก..." : "บันทึกเวลา"}
                    </Button>
                  </div>
                </div>
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
  // เรียกเป็นฟังก์ชัน ไม่ใช่ <Component /> เพื่อไม่ให้ React สร้าง element ใหม่ทุกครั้งที่ state เปลี่ยน
  const renderNavItem = (item: typeof NAV_ITEMS[number], compact = false) => {
    const isActive = activeSection === item.id;
    const showBadge = item.id === "bookings" && pendingPaymentCount > 0;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => navigateTo(item.id)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "shrink-0 gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs" : "w-full gap-3 px-3 py-2 text-left text-sm",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden="true" />
        <span>{item.label}</span>
        {showBadge && (
          <span className="ml-auto rounded-full bg-warning/15 px-1.5 text-[11px] font-semibold tabular-nums text-warning" aria-label={`รอชำระเงิน ${pendingPaymentCount} รายการ`}>
            {pendingPaymentCount}
          </span>
        )}
      </button>
    );
  };

  const bookingStatusPill = isLoadingSettings ? (
    <span className="inline-block h-5 w-24 animate-pulse rounded-full bg-muted" />
  ) : (
    <button
      type="button"
      onClick={() => navigateTo("settings")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        siteSettings.bookingEnabled ? "border-success/20 bg-success/10 text-success" : "border-warning/20 bg-warning/10 text-warning"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", siteSettings.bookingEnabled ? "bg-success" : "bg-warning")} aria-hidden="true" />
      {siteSettings.bookingEnabled ? "เปิดรับจองอยู่" : "ปิดรับจอง"}
    </button>
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
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{zone.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch checked={zone.isActive} onCheckedChange={(v) => void handleZoneToggle(zone.id, v)} aria-label={`เปิดหรือปิด${zone.name}`} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label={`ลบ${zone.name}`}>
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
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => handleDeleteZone(zone.id)}>ยืนยันการลบ</AlertDialogAction>
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
                  onCheckedChange={(v) => void handleIndividualSeatBookingToggle(zone.id, v)} />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ราคา/ที่นั่ง (บาท)</Label>
                  <ZonePriceInput value={zone.seatPrice}
                    disabled={!zone.isActive || !zone.allowIndividualSeatBooking}
                    onSave={(value) => handlePriceChange(zone.id, "seatPrice", value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ราคา/โต๊ะ (บาท)</Label>
                  <ZonePriceInput value={zone.tablePrice}
                    disabled={!zone.isActive}
                    onSave={(value) => handlePriceChange(zone.id, "tablePrice", value)} />
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="โซนที่เปิดบริการ" value={zoneConfigs.filter((z) => z.isActive).length} suffix={`/ ${zoneConfigs.length} โซน`} />
        <StatCard label="ที่นั่งที่จองแล้ว" value={Object.values(zoneStats).reduce((a, b) => a + b, 0).toLocaleString("th-TH")} suffix="ที่นั่ง" />
        <StatCard label="ที่นั่งที่เปิดบริการ" value={openSeatCapacity.toLocaleString("th-TH")} suffix="ที่นั่ง" />
        <StatCard label="การจองที่ยืนยันแล้ว" value={bookingHistory.filter((b) => b.status === "confirmed").length.toLocaleString("th-TH")} suffix="รายการ" />
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const schoolMark = (
    <Image src="/images/psm.png" alt="ตราโรงเรียนประสานมิตร" width={40} height={40} className="h-9 w-9 shrink-0 object-contain" />
  );

  return (
    <div className="flex min-h-screen bg-muted/40">

      {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="space-y-3 border-b px-4 py-4">
          <div className="flex items-center gap-2.5">
            {schoolMark}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">ผู้ดูแลระบบ</p>
              {isLoadingSettings ? (
                <div className="mt-1 h-4 w-28 animate-pulse rounded bg-muted" />
              ) : (
                <p className="line-clamp-2 text-sm font-bold leading-tight" title={eventName}>{eventName || "ระบบจองโต๊ะ"}</p>
              )}
            </div>
          </div>
          {bookingStatusPill}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="เมนูผู้ดูแล">
          {NAV_ITEMS.map((item) => renderNavItem(item))}
        </nav>

        <div className="space-y-0.5 border-t p-2">
          <button type="button" onClick={() => router.push("/")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />ไปหน้าเว็บจอง
          </button>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" aria-hidden="true" />ออกจากระบบ
          </button>
          {user?.fullname && <p className="truncate px-3 pt-1 text-xs text-muted-foreground">{user.fullname}</p>}
        </div>
      </aside>

      {/* ── Main Area ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 border-b bg-card md:hidden">
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            {schoolMark}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{eventName || "ระบบจองโต๊ะ"}</p>
              <div className="mt-0.5">{bookingStatusPill}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} aria-label="ไปหน้าเว็บจอง"><ExternalLink className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="ออกจากระบบ"><LogOut className="h-4 w-4" /></Button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none]" aria-label="เมนูผู้ดูแล">
            {NAV_ITEMS.map((item) => renderNavItem(item, true))}
          </nav>
        </div>

        {/* Content */}
        <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-4 md:p-6 lg:p-8">

          {/* Page header */}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{activeNavItem.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{activeNavItem.description}</p>
          </div>

          {/* Section content */}
          {activeSection === "overview" && <DashboardOverview onOpenBookings={openBookings} onOpenSection={navigateTo} />}
          {activeSection === "bookings" && (
            <DashboardBookings searchTerm={searchTerm} onSearchTermChange={setSearchTerm} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />
          )}
          {activeSection === "checkin" && <DashboardCheckInMap eventName={eventName || "โครงการปัจจุบัน"} />}
          {activeSection === "zones" && ZonesSection()}
          {activeSection === "layout" && <TableLayoutEditor />}
          {activeSection === "settings" && SettingsSection()}
        </div>
      </div>
    </div>
  );
}
