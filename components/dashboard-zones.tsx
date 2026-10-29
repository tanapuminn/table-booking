"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useBooking, type ZoneConfig } from "@/components/booking-provider";
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiBaseUrl as baseURL } from "@/lib/api";
import { getZoneOccupancy } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

const EMPTY_ZONE = { id: "", name: "", description: "", allowIndividualSeatBooking: true, seatPrice: "", tablePrice: "" };
type ZoneDraft = typeof EMPTY_ZONE;
type ZoneDraftErrors = Partial<Record<keyof ZoneDraft, string>>;

// ช่องราคาที่บันทึกเมื่อออกจากช่องหรือกด Enter และแสดงสถานะการบันทึกในช่องเอง
function ZonePriceInput({ id, value, disabled, onSave }: { id: string; value: number; disabled: boolean; onSave: (value: number) => Promise<void> }) {
  const [draft, setDraft] = useState(String(value));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => setDraft(String(value)), [value]);
  useEffect(() => {
    if (status !== "saved") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const commit = async () => {
    const nextValue = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(nextValue) || nextValue < 0) {
      setDraft(String(value));
      setStatus("error");
      return;
    }
    if (nextValue === value) return;

    setStatus("saving");
    try {
      await onSave(nextValue);
      setStatus("saved");
    } catch {
      setDraft(String(value));
      setStatus("error");
    }
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">฿</span>
      <Input
        id={id}
        type="number"
        min="0"
        inputMode="numeric"
        value={draft}
        className={cn("pl-7 pr-8 text-right tabular-nums", status === "error" && "border-destructive focus-visible:ring-destructive")}
        disabled={disabled || status === "saving"}
        aria-invalid={status === "error"}
        onChange={(event) => { setDraft(event.target.value); if (status === "error") setStatus("idle"); }}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") { setDraft(String(value)); setStatus("idle"); }
        }}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" aria-live="polite">
        {status === "saving" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="กำลังบันทึก" />}
        {status === "saved" && <Check className="h-4 w-4 text-success" aria-label="บันทึกแล้ว" />}
      </span>
    </div>
  );
}

