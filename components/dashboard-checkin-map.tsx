"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Check, CheckCircle2, Clock3, GraduationCap, Phone, RotateCcw, Search, Ticket, UserRound } from "lucide-react";
import { useBooking, type BookingRecord, type TablePosition } from "@/components/booking-provider";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { apiBaseUrl as baseURL } from "@/lib/api";
type ReservedSeat = BookingRecord["seats"][number] & { booking: BookingRecord };
type ArrivalFilter = "all" | "waiting" | "checkedin";

const SEAT_NUMBERS = Array.from({ length: 9 }, (_, index) => index + 1);
const FILTERS: { value: ArrivalFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "waiting", label: "ยังไม่มา" },
  { value: "checkedin", label: "มาแล้ว" },
];

const getSeatKey = (seat: { tableId: number; seatNumber: number; zone: string }) =>
  `${seat.zone}-${seat.tableId}-${seat.seatNumber}`;

// แผงรายละเอียดอยู่ข้างผังบนจอกว้าง และเปิดเป็น bottom sheet บนจอที่เล็กกว่า
function useIsWideScreen() {
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isWide;
}

export function DashboardCheckInMap() {
  const { bookingHistory, setBookingHistory, tablePositions, zoneConfigs } = useBooking();
  const { toast } = useToast();
  const isWideScreen = useIsWideScreen();
  const [search, setSearch] = useState("");
  const [arrivalFilter, setArrivalFilter] = useState<ArrivalFilter>("all");
  const [selectedSeat, setSelectedSeat] = useState<ReservedSeat | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<ReservedSeat | null>(null);
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const seatsByKey = useMemo(() => {
    const map = new Map<string, ReservedSeat>();
    bookingHistory.filter((booking) => ["confirmed", "pending", "pending_payment"].includes(booking.status)).forEach((booking) => booking.seats.forEach((seat) => {
      const key = getSeatKey(seat);
      if (!map.has(key)) map.set(key, { ...seat, booking });
    }));
    return map;
  }, [bookingHistory]);

  const confirmedSeats = Array.from(seatsByKey.values()).filter((seat) => seat.booking.status === "confirmed");
  const checkedInCount = confirmedSeats.filter((seat) => seat.checkIn?.checkedIn).length;
  const waitingCount = confirmedSeats.length - checkedInCount;
  const query = search.trim().toLocaleLowerCase();
  const isFiltering = Boolean(query) || arrivalFilter !== "all";

  const handleCheckIn = async () => {
    if (!checkInTarget) return;
    const seat = checkInTarget;
    const nextValue = !seat.checkIn?.checkedIn;
    setIsSaving(true);
    try {
      const { data } = await axios.patch(`${baseURL}/api/bookings/${seat.booking.id}/check-in`, {
        tableId: seat.tableId,
        seatNumber: seat.seatNumber,
        zone: seat.zone,
        checkedIn: nextValue,
      });
      setBookingHistory((previous) => previous.map((booking) => booking.id === data.id ? data : booking));
      const updatedSeat = data.seats.find((item: ReservedSeat) => getSeatKey(item) === getSeatKey(seat));
      setSelectedSeat({ ...seat, ...updatedSeat, booking: data });
      setIsCheckInDialogOpen(false);
      setCheckInTarget(null);
      toast({ title: nextValue ? "ยืนยันเช็กอินแล้ว" : "ยกเลิกเช็กอินแล้ว", description: `${seat.tableName || seat.tableId} · ที่นั่ง ${seat.seatNumber}` });
    } catch (error: any) {
      toast({ title: "เช็กอินไม่สำเร็จ", description: error?.response?.data?.message || "กรุณาลองใหม่อีกครั้ง", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ที่นั่งตรงกับคำค้นหาและตัวกรองการมาถึงหรือไม่
  const matchesSeat = (seat: ReservedSeat | undefined, table: TablePosition) => {
    if (arrivalFilter !== "all") {
      if (!seat || seat.booking.status !== "confirmed") return false;
      const isCheckedIn = Boolean(seat.checkIn?.checkedIn);
      if (arrivalFilter === "checkedin" ? !isCheckedIn : isCheckedIn) return false;
    }
    if (!query) return true;
    const searchable = seat
      ? `${seat.studentName || ""} ${seat.classLevel || ""} ${seat.booking.customerName} ${seat.booking.phone} ${seat.booking.id} ${table.name} ${table.zone}-${table.id} ${seat.seatNumber}`
      : `${table.name} ${table.zone}-${table.id}`;
    return searchable.toLocaleLowerCase().includes(query);
  };

  const getTableSeats = (table: TablePosition) =>
    SEAT_NUMBERS.map((seatNumber) => ({ seatNumber, seat: seatsByKey.get(getSeatKey({ zone: table.zone, tableId: table.id, seatNumber })) }));

  const tableMatches = (table: TablePosition) => {
    if (!isFiltering) return true;
    if (arrivalFilter === "all" && query && `${table.name} ${table.zone}-${table.id}`.toLocaleLowerCase().includes(query)) return true;
    return getTableSeats(table).some(({ seat }) => matchesSeat(seat, table));
  };

  const renderTable = (table: TablePosition) => {
    const tableLabel = table.name || `${table.zone}${table.id}`;

    return (
      <div key={`${table.zone}-${table.id}`} className="rounded-xl border bg-card px-1 py-2 text-center">
        <div className="relative mx-auto h-[156px] w-[156px]">
          <div className="absolute left-1/2 top-1/2 flex h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-1 text-sm font-bold text-slate-800">
            <span className="truncate">{tableLabel}</span>
          </div>
          {getTableSeats(table).map(({ seatNumber, seat }) => {
            const angle = ((seatNumber - 1) * 40 - 90) * Math.PI / 180;
            const left = 50 + Math.cos(angle) * 40;
            const top = 50 + Math.sin(angle) * 40;
            const isConfirmed = seat?.booking.status === "confirmed";
            const isCheckedIn = Boolean(isConfirmed && seat?.checkIn?.checkedIn);
            const isSelected = Boolean(selectedSeat && getSeatKey(selectedSeat) === getSeatKey({ zone: table.zone, tableId: table.id, seatNumber }));
            const isDimmed = isFiltering && !matchesSeat(seat, table);
            return (
              <button
                key={seatNumber}
                type="button"
                aria-label={`${tableLabel} ที่นั่ง ${seatNumber}${isCheckedIn ? " เช็กอินแล้ว" : seat ? " จองแล้ว" : " ว่าง"}`}
                title={seat ? `${seat.studentName || seat.booking.customerName} · ${seat.classLevel || ""}` : "ที่นั่งว่าง"}
                onClick={() => seat && setSelectedSeat(seat)}
                disabled={!seat}
                style={{ left: `${left}%`, top: `${top}%` }}
                className={cn(
                  "absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  !seat && "cursor-default border-slate-300 bg-white text-slate-500",
                  seat && !isConfirmed && "border-rose-200 bg-rose-100 text-rose-700",
                  isConfirmed && !isCheckedIn && "border-primary bg-primary text-primary-foreground hover:brightness-95",
                  isCheckedIn && "border-success bg-success text-success-foreground",
                  isSelected && "z-10 ring-2 ring-primary ring-offset-2",
                  isDimmed && "opacity-25"
                )}
              >
                {isCheckedIn ? <Check className="h-4 w-4" /> : seatNumber}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const activeZones = zoneConfigs.filter((zone) => zone.isActive);
  const zoneSections = activeZones.map((zone) => ({
    zone,
    tables: tablePositions
      .filter((table) => table.zone === zone.id && table.isActive !== false)
      .sort((a, b) => a.y - b.y || a.x - b.x),
  }));
  const visibleSections = zoneSections
    .map((section) => ({ ...section, tables: section.tables.filter(tableMatches) }))
    .filter((section) => !isFiltering || section.tables.length > 0);
  const selectedIsConfirmed = selectedSeat?.booking.status === "confirmed";
  const selectedIsCheckedIn = Boolean(selectedSeat?.checkIn?.checkedIn);

  const seatDetail = !selectedSeat ? (
    <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground"><UserRound className="h-8 w-8" /><p>เลือกที่นั่งที่จองแล้วบนผัง<br />เพื่อดูข้อมูลและยืนยันเช็กอิน</p></div>
  ) : (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">รายละเอียดที่นั่ง</p>
        <h3 className="text-xl font-bold">{selectedSeat.tableName || `${selectedSeat.zone}${selectedSeat.tableId}`} · ที่นั่ง {selectedSeat.seatNumber}</h3>
        <span className={cn("mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium", selectedIsCheckedIn ? "border-success/20 bg-success/10 text-success" : selectedIsConfirmed ? "border-primary/20 bg-primary/10 text-primary" : "border-warning/20 bg-warning/10 text-warning")}>{selectedIsCheckedIn ? "เช็กอินแล้ว" : selectedIsConfirmed ? "จองแล้ว · ยังไม่มา" : "รอยืนยันการชำระเงิน"}</span>
      </div>
      <div className="rounded-lg bg-primary/5 p-3">
        <div className="font-semibold">{selectedSeat.studentName || selectedSeat.booking.customerName}</div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap className="h-4 w-4" />{selectedSeat.classLevel || "ไม่ระบุระดับชั้น"}</div>
      </div>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-3"><dt className="flex items-center gap-2 text-muted-foreground"><Ticket className="h-4 w-4" />รหัสจอง</dt><dd className="text-right font-medium">{selectedSeat.booking.id}</dd></div>
        <div className="flex justify-between gap-3"><dt className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" />ผู้จอง</dt><dd className="text-right">{selectedSeat.booking.customerName}<br />{selectedSeat.booking.phone}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">สถานะชำระเงิน</dt><dd className="font-medium">{selectedIsConfirmed ? "ยืนยันแล้ว" : "รอตรวจสอบ"}</dd></div>
        {selectedIsCheckedIn && selectedSeat.checkIn?.checkedInAt && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">เวลาเช็กอิน</dt><dd>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedSeat.checkIn.checkedInAt))}</dd></div>}
      </dl>
      <Button
        size="lg"
        variant={selectedIsCheckedIn ? "outline" : "default"}
        className={cn("w-full", !selectedIsCheckedIn && "bg-success text-success-foreground hover:bg-success/90")}
        disabled={!selectedIsConfirmed || isSaving}
        onClick={() => { setCheckInTarget(selectedSeat); setIsCheckInDialogOpen(true); }}
      >
        {selectedIsCheckedIn ? "ยกเลิกเช็กอิน" : isSaving ? "กำลังบันทึก..." : "ยืนยันเช็กอิน"}
      </Button>
      {!selectedIsConfirmed && <p className="text-center text-xs text-muted-foreground">เช็กอินได้เมื่อยืนยันการจองแล้วเท่านั้น</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="มาแล้ว" value={checkedInCount} suffix="ที่นั่ง" icon={CheckCircle2} tone="success" />
        <StatCard label="ยังไม่มา" value={waitingCount} suffix="ที่นั่ง" icon={Clock3} tone="primary" />
        <StatCard label="ยืนยันแล้ว" value={confirmedSeats.length} suffix="ที่นั่ง" icon={UserRound} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="bg-card pl-9" placeholder="ค้นหาชื่อ รหัสจอง หรือโต๊ะ" aria-label="ค้นหาที่นั่ง" />
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="กรองตามการมาถึง">
          {FILTERS.map((filter) => {
            const isActive = arrivalFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setArrivalFilter(filter.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "border-primary/30 bg-primary/10 font-medium text-primary" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 overflow-hidden rounded-xl">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border border-slate-300 bg-white" />ว่าง</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-rose-200" />รอชำระเงิน</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-primary" />จองแล้ว · ยังไม่มา</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-success" />มาแล้ว</span>
            </div>
            <div className="mx-auto max-w-3xl rounded-b-[48px] border-x border-b border-primary/20 bg-primary/5 py-3 text-center font-semibold text-primary">เวที</div>
            {activeZones.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">ไม่มีโซนที่เปิดใช้งาน</div>
            ) : visibleSections.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <p className="font-medium">ไม่พบที่นั่งที่ตรงกับเงื่อนไข</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearch(""); setArrivalFilter("all"); }}>ล้างตัวกรอง</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleSections.map(({ zone, tables }) => (
                  <section key={zone.id} className="rounded-xl border bg-muted/30 p-3">
                    <h4 className="mb-2 text-sm font-semibold text-primary">{zone.name || `โซน ${zone.id}`}</h4>
                    {tables.length > 0 ? (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] justify-items-stretch gap-2">{tables.map(renderTable)}</div>
                    ) : (
                      <p className="rounded-lg border border-dashed bg-card p-4 text-center text-sm text-muted-foreground">โซนนี้ยังไม่มีโต๊ะในผัง</p>
                    )}
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isWideScreen && (
          <Card className="sticky top-4 rounded-xl">
            <CardContent className="p-5">{seatDetail}</CardContent>
          </Card>
        )}
      </div>

      {!isWideScreen && (
        <Sheet open={Boolean(selectedSeat)} onOpenChange={(open) => { if (!open) setSelectedSeat(null); }}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-6 pt-8">
            <SheetTitle className="sr-only">รายละเอียดที่นั่ง</SheetTitle>
            {seatDetail}
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={isCheckInDialogOpen} onOpenChange={(open) => {
        if (!isSaving) {
          setIsCheckInDialogOpen(open);
          if (!open) setCheckInTarget(null);
        }
      }}>
        <DialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-md">
          <div className={cn("px-6 pb-5 pt-7 text-center", checkInTarget?.checkIn?.checkedIn ? "bg-amber-50" : "bg-emerald-50")}>
            <div className={cn("mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl", checkInTarget?.checkIn?.checkedIn ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
              {checkInTarget?.checkIn?.checkedIn ? <RotateCcw className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
            </div>
            <DialogHeader className="items-center space-y-1">
              <DialogTitle className="text-xl">{checkInTarget?.checkIn?.checkedIn ? "ยกเลิกการเช็กอิน" : "ยืนยันเช็กอิน"}</DialogTitle>
              <DialogDescription className="text-center">
                {checkInTarget?.checkIn?.checkedIn ? "ต้องการเปลี่ยนสถานะที่นั่งนี้กลับเป็นยังไม่มาใช่ไหม" : "ตรวจสอบข้อมูลผู้เข้าร่วมก่อนบันทึกสถานะเช็กอิน"}
              </DialogDescription>
            </DialogHeader>
          </div>

          {checkInTarget && <div className="space-y-4 p-6">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">ที่นั่ง</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {checkInTarget.tableName || `${checkInTarget.zone}${checkInTarget.tableId}`} · ที่นั่ง {checkInTarget.seatNumber}
                </span>
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold">{checkInTarget.studentName || checkInTarget.booking.customerName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{checkInTarget.classLevel || "ไม่ระบุระดับชั้น"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={isSaving} onClick={() => { setIsCheckInDialogOpen(false); setCheckInTarget(null); }}>ยกเลิก</Button>
              <Button type="button" className={cn("flex-1", checkInTarget.checkIn?.checkedIn ? "bg-amber-600 hover:bg-amber-700" : "bg-success text-success-foreground hover:bg-success/90")} disabled={isSaving} onClick={handleCheckIn}>
                {isSaving ? "กำลังบันทึก..." : checkInTarget.checkIn?.checkedIn ? "ยืนยันยกเลิก" : "ยืนยันเช็กอิน"}
              </Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
