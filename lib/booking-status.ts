export type BookingStatus = "pending" | "pending_payment" | "confirmed" | "cancelled" | "payment_timeout"

// ชื่อสถานะและสีของ badge ใช้ร่วมกันทุกหน้าในแดชบอร์ด
export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; badgeClass: string }> = {
  confirmed: { label: "ยืนยันแล้ว", badgeClass: "border-success/20 bg-success/10 text-success" },
  pending_payment: { label: "รอชำระเงิน", badgeClass: "border-warning/20 bg-warning/10 text-warning" },
  pending: { label: "รอดำเนินการ", badgeClass: "border-info/20 bg-info/10 text-info" },
  payment_timeout: { label: "หมดเวลาชำระ", badgeClass: "border-border bg-muted text-muted-foreground" },
  cancelled: { label: "ยกเลิกแล้ว", badgeClass: "border-destructive/20 bg-destructive/10 text-destructive" },
}

export function getBookingStatusMeta(status: string) {
  return BOOKING_STATUS_META[status as BookingStatus] ?? { label: status, badgeClass: "border-border bg-muted text-muted-foreground" }
}

export function formatBaht(amount: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(amount)
}
