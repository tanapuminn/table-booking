"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface Seat {
  id: string
  tableId: number
  seatNumber: number
  isBooked: boolean
}

interface BookingInfo {
  name: string
  phone: string
  notes: string
}

export interface BookingRecord {
  id: string
  customerName: string
  phone: string
  seats: Array<{ tableId: number; seatNumber: number; zone: string }>
  notes?: string
  totalPrice: number
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string
  paymentProof?: string | null
}

export interface ZoneConfig {
  id: string
  name: string
  isActive: boolean
  description: string
}

interface BookingContextType {
  selectedSeats: Seat[]
  setSelectedSeats: (seats: Seat[]) => void
  bookingInfo: BookingInfo | null
  setBookingInfo: (info: BookingInfo) => void
  paymentProof: File | null
  setPaymentProof: (file: File) => void
  clearBooking: () => void
  bookingHistory: BookingRecord[]
  addBookingRecord: (record: BookingRecord) => void
  updateBookingRecord: (id: string, updates: Partial<BookingRecord>) => void
  zoneConfigs: ZoneConfig[]
  updateZoneConfig: (zoneId: string, isActive: boolean) => void
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

// ข้อมูลโซนเริ่มต้น
const initialZoneConfigs: ZoneConfig[] = [
  { id: "A", name: "โซน A", isActive: true, description: "โซนหน้าร้าน" },
  { id: "B", name: "โซน B", isActive: true, description: "โซนกลางร้าน" },
  { id: "C", name: "โซน C", isActive: false, description: "โซนหลังร้าน" },
]

// Mock data สำหรับประวัติการจอง
const initialBookingHistory: BookingRecord[] = [
  {
    id: "BK001234",
    customerName: "สมชาย ใจดี",
    phone: "081-234-5678",
    seats: [
      { tableId: 1, seatNumber: 1, zone: "A" },
      { tableId: 1, seatNumber: 2, zone: "A" },
    ],
    notes: "ขอโต๊ะใกล้หน้าต่าง",
    totalPrice: 300,
    status: "confirmed",
    bookingDate: "2024-01-15 14:30",
    paymentProof: "/placeholder.svg?height=200&width=300",
  },
  {
    id: "BK001235",
    customerName: "สมหญิง รักดี",
    phone: "082-345-6789",
    seats: [{ tableId: 25, seatNumber: 1, zone: "B" }],
    totalPrice: 150,
    status: "pending",
    bookingDate: "2024-01-15 15:45",
    paymentProof: "/placeholder.svg?height=200&width=300",
  },
]

export function BookingProvider({ children }: { children: ReactNode }) {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [bookingHistory, setBookingHistory] = useState<BookingRecord[]>(initialBookingHistory)
  const [zoneConfigs, setZoneConfigs] = useState<ZoneConfig[]>(initialZoneConfigs)

  // โหลดข้อมูลจาก localStorage เมื่อ component mount
  useEffect(() => {
    try {
      const savedBookings = localStorage.getItem("bookingHistory")
      if (savedBookings) {
        setBookingHistory(JSON.parse(savedBookings))
      }

      const savedZoneConfigs = localStorage.getItem("zoneConfigs")
      if (savedZoneConfigs) {
        setZoneConfigs(JSON.parse(savedZoneConfigs))
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
    }
  }, [])

  // บันทึกข้อมูลลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    try {
      localStorage.setItem("bookingHistory", JSON.stringify(bookingHistory))
    } catch (error) {
      console.error("Error saving booking history to localStorage:", error)
    }
  }, [bookingHistory])

  useEffect(() => {
    try {
      localStorage.setItem("zoneConfigs", JSON.stringify(zoneConfigs))
    } catch (error) {
      console.error("Error saving zone configs to localStorage:", error)
    }
  }, [zoneConfigs])

  const addBookingRecord = useCallback((record: BookingRecord) => {
    setBookingHistory((prev) => {
      const exists = prev.some((booking) => booking.id === record.id)
      if (exists) {
        return prev
      }
      return [record, ...prev]
    })
  }, [])

  const updateBookingRecord = useCallback((id: string, updates: Partial<BookingRecord>) => {
    setBookingHistory((prev) => prev.map((booking) => (booking.id === id ? { ...booking, ...updates } : booking)))
  }, [])

  const updateZoneConfig = useCallback((zoneId: string, isActive: boolean) => {
    setZoneConfigs((prev) => prev.map((zone) => (zone.id === zoneId ? { ...zone, isActive } : zone)))
  }, [])

  const clearBooking = useCallback(() => {
    setSelectedSeats([])
    setBookingInfo(null)
    setPaymentProof(null)
  }, [])

  return (
    <BookingContext.Provider
      value={{
        selectedSeats,
        setSelectedSeats,
        bookingInfo,
        setBookingInfo,
        paymentProof,
        setPaymentProof,
        clearBooking,
        bookingHistory,
        addBookingRecord,
        updateBookingRecord,
        zoneConfigs,
        updateZoneConfig,
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider")
  }
  return context
}
