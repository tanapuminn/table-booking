"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { CheckCircle2, CircleAlert, Landmark, QrCode } from "lucide-react";
import { useBooking } from "@/components/booking-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiBaseUrl as baseURL } from "@/lib/api";
import { type PaymentType, type SiteSettings, normalizeSiteSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

const EDITABLE_FIELDS = [
  "projectTitle", "projectSubtitle", "paymentType", "bankName", "bankAccountName",
  "bankAccountNumber", "promptpayName", "promptpayNumber", "paymentTimeoutMinutes",
] as const;
type FormState = Pick<SiteSettings, typeof EDITABLE_FIELDS[number]>;
type FormErrors = Partial<Record<keyof FormState | "bankAccountImage", string>>;

const pickForm = (settings: SiteSettings): FormState =>
  Object.fromEntries(EDITABLE_FIELDS.map((key) => [key, settings[key]])) as FormState;

const PAYMENT_OPTIONS: { value: PaymentType; label: string; description: string; icon: typeof Landmark }[] = [
  { value: "bank", label: "บัญชีธนาคาร", description: "ลูกค้าโอนตามเลขบัญชี", icon: Landmark },
  { value: "promptpay", label: "PromptPay", description: "สร้าง QR ตามยอดจองอัตโนมัติ", icon: QrCode },
];

export function DashboardSettings({
  settings, isLoading, onSettingsChange,
}: {
  settings: SiteSettings;
  isLoading: boolean;
  onSettingsChange: (settings: SiteSettings) => void;
}) {
  const { toast } = useToast();
  const { zoneConfigs } = useBooking();
  const [form, setForm] = useState<FormState>(() => pickForm(settings));
  const [errors, setErrors] = useState<FormErrors>({});
  const [bankImageFile, setBankImageFile] = useState<File | null>(null);
  const [bankImagePreview, setBankImagePreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingBookingStatus, setIsUpdatingBookingStatus] = useState(false);

  // รีเซ็ตฟอร์มเมื่อโหลดหรือบันทึกค่าจากเซิร์ฟเวอร์แล้ว
  useEffect(() => {
    setForm(pickForm(settings));
  }, [settings]);

  const isDirty = Boolean(bankImageFile) || EDITABLE_FIELDS.some((key) => form[key] !== settings[key]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.projectTitle.trim()) next.projectTitle = "กรอกชื่อระบบ";
    if (!form.projectSubtitle.trim()) next.projectSubtitle = "กรอกชื่อโครงการ";
    if (!Number.isInteger(form.paymentTimeoutMinutes) || form.paymentTimeoutMinutes < 1 || form.paymentTimeoutMinutes > 180) {
      next.paymentTimeoutMinutes = "กรอกจำนวนเต็ม 1–180 นาที";
    }
    if (form.paymentType === "bank") {
      if (!form.bankName.trim()) next.bankName = "กรอกชื่อธนาคาร";
      if (!form.bankAccountName.trim()) next.bankAccountName = "กรอกชื่อบัญชี";
      if (!form.bankAccountNumber.trim()) next.bankAccountNumber = "กรอกเลขบัญชี";
    } else {
      if (!form.promptpayName.trim()) next.promptpayName = "กรอกชื่อบัญชี PromptPay";
      if (![10, 13].includes(form.promptpayNumber.length)) next.promptpayNumber = "ใช้เบอร์มือถือ 10 หลัก หรือเลขบัตร/ผู้เสียภาษี 13 หลัก";
    }
    return next;
  };

  const handleBankImageChange = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setErrors((previous) => ({ ...previous, bankAccountImage: "รองรับ JPG, PNG หรือ WEBP ขนาดไม่เกิน 2 MB" }));
      return;
    }
    setErrors((previous) => ({ ...previous, bankAccountImage: undefined }));
    setBankImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setBankImagePreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const discardChanges = () => {
    setForm(pickForm(settings));
    setErrors({});
    setBankImageFile(null);
    setBankImagePreview("");
  };

  const handleSave = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      toast({ title: "ยังบันทึกไม่ได้", description: "ตรวจสอบช่องที่มีข้อความสีแดง", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let nextSettings = settings;
      const siteFieldsChanged = Boolean(bankImageFile) || EDITABLE_FIELDS.some((key) => key !== "paymentTimeoutMinutes" && form[key] !== settings[key]);
      if (siteFieldsChanged) {
        const formData = new FormData();
        formData.append("projectTitle", form.projectTitle.trim());
        formData.append("projectSubtitle", form.projectSubtitle.trim());
        formData.append("bankName", form.bankName.trim());
        formData.append("bankAccountName", form.bankAccountName.trim());
        formData.append("bankAccountNumber", form.bankAccountNumber.trim());
        formData.append("paymentType", form.paymentType);
        formData.append("promptpayName", form.promptpayName.trim());
        formData.append("promptpayNumber", form.promptpayNumber.replace(/\D/g, ""));
        if (form.paymentType === "bank" && bankImageFile) formData.append("bankAccountImage", bankImageFile);
        const { data } = await axios.put(`${baseURL}/api/settings`, formData);
        nextSettings = normalizeSiteSettings(data);
      }
      if (form.paymentTimeoutMinutes !== settings.paymentTimeoutMinutes) {
        const { data } = await axios.patch(`${baseURL}/api/settings/payment-timeout`, { paymentTimeoutMinutes: form.paymentTimeoutMinutes });
        nextSettings = { ...nextSettings, paymentTimeoutMinutes: data.paymentTimeoutMinutes };
      }
      setBankImageFile(null);
      setBankImagePreview("");
      onSettingsChange(nextSettings);
      window.dispatchEvent(new Event("site-settings-updated"));
      toast({ title: "บันทึกการตั้งค่าแล้ว" });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error?.message || "กรุณาลองใหม่อีกครั้ง";
      toast({ title: "บันทึกไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBookingStatusChange = async (bookingEnabled: boolean) => {
    if (bookingEnabled && !settings.paymentConfigured) {
      toast({ title: "ยังเปิดรับจองไม่ได้", description: "ตั้งค่าช่องทางรับชำระเงินแล้วบันทึกก่อน", variant: "destructive" });
      return;
    }
    setIsUpdatingBookingStatus(true);
    try {
      const { data } = await axios.patch(`${baseURL}/api/settings/booking-status`, { bookingEnabled });
      onSettingsChange({ ...settings, bookingEnabled: data?.bookingEnabled === true });
      window.dispatchEvent(new Event("site-settings-updated"));
      toast({ title: bookingEnabled ? "เปิดรับจองแล้ว" : "ปิดรับจองแล้ว" });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error?.message || "เปลี่ยนสถานะการจองไม่สำเร็จ";
      toast({ title: "เปลี่ยนสถานะไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setIsUpdatingBookingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-xl border bg-card" />)}
      </div>
    );
  }

  const activeZoneCount = zoneConfigs.filter((zone) => zone.isActive).length;
  const checklist = [
    { done: settings.paymentConfigured, label: "ตั้งค่าช่องทางรับชำระเงินแล้ว", hint: "กรอกในการ์ดการชำระเงินด้านล่างแล้วกดบันทึก" },
    { done: activeZoneCount > 0, label: `มีโซนที่เปิดขาย (${activeZoneCount} โซน)`, hint: "เปิดอย่างน้อยหนึ่งโซนในหน้าโซนและราคา" },
  ];
  const fieldError = (key: keyof FormErrors) => errors[key] && <p className="text-xs text-destructive" role="alert">{errors[key]}</p>;
  const shownBankImage = bankImagePreview || settings.bankAccountImage;

  return (
    <div className={cn("space-y-4", isDirty && "pb-20")}>
      {/* สถานะการรับจอง */}
      <Card className={cn("rounded-xl", settings.bookingEnabled ? "border-success/30" : "border-warning/30")}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="booking-enabled" className="text-base font-semibold">เปิดรับจอง</Label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {settings.bookingEnabled ? "ลูกค้าจองที่นั่งได้ตอนนี้" : "ปิดรับจองชั่วคราว ลูกค้ายังสมัครสมาชิกและเข้าสู่ระบบได้"}
              </p>
            </div>
            <Switch
              id="booking-enabled"
              checked={settings.bookingEnabled}
              onCheckedChange={(value) => void handleBookingStatusChange(value)}
              disabled={isUpdatingBookingStatus || (!settings.paymentConfigured && !settings.bookingEnabled)}
            />
          </div>
          <ul className="space-y-2 border-t pt-3 text-sm">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-start gap-2">
                {item.done
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />}
                <span>
                  {item.label}
                  {!item.done && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ข้อมูลโครงการ */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ข้อมูลโครงการ</CardTitle>
          <CardDescription>แสดงที่หัวเว็บทุกหน้า</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-title">ชื่อระบบ (บรรทัดแรก)</Label>
              <Input id="project-title" value={form.projectTitle} aria-invalid={Boolean(errors.projectTitle)} onChange={(event) => updateField("projectTitle", event.target.value)} />
              {fieldError("projectTitle")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-subtitle">ชื่อโครงการ (บรรทัดที่สอง)</Label>
              <Input id="project-subtitle" value={form.projectSubtitle} aria-invalid={Boolean(errors.projectSubtitle)} onChange={(event) => updateField("projectSubtitle", event.target.value)} />
              {fieldError("projectSubtitle")}
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-xs text-muted-foreground">ตัวอย่างที่หัวเว็บ</p>
            <div className="flex items-center gap-3">
              <Image src="/images/psm.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-primary">โรงเรียนประสานมิตร</p>
                <p className="truncate text-lg font-bold">{form.projectSubtitle || form.projectTitle || "ชื่อโครงการ"}</p>
                {form.projectSubtitle && form.projectTitle && <p className="truncate text-xs text-muted-foreground">{form.projectTitle}</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* การชำระเงิน */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">การชำระเงิน</CardTitle>
          <CardDescription>ช่องทางที่ลูกค้าใช้โอนเงินหลังจอง</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="ช่องทางรับชำระเงิน">
            {PAYMENT_OPTIONS.map((option) => {
              const isSelected = form.paymentType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => updateField("paymentType", option.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <option.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {form.paymentType === "bank" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bank-name">ธนาคาร</Label>
                <Input id="bank-name" value={form.bankName} placeholder="ธนาคารไทยพาณิชย์" aria-invalid={Boolean(errors.bankName)} onChange={(event) => updateField("bankName", event.target.value)} />
                {fieldError("bankName")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-account-name">ชื่อบัญชี</Label>
                <Input id="bank-account-name" value={form.bankAccountName} aria-invalid={Boolean(errors.bankAccountName)} onChange={(event) => updateField("bankAccountName", event.target.value)} />
                {fieldError("bankAccountName")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-account-number">เลขบัญชี</Label>
                <Input id="bank-account-number" value={form.bankAccountNumber} inputMode="numeric" aria-invalid={Boolean(errors.bankAccountNumber)} onChange={(event) => updateField("bankAccountNumber", event.target.value)} />
                {fieldError("bankAccountNumber")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-account-image">รูปบัญชี (ไม่บังคับ)</Label>
                <Input id="bank-account-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleBankImageChange(event.target.files?.[0])} />
                {errors.bankAccountImage ? fieldError("bankAccountImage") : <p className="text-xs text-muted-foreground">JPG, PNG หรือ WEBP ไม่เกิน 2 MB</p>}
              </div>
              {shownBankImage && (
                <div className="rounded-lg border bg-muted/30 p-4 md:col-span-2">
                  <p className="mb-2 text-xs text-muted-foreground">{bankImagePreview ? "รูปใหม่ (ยังไม่ได้บันทึก)" : "รูปที่แสดงหน้าชำระเงิน"}</p>
                  <Image src={shownBankImage} alt="ตัวอย่างรูปบัญชีธนาคาร" width={220} height={220} unoptimized className="mx-auto max-h-56 w-auto object-contain" />
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promptpay-name">ชื่อบัญชี PromptPay</Label>
                <Input id="promptpay-name" value={form.promptpayName} aria-invalid={Boolean(errors.promptpayName)} onChange={(event) => updateField("promptpayName", event.target.value)} />
                {fieldError("promptpayName")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promptpay-number">เลขพร้อมเพย์</Label>
                <Input id="promptpay-number" value={form.promptpayNumber} inputMode="numeric" maxLength={13} placeholder="0812345678" aria-invalid={Boolean(errors.promptpayNumber)}
                  onChange={(event) => updateField("promptpayNumber", event.target.value.replace(/\D/g, ""))} />
                {errors.promptpayNumber ? fieldError("promptpayNumber") : <p className="text-xs text-muted-foreground">เบอร์มือถือ 10 หลัก หรือเลขบัตร/ผู้เสียภาษี 13 หลัก</p>}
              </div>
            </div>
          )}

          <div className="space-y-1.5 border-t pt-4">
            <Label htmlFor="payment-timeout-minutes">เวลาชำระเงินหลังจอง</Label>
            <div className="flex items-center gap-2">
              <Input id="payment-timeout-minutes" type="number" min={1} max={180} step={1} inputMode="numeric" className="w-28" aria-invalid={Boolean(errors.paymentTimeoutMinutes)}
                value={form.paymentTimeoutMinutes || ""}
                onChange={(event) => updateField("paymentTimeoutMinutes", event.target.value === "" ? 0 : Number(event.target.value))} />
              <span className="text-sm text-muted-foreground">นาที</span>
            </div>
            {errors.paymentTimeoutMinutes ? fieldError("paymentTimeoutMinutes") : <p className="text-xs text-muted-foreground">1–180 นาที มีผลกับการจองใหม่เท่านั้น</p>}
          </div>
        </CardContent>
      </Card>

      {/* แถบบันทึก แสดงเมื่อมีการแก้ไข */}
      {isDirty && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
          <p className="text-sm font-medium">มีการแก้ไขที่ยังไม่ได้บันทึก</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={discardChanges} disabled={isSaving}>ยกเลิกการแก้ไข</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