export function DashboardZones() {
  const { toast } = useToast();
  const { zoneConfigs, tablePositions, bookingHistory, addZoneConfig, updateZoneConfig, removeZoneConfig } = useBooking();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draft, setDraft] = useState<ZoneDraft>(EMPTY_ZONE);
  const [errors, setErrors] = useState<ZoneDraftErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  const occupancy = getZoneOccupancy(zoneConfigs, tablePositions, bookingHistory);

  const updateDraft = <K extends keyof ZoneDraft>(key: K, value: ZoneDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const handleZoneToggle = async (zone: ZoneConfig, isActive: boolean) => {
    try {
      await updateZoneConfig(zone.id, { isActive });
      toast({ title: `${isActive ? "เปิด" : "ปิด"}${zone.name}แล้ว` });
    } catch {
      toast({ title: "เปลี่ยนสถานะโซนไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" });
    }
  };

  const handleIndividualSeatBookingToggle = async (zone: ZoneConfig, allow: boolean) => {
    try {
      await updateZoneConfig(zone.id, { allowIndividualSeatBooking: allow });
      toast({ title: allow ? `${zone.name}ขายรายที่นั่งได้แล้ว` : `${zone.name}ขายเฉพาะทั้งโต๊ะ` });
    } catch {
      toast({ title: "เปลี่ยนรูปแบบการขายไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" });
    }
  };

  const handlePriceChange = async (zone: ZoneConfig, type: "seatPrice" | "tablePrice", value: number) => {
    try {
      await updateZoneConfig(zone.id, { [type]: value });
    } catch (error) {
      toast({ title: "บันทึกราคาไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" });
      throw error;
    }
  };

  const validateDraft = (): ZoneDraftErrors => {
    const next: ZoneDraftErrors = {};
    if (!draft.id) next.id = "กรอกรหัสโซน";
    else if (!/^[A-Z0-9]+$/.test(draft.id)) next.id = "ใช้ตัวอักษรอังกฤษหรือตัวเลข ไม่มีช่องว่าง";
    else if (zoneConfigs.some((zone) => zone.id === draft.id)) next.id = "มีรหัสโซนนี้แล้ว";
    if (!draft.name.trim()) next.name = "กรอกชื่อโซน";
    if (!draft.description.trim()) next.description = "กรอกคำอธิบาย";
    const priceError = (value: string) => (value === "" || Number(value) < 0 || !Number.isFinite(Number(value)) ? "กรอกราคาเป็นตัวเลขตั้งแต่ 0" : undefined);
    next.seatPrice = priceError(draft.seatPrice);
    next.tablePrice = priceError(draft.tablePrice);
    return Object.fromEntries(Object.entries(next).filter(([, message]) => message)) as ZoneDraftErrors;
  };

  const handleAddZone = async () => {
    const nextErrors = validateDraft();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsCreating(true);
    try {
      const { data: createdZone } = await axios.post<ZoneConfig>(`${baseURL}/api/zones`, {
        ...draft,
        name: draft.name.trim(),
        description: draft.description.trim(),
        seatPrice: Number(draft.seatPrice),
        tablePrice: Number(draft.tablePrice),
      });
      addZoneConfig(createdZone);
      setDraft(EMPTY_ZONE);
      setIsAddOpen(false);
      toast({ title: `เพิ่ม${createdZone.name}แล้ว`, description: "ไปที่ผังโต๊ะเพื่อวางโต๊ะในโซนนี้" });
    } catch (error) {
      const message = axios.isAxiosError(error) && error.response?.status === 409 ? "มีรหัสโซนนี้แล้ว" : "เพิ่มโซนไม่สำเร็จ กรุณาลองอีกครั้ง";
      toast({ title: "เพิ่มโซนไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteZone = async (zone: ZoneConfig) => {
    try {
      await axios.delete(`${baseURL}/api/zones/${zone.id}`);
      removeZoneConfig(zone.id);
      toast({ title: `ลบ${zone.name}แล้ว` });
    } catch (error) {
      const message = axios.isAxiosError(error) && error.response?.status === 409
        ? error.response.data?.message === "Cannot delete zone while it contains tables"
          ? "ยังมีโต๊ะอยู่ในโซนนี้ กรุณาลบโต๊ะก่อน"
          : "โซนนี้มีประวัติการจองที่เกี่ยวข้อง จึงไม่สามารถลบได้"
        : "ไม่สามารถลบโซนได้";
      toast({ title: "ลบโซนไม่สำเร็จ", description: message, variant: "destructive" });
    }
  };

  const fieldError = (key: keyof ZoneDraft) => errors[key] && <p className="text-xs text-destructive" role="alert">{errors[key]}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{zoneConfigs.filter((zone) => zone.isActive).length} จาก {zoneConfigs.length} โซนเปิดขายอยู่ · ราคาบันทึกอัตโนมัติเมื่อออกจากช่อง</p>
        <Button className="shrink-0 gap-2" onClick={() => { setDraft(EMPTY_ZONE); setErrors({}); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4" aria-hidden="true" />เพิ่มโซน
        </Button>
      </div>

      {zoneConfigs.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="font-medium">ยังไม่มีโซน</p>
          <p className="mt-1 text-sm text-muted-foreground">เพิ่มโซนแรก แล้วไปวางโต๊ะในหน้าผังโต๊ะ</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {occupancy.map(({ zone, capacity, confirmedSeats, heldSeats }) => {
            const tableCount = tablePositions.filter((table) => table.zone === zone.id).length;
            const toPercent = (value: number) => (capacity > 0 ? Math.min(100, (value / capacity) * 100) : 0);
            return (
              <li key={zone.id} className={cn("relative grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-center", !zone.isActive && "bg-muted/30")}>
                {/* ชื่อและสถานะ */}
                <div className="flex min-w-0 items-start gap-3 pr-10 lg:pr-0">
                  <Switch className="mt-0.5" checked={zone.isActive} onCheckedChange={(value) => void handleZoneToggle(zone, value)} aria-label={`เปิดหรือปิด${zone.name}`} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {zone.name}
                      <span className="rounded border px-1.5 text-xs font-normal text-muted-foreground">{zone.id}</span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{zone.isActive ? zone.description : "ปิดขาย · ลูกค้าจะไม่เห็นโซนนี้"}</p>
                  </div>
                </div>

                {/* ความจุ */}
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span>{tableCount} โต๊ะ</span>
                    <span className="tabular-nums">จองแล้ว {confirmedSeats + heldSeats}/{capacity} ที่นั่ง</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${toPercent(confirmedSeats)}%` }} />
                    <div className="h-full bg-warning/60" style={{ width: `${toPercent(heldSeats)}%` }} />
                  </div>
                </div>

                {/* ราคาและรูปแบบการขาย */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      className="scale-75"
                      checked={zone.allowIndividualSeatBooking}
                      disabled={!zone.isActive}
                      onCheckedChange={(value) => void handleIndividualSeatBookingToggle(zone, value)}
                    />
                    ขายรายที่นั่ง
                  </label>
                  <div className="space-y-1">
                    <Label htmlFor={`seat-price-${zone.id}`} className="text-xs text-muted-foreground">ราคา/ที่นั่ง</Label>
                    {zone.allowIndividualSeatBooking ? (
                      <ZonePriceInput id={`seat-price-${zone.id}`} value={zone.seatPrice} disabled={!zone.isActive}
                        onSave={(value) => handlePriceChange(zone, "seatPrice", value)} />
                    ) : (
                      <p className="flex h-10 items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">ขายเฉพาะทั้งโต๊ะ</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`table-price-${zone.id}`} className="text-xs text-muted-foreground">ราคา/โต๊ะ</Label>
                    <ZonePriceInput id={`table-price-${zone.id}`} value={zone.tablePrice} disabled={!zone.isActive}
                      onSave={(value) => handlePriceChange(zone, "tablePrice", value)} />
                  </div>
                </div>

                {/* ลบ */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground lg:static hover:bg-destructive/10 hover:text-destructive" aria-label={`ลบ${zone.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ลบ{zone.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        ลบได้เฉพาะโซนที่ไม่มีโต๊ะและไม่มีประวัติการจอง {tableCount > 0 && `ตอนนี้โซนนี้มี ${tableCount} โต๊ะ ต้องลบโต๊ะในหน้าผังโต๊ะก่อน`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => void handleDeleteZone(zone)}>ลบโซน</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={isAddOpen} onOpenChange={(open) => !isCreating && setIsAddOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มโซน</DialogTitle>
            <DialogDescription>โซนใหม่จะเปิดขายทันที วางโต๊ะได้ในหน้าผังโต๊ะ</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleAddZone(); }} noValidate>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zone-id">รหัส</Label>
                <Input id="zone-id" value={draft.id} placeholder="VIP" maxLength={10} aria-invalid={Boolean(errors.id)}
                  onChange={(event) => updateDraft("id", event.target.value.toUpperCase().replace(/\s/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zone-name">ชื่อโซน</Label>
                <Input id="zone-name" value={draft.name} placeholder="โซน VIP" aria-invalid={Boolean(errors.name)}
                  onChange={(event) => updateDraft("name", event.target.value)} />
              </div>
            </div>
            {(errors.id || errors.name) && <div className="-mt-2 space-y-1">{fieldError("id")}{fieldError("name")}</div>}
            <div className="space-y-1.5">
              <Label htmlFor="zone-description">คำอธิบาย</Label>
              <Textarea id="zone-description" rows={2} value={draft.description} placeholder="ด้านหน้าเวที" aria-invalid={Boolean(errors.description)}
                onChange={(event) => updateDraft("description", event.target.value)} />
              {fieldError("description")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zone-seat-price">ราคา/ที่นั่ง (บาท)</Label>
                <Input id="zone-seat-price" type="number" min="0" inputMode="numeric" value={draft.seatPrice} placeholder="500" aria-invalid={Boolean(errors.seatPrice)}
                  onChange={(event) => updateDraft("seatPrice", event.target.value)} />
                {fieldError("seatPrice")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zone-table-price">ราคา/โต๊ะ (บาท)</Label>
                <Input id="zone-table-price" type="number" min="0" inputMode="numeric" value={draft.tablePrice} placeholder="4500" aria-invalid={Boolean(errors.tablePrice)}
                  onChange={(event) => updateDraft("tablePrice", event.target.value)} />
                {fieldError("tablePrice")}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>
                <span className="block font-medium">ขายรายที่นั่ง</span>
                <span className="text-xs text-muted-foreground">ปิดไว้ถ้าโซนนี้ขายเฉพาะทั้งโต๊ะ</span>
              </span>
              <Switch checked={draft.allowIndividualSeatBooking} onCheckedChange={(value) => updateDraft("allowIndividualSeatBooking", value)} />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isCreating}>ยกเลิก</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? "กำลังเพิ่ม..." : "เพิ่มโซน"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
