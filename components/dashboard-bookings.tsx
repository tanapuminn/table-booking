"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import dayjs from "dayjs";
import {
  CheckCircle2, ChevronRight, Download, ExternalLink, ImageOff, Pencil, Phone, Search, Ticket, Trash2, XCircle,
} from "lucide-react";
import { useBooking, type BookingRecord } from "@/components/booking-provider";
import { useLoadingRouter } from "@/components/navigation-loading";
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiBaseUrl as baseURL } from "@/lib/api";
import { BOOKING_STATUS_META, type BookingStatus, formatBaht, getBookingStatusMeta } from "@/lib/booking-status";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;
const STATUS_TABS: BookingStatus[] = ["confirmed", "pending_payment", "payment_timeout", "cancelled"];

type PendingAction = "confirm" | "cancel" | "delete";

const ACTION_COPY: Record<PendingAction, { title: string; description: string; label: string; className: string }> = {
  confirm: {
    title: "ยืนยันการจองนี้?",
    description: "สถานะจะเปลี่ยนเป็นยืนยันแล้ว และระบบจะส่งตั๋วไปที่อีเมลของผู้จอง (ถ้ามี)",
    label: "ยืนยันการจอง",
    className: "bg-success text-success-foreground hover:bg-success/90",
  },
  cancel: {
    title: "ยกเลิกการจองนี้?",
    description: "ที่นั่งจะถูกคืนให้คนอื่นจองได้ และเปลี่ยนสถานะกลับไม่ได้",
    label: "ยกเลิกการจอง",
    className: buttonVariants({ variant: "destructive" }),
  },
  delete: {
    title: "ลบการจองถาวร?",
    description: "รายการนี้จะถูกลบออกจากระบบและกู้คืนไม่ได้",
    label: "ลบถาวร",
    className: buttonVariants({ variant: "destructive" }),
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const meta = getBookingStatusMeta(status);
  return <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", meta.badgeClass)}>{meta.label}</span>;
};

// รวมที่นั่งตามโต๊ะ เช่น "B4 · 3 ที่นั่ง, VIP6 · 9 ที่นั่ง"
const summarizeSeats = (seats: BookingRecord["seats"]) => {
  const counts = new Map<string, number>();
  seats.forEach((seat) => {
    const table = seat.tableName || `${seat.zone}${seat.tableId}`;
    counts.set(table, (counts.get(table) || 0) + 1);
  });
  return Array.from(counts, ([table, count]) => `${table} · ${count} ที่นั่ง`).join(", ");
};

const matchesSearch = (booking: BookingRecord, query: string) => {
  if (!query) return true;
  const searchable = [
    booking.customerName, booking.phone, booking.id,
    ...booking.seats.flatMap((seat) => [seat.tableName, seat.studentName]),
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  return searchable.includes(query);
};

export function DashboardBookings({
  searchTerm, onSearchTermChange, statusFilter, onStatusFilterChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}) {
  const { toast } = useToast();
  const router = useLoadingRouter();
  const { bookingHistory, setBookingHistory, updateBookingRecord } = useBooking();

  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const query = searchTerm.trim().toLocaleLowerCase();
  const sortedBookings = [...bookingHistory].sort((a, b) => dayjs(b.bookingDate).valueOf() - dayjs(a.bookingDate).valueOf());
  const searchedBookings = sortedBookings.filter((booking) => matchesSearch(booking, query));
  const filteredBookings = searchedBookings.filter((booking) => statusFilter === "all" || booking.status === statusFilter);
  const pageCount = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const visibleBookings = filteredBookings.slice(pageStart, pageStart + PAGE_SIZE);
  const selectedBooking = bookingHistory.find((booking) => booking.id === selectedId) ?? null;

  useEffect(() => setPage(1), [searchTerm, statusFilter]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const openBooking = (bookingId: string) => {
    setIsEditing(false);
    setSelectedId(bookingId);
  };

  const runPendingAction = async () => {
    if (!selectedBooking || !pendingAction) return;
    const bookingId = selectedBooking.id;
    setIsActionRunning(true);
    try {
      if (pendingAction === "delete") {
        await axios.delete(`${baseURL}/api/bookings/${bookingId}`);
        setBookingHistory((previous) => previous.filter((booking) => booking.id !== bookingId));
        setSelectedId(null);
        toast({ title: "ลบการจองแล้ว", description: bookingId });
      } else {
        const status = pendingAction === "confirm" ? "confirmed" : "cancelled";
        await axios.patch(`${baseURL}/api/bookings/${bookingId}`, { status });
        setBookingHistory((previous) => previous.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)));
        toast({ title: status === "confirmed" ? "ยืนยันการจองแล้ว" : "ยกเลิกการจองแล้ว", description: bookingId });
      }
      setPendingAction(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง";
      toast({ title: "ดำเนินการไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleEditBooking = async (updates: Partial<BookingRecord>) => {
    if (!selectedBooking) return;
    try {
      await updateBookingRecord(selectedBooking.id, updates);
      toast({ title: "บันทึกข้อมูลผู้จองแล้ว", description: selectedBooking.id });
      setIsEditing(false);
    } catch {
      toast({ title: "แก้ไขข้อมูลไม่สำเร็จ", variant: "destructive" });
    }
  };

  const handleExportBookings = async () => {
    setIsExporting(true);
    try {
      const response = await axios.get<Blob>(`${baseURL}/api/bookings/export/xlsx`, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] || "");
      if (!contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
        throw new Error("Unexpected export response");
      }
      const filename = /filename="?([^";]+)"?/i.exec(String(response.headers["content-disposition"] || ""))?.[1] || "booking_report.xlsx";
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      toast({ title: "ส่งออก Excel ไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const statusTabs = [
    { value: "all", label: "ทั้งหมด", count: searchedBookings.length },
    ...STATUS_TABS.map((status) => ({
      value: status,
      label: BOOKING_STATUS_META[status].label,
      count: searchedBookings.filter((booking) => booking.status === status).length,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="bg-card pl-9"
              placeholder="ค้นหาชื่อ เบอร์โทร รหัสจอง หรือโต๊ะ"
              aria-label="ค้นหาการจอง"
            />
          </div>
          <Button variant="outline" className="ml-auto shrink-0 gap-2 bg-card" onClick={handleExportBookings} disabled={isExporting} aria-label="ส่งออก Excel">
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{isExporting ? "กำลังส่งออก..." : "ส่งออก Excel"}</span>
          </Button>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" role="tablist" aria-label="กรองตามสถานะ">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onStatusFilterChange(tab.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "border-primary/30 bg-primary/10 font-medium text-primary" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className={cn("tabular-nums", isActive ? "text-primary" : "text-foreground")}>{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {filteredBookings.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium">ไม่พบการจองที่ตรงกับเงื่อนไข</p>
            <p className="mt-1 text-sm text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น</p>
            {(query || statusFilter !== "all") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { onSearchTermChange(""); onStatusFilterChange("all"); }}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <Table className="hidden lg:table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">ผู้จอง</TableHead>
                  <TableHead>ที่นั่ง</TableHead>
                  <TableHead>วันที่จอง</TableHead>
                  <TableHead className="whitespace-nowrap text-right">ยอดรวม</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-10"><span className="sr-only">เปิดรายละเอียด</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleBookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    onClick={() => openBooking(booking.id)}
                    data-state={booking.id === selectedId ? "selected" : undefined}
                    className="cursor-pointer"
                  >
                    <TableCell className="py-3 pl-4">
                      <button type="button" className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => { event.stopPropagation(); openBooking(booking.id); }}>
                        {booking.customerName}
                      </button>
                      <p className="text-xs text-muted-foreground">{booking.phone}</p>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground">{summarizeSeats(booking.seats)}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{dayjs(booking.bookingDate).format("DD/MM/YYYY HH:mm")}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatBaht(booking.totalPrice)}</TableCell>
                    <TableCell><StatusBadge status={booking.status} /></TableCell>
                    <TableCell className="pr-3"><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Mobile list */}
            <ul className="divide-y lg:hidden">
              {visibleBookings.map((booking) => (
                <li key={booking.id}>
                  <button type="button" onClick={() => openBooking(booking.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{booking.customerName}</p>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {summarizeSeats(booking.seats)} · {dayjs(booking.bookingDate).format("DD/MM HH:mm")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{formatBaht(booking.totalPrice)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                แสดง {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredBookings.length)} จาก {filteredBookings.length} รายการ
              </p>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>ก่อนหน้า</Button>
                  <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">{page} / {pageCount}</span>
                  <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>ถัดไป</Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={Boolean(selectedBooking)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          {selectedBooking && (
            <BookingDetail
              booking={selectedBooking}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onCancelEdit={() => setIsEditing(false)}
              onSave={handleEditBooking}
              onAction={setPendingAction}
              onOpenTicket={() => router.push(`/ticket?bookingId=${selectedBooking.id}`)}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !isActionRunning) setPendingAction(null); }}>
        <AlertDialogContent>
          {pendingAction && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{ACTION_COPY[pendingAction].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedBooking && <span className="mb-2 block font-medium text-foreground">{selectedBooking.customerName} · {selectedBooking.id}</span>}
                  {ACTION_COPY[pendingAction].description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isActionRunning}>ไม่ใช่ตอนนี้</AlertDialogCancel>
                <AlertDialogAction
                  className={ACTION_COPY[pendingAction].className}
                  disabled={isActionRunning}
                  onClick={(event) => { event.preventDefault(); void runPendingAction(); }}
                >
                  {isActionRunning ? "กำลังดำเนินการ..." : ACTION_COPY[pendingAction].label}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BookingDetail({
  booking, isEditing, onEdit, onCancelEdit, onSave, onAction, onOpenTicket,
}: {
  booking: BookingRecord;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<BookingRecord>) => Promise<void>;
  onAction: (action: PendingAction) => void;
  onOpenTicket: () => void;
}) {
  const isClosed = booking.status === "cancelled" || booking.status === "payment_timeout";
  const checkedInCount = booking.seats.filter((seat) => seat.checkIn?.checkedIn).length;

  return (
    <>
      <SheetHeader className="space-y-1 border-b px-6 py-5 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-xl">{booking.customerName}</SheetTitle>
          <StatusBadge status={booking.status} />
        </div>
        <SheetDescription className="tabular-nums">
          {booking.id} · จองเมื่อ {dayjs(booking.bookingDate).format("DD/MM/YYYY HH:mm")}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">ข้อมูลผู้จอง</h3>
            {!isEditing && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />แก้ไข
              </Button>
            )}
          </div>
          {isEditing ? (
            <EditBookingForm booking={booking} onSave={onSave} onCancel={onCancelEdit} />
          ) : (
            <dl className="space-y-2 rounded-lg border p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">เบอร์โทร</dt>
                <dd><a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{booking.phone}</a></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">หมายเหตุ</dt>
                <dd className="text-right">{booking.notes || "—"}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">ที่นั่ง ({booking.seats.length})</h3>
            {booking.status === "confirmed" && <span className="text-xs text-muted-foreground">เช็กอินแล้ว {checkedInCount}/{booking.seats.length}</span>}
          </div>
          <ul className="divide-y rounded-lg border text-sm">
            {booking.seats.map((seat) => (
              <li key={`${seat.zone}-${seat.tableId}-${seat.seatNumber}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-24 shrink-0 font-medium tabular-nums">{seat.tableName || `${seat.zone}${seat.tableId}`} · ที่ {seat.seatNumber}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {seat.studentName || "ไม่ระบุชื่อ"}{seat.classLevel ? ` (${seat.classLevel})` : ""}
                </span>
                {seat.checkIn?.checkedIn && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />มาแล้ว</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">ยอดรวม</span>
            <span className="text-xl font-bold tabular-nums">{formatBaht(booking.totalPrice)}</span>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">หลักฐานการชำระเงิน</h3>
          {booking.paymentProof ? (
            <div className="space-y-2">
              <a href={booking.paymentProof} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border bg-muted/30">
                <Image src={booking.paymentProof} alt={`สลิปการชำระเงินของ ${booking.id}`} width={480} height={640} unoptimized className="mx-auto max-h-96 w-auto object-contain" />
              </a>
              <a href={booking.paymentProof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />เปิดรูปเต็ม
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <ImageOff className="h-5 w-5 shrink-0" aria-hidden="true" />ยังไม่มีสลิปแนบมา
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-card px-6 py-4">
        {booking.status === "pending_payment" && (
          <Button className="gap-2 bg-success text-success-foreground hover:bg-success/90" onClick={() => onAction("confirm")}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />ยืนยันการจอง
          </Button>
        )}
        {booking.status === "confirmed" && (
          <Button variant="outline" className="gap-2" onClick={onOpenTicket}>
            <Ticket className="h-4 w-4" aria-hidden="true" />ดูตั๋ว
          </Button>
        )}
        {!isClosed && (
          <Button variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onAction("cancel")}>
            <XCircle className="h-4 w-4" aria-hidden="true" />ยกเลิกการจอง
          </Button>
        )}
        {booking.status !== "confirmed" && (
          <Button variant="ghost" className="ml-auto gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onAction("delete")}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />ลบถาวร
          </Button>
        )}
      </div>
    </>
  );
}

function EditBookingForm({
  booking, onSave, onCancel,
}: {
  booking: BookingRecord;
  onSave: (updates: Partial<BookingRecord>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    customerName: booking.customerName,
    phone: booking.phone,
    notes: booking.notes || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSave({ customerName: formData.customerName, phone: formData.phone, notes: formData.notes });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">ชื่อ-นามสกุล</Label>
        <Input id="edit-name" value={formData.customerName} required
          onChange={(event) => setFormData((previous) => ({ ...previous, customerName: event.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">เบอร์โทรศัพท์</Label>
        <Input id="edit-phone" value={formData.phone} required inputMode="tel"
          onChange={(event) => setFormData((previous) => ({ ...previous, phone: event.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes">หมายเหตุ</Label>
        <Textarea id="edit-notes" rows={3} value={formData.notes}
          onChange={(event) => setFormData((previous) => ({ ...previous, notes: event.target.value }))} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>ยกเลิก</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</Button>
      </div>
    </form>
  );
}
