"use client";

import type React from "react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, BookOpen, LayoutGrid, ScanLine,
  Settings, LogOut, ExternalLink,
} from "lucide-react";
import { useBooking } from "@/components/booking-provider";
import { TableLayoutEditor } from "@/components/table-layout-editor";
import { DashboardOverview } from "@/components/dashboard-overview";
import { DashboardBookings } from "@/components/dashboard-bookings";
import { DashboardSettings } from "@/components/dashboard-settings";
import { DashboardCheckInMap } from "@/components/dashboard-checkin-map";
import { useLoadingRouter } from "@/components/navigation-loading";
import axios from "axios";
import { cn } from "@/lib/utils";
import { apiBaseUrl as baseURL } from "@/lib/api";
import { type BookingStatus } from "@/lib/booking-status";
import { EMPTY_SITE_SETTINGS, type SiteSettings, normalizeSiteSettings } from "@/lib/site-settings";

type Section = "overview" | "bookings" | "checkin" | "layout" | "settings";

const NAV_ITEMS: { id: Section; label: string; description: string; icon: React.ElementType }[] = [
  { id: "overview", label: "ภาพรวม", description: "ยอดจอง ที่นั่ง และสิ่งที่ต้องติดตาม", icon: LayoutDashboard },
  { id: "bookings", label: "การจอง", description: "ค้นหา ตรวจสอบ และจัดการรายการจอง", icon: BookOpen },
  { id: "checkin", label: "เช็กอินหน้างาน", description: "ตรวจรายชื่อและยืนยันการมาถึงตามที่นั่ง", icon: ScanLine },
  { id: "layout", label: "ผังโต๊ะและโซน", description: "จัดโซน ราคา และตำแหน่งโต๊ะทั้งหมดบนผังเดียว", icon: LayoutGrid },
  { id: "settings", label: "ตั้งค่า", description: "ข้อมูลโครงการ การรับจอง และช่องทางชำระเงิน", icon: Settings },
];
const DEFAULT_SECTION: Section = "overview";

// เก็บเมนูที่เลือกไว้ใน ?section= เพื่อให้ refresh, ปุ่ม back และการแชร์ลิงก์กลับมาที่หน้าเดิม
const readSectionFromUrl = (): Section => {
  const value = new URLSearchParams(window.location.search).get("section");
  if (value === "zones") return "layout";
  return NAV_ITEMS.some((item) => item.id === value) ? (value as Section) : DEFAULT_SECTION;
};

export default function DashboardPage() {
  const router = useLoadingRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { bookingHistory } = useBooking();

  const [activeSection, setActiveSection] = useState<Section>(DEFAULT_SECTION);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(EMPTY_SITE_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

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
    setFocusBookingId(null);
    const url = new URL(window.location.href);
    if (section === DEFAULT_SECTION) url.searchParams.delete("section");
    else url.searchParams.set("section", section);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  // เปิดหน้าการจองพร้อมตัวกรอง หรือเปิดรายละเอียดการจองที่ระบุทันที
  const openBookings = (status: BookingStatus | "all" = "all", bookingId?: string) => {
    setSearchTerm("");
    setStatusFilter(status);
    navigateTo("bookings");
    setFocusBookingId(bookingId ?? null);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  const loadSiteSettings = () => {
    setIsLoadingSettings(true);
    axios
      .get(`${baseURL}/api/settings?includeBankImage=true&t=${Date.now()}`)
      .then((res) => setSiteSettings(normalizeSiteSettings(res.data)))
      .catch(() => setSiteSettings(EMPTY_SITE_SETTINGS))
      .finally(() => setIsLoadingSettings(false));
  };

  useEffect(() => {
    loadSiteSettings();
  }, []);

  const pendingPaymentCount = bookingHistory.filter((booking) => booking.status === "pending_payment").length;
  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];
  const eventName = siteSettings.projectSubtitle || siteSettings.projectTitle;

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
            <DashboardBookings initialBookingId={focusBookingId} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />
          )}
          {activeSection === "checkin" && <DashboardCheckInMap />}
          {activeSection === "layout" && <TableLayoutEditor />}
          {activeSection === "settings" && <DashboardSettings settings={siteSettings} isLoading={isLoadingSettings} onSettingsChange={setSiteSettings} />}
        </div>
      </div>
    </div>
  );
}
