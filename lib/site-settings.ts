export type PaymentType = "bank" | "promptpay"

export type SiteSettings = {
  paymentConfigured: boolean
  bookingEnabled: boolean
  paymentTimeoutMinutes: number
  projectTitle: string
  projectSubtitle: string
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  bankAccountImage: string
  paymentType: PaymentType
  promptpayName: string
  promptpayNumber: string
}

export const DEFAULT_PAYMENT_TIMEOUT_MINUTES = 20

export const EMPTY_SITE_SETTINGS: SiteSettings = {
  paymentConfigured: false,
  bookingEnabled: false,
  paymentTimeoutMinutes: DEFAULT_PAYMENT_TIMEOUT_MINUTES,
  projectTitle: "",
  projectSubtitle: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankAccountImage: "",
  paymentType: "bank",
  promptpayName: "",
  promptpayNumber: "",
}

// แปลงข้อมูลจาก /api/settings ให้ครบทุกฟิลด์ เพราะ API อาจไม่ส่งฟิลด์ที่ยังไม่เคยตั้งค่า
export function normalizeSiteSettings(data: any): SiteSettings {
  return {
    paymentConfigured: data?.paymentConfigured === true,
    bookingEnabled: data?.bookingEnabled === true,
    paymentTimeoutMinutes: Number.isInteger(data?.paymentTimeoutMinutes) ? data.paymentTimeoutMinutes : DEFAULT_PAYMENT_TIMEOUT_MINUTES,
    projectTitle: data?.projectTitle || "",
    projectSubtitle: data?.projectSubtitle || "",
    bankName: data?.bankName || "",
    bankAccountName: data?.bankAccountName || "",
    bankAccountNumber: data?.bankAccountNumber || "",
    bankAccountImage: data?.bankAccountImage || "",
    paymentType: data?.paymentType === "promptpay" ? "promptpay" : "bank",
    promptpayName: data?.promptpayName || "",
    promptpayNumber: data?.promptpayNumber || "",
  }
}
