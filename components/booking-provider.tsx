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

// เพิ่มฟิลด์ราคาใน ZoneConfig interface
export interface ZoneConfig {
  id: string
  name: string
  isActive: boolean
  description: string
  allowIndividualSeatBooking: boolean
  seatPrice: number // ราคาต่อที่นั่งเมื่อจองรายที่นั่ง
  tablePrice: number // ราคาต่อโต๊ะเมื่อจองทั้งโต๊ะ (9 ที่นั่ง)
}

// เพิ่ม interface สำหรับตำแหน่งโต๊ะ
export interface TablePosition {
  id: number
  name: string
  zone: string
  x: number // ตำแหน่ง x ใน grid (0-9)
  y: number // ตำแหน่ง y ใน grid (0-9)
  isActive: boolean
  seats: Array<{ seatNumber: number; isBooked: boolean }>
}

// เพิ่มใน BookingContextType
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
  updateZoneConfig: (zoneId: string, updates: Partial<ZoneConfig>) => void
  tablePositions: TablePosition[]
  updateTablePosition: (tableId: number, x: number, y: number) => void
  addTable: (zone: string, x: number, y: number) => void
  removeTable: (tableId: number) => void
  toggleTableActive: (tableId: number) => void
  calculateTotalPrice: (selectedSeats: Seat[]) => number
  calculateDetailedPrice: (selectedSeats: Seat[]) => {
    details: Array<{
      tableId: number
      tableName: string
      zone: string
      seatCount: number
      isFullTable: boolean
      originalPrice: number
      finalPrice: number
      discount: number
      priceType: "seat" | "table"
    }>
    totalOriginalPrice: number
    totalFinalPrice: number
    totalDiscount: number
  }
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

// ปรับปรุง initialZoneConfigs เพื่อเพิ่มราคา
const initialZoneConfigs: ZoneConfig[] = [
  {
    id: "A",
    name: "โซน VIP",
    isActive: true,
    description: "โซนหน้าเวที",
    allowIndividualSeatBooking: true,
    seatPrice: 150,
    tablePrice: 1200,
  },
  {
    id: "B",
    name: "โซน B",
    isActive: true,
    description: "โซนกลางร้าน",
    allowIndividualSeatBooking: true,
    seatPrice: 180,
    tablePrice: 1500,
  },
  {
    id: "C",
    name: "โซน C",
    isActive: false,
    description: "โซนหลังร้าน",
    allowIndividualSeatBooking: false,
    seatPrice: 200,
    tablePrice: 1800,
  },
]

// Mock data สำหรับประวัติการจอง (ปรับให้เป็น 9 ที่นั่งต่อโต๊ะ)
const initialBookingHistory: BookingRecord[] = [
  {
    id: "BK001234",
    customerName: "สมชาย ใจดี",
    phone: "081-234-5678",
    seats: [
      { tableId: 1, seatNumber: 1, zone: "A" },
      { tableId: 1, seatNumber: 2, zone: "A" },
      { tableId: 1, seatNumber: 3, zone: "A" },
    ],
    notes: "ขอโต๊ะใกล้หน้าต่าง",
    totalPrice: 450,
    status: "confirmed",
    bookingDate: "2024-01-15 14:30",
    paymentProof: "/placeholder.svg?height=200&width=300",
  },
  {
    id: "BK001235",
    customerName: "สมหญิง รักดี",
    phone: "082-345-6789",
    seats: [
      { tableId: 25, seatNumber: 1, zone: "B" },
      { tableId: 25, seatNumber: 2, zone: "B" },
    ],
    totalPrice: 300,
    status: "pending",
    bookingDate: "2024-01-15 15:45",
    paymentProof: "/placeholder.svg?height=200&width=300",
  },
]

// เพิ่มข้อมูลโต๊ะเริ่มต้นแบบ 10x10 grid
const initialTablePositions: TablePosition[] = [
  // โซน A - 20 โต๊ะ
  ...Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `A${i + 1}`,
    zone: "A",
    x: (i % 5) * 2, // เรียงเป็น 5 คอลัมน์
    y: Math.floor(i / 5) * 2, // เรียงเป็น 4 แถว
    isActive: true,
    seats: Array.from({ length: 9 }, (_, seatIndex) => ({
      seatNumber: seatIndex + 1,
      isBooked: Math.random() > 0.8,
    })),
  })),
  // โซน B - 20 โต๊ะ
  ...Array.from({ length: 20 }, (_, i) => ({
    id: i + 21,
    name: `B${i + 1}`,
    zone: "B",
    x: (i % 5) * 2,
    y: Math.floor(i / 5) * 2,
    isActive: true,
    seats: Array.from({ length: 9 }, (_, seatIndex) => ({
      seatNumber: seatIndex + 1,
      isBooked: Math.random() > 0.8,
    })),
  })),
  // โซน C - 20 โต๊ะ
  ...Array.from({ length: 20 }, (_, i) => ({
    id: i + 41,
    name: `C${i + 1}`,
    zone: "C",
    x: (i % 5) * 2,
    y: Math.floor(i / 5) * 2,
    isActive: true,
    seats: Array.from({ length: 9 }, (_, seatIndex) => ({
      seatNumber: seatIndex + 1,
      isBooked: Math.random() > 0.8,
    })),
  })),
]

// เพิ่มฟังก์ชันคำนวณราคาใน BookingProvider
export function BookingProvider({ children }: { children: ReactNode }) {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [bookingHistory, setBookingHistory] = useState<BookingRecord[]>(initialBookingHistory)
  const [zoneConfigs, setZoneConfigs] = useState<ZoneConfig[]>(initialZoneConfigs)
  // เพิ่มใน BookingProvider
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(initialTablePositions)

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
      // เพิ่มใน useEffect สำหรับ localStorage
      const savedTablePositions = localStorage.getItem("tablePositions")
      if (savedTablePositions) {
        setTablePositions(JSON.parse(savedTablePositions))
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

  useEffect(() => {
    try {
      localStorage.setItem("tablePositions", JSON.stringify(tablePositions))
    } catch (error) {
      console.error("Error saving table positions to localStorage:", error)
    }
  }, [tablePositions])

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

  // ปรับปรุงฟังก์ชัน updateZoneConfig ให้รับ updates object
  const updateZoneConfig = useCallback((zoneId: string, updates: Partial<ZoneConfig>) => {
    setZoneConfigs((prev) => prev.map((zone) => (zone.id === zoneId ? { ...zone, ...updates } : zone)))
  }, [])

  // เพิ่มฟังก์ชันจัดการโต๊ะ
  const updateTablePosition = useCallback((tableId: number, x: number, y: number) => {
    setTablePositions((prev) => prev.map((table) => (table.id === tableId ? { ...table, x, y } : table)))
  }, [])

  const addTable = useCallback(
    (zone: string, x: number, y: number) => {
      const newId = Math.max(...tablePositions.map((t) => t.id)) + 1
      const tableNumber = tablePositions.filter((t) => t.zone === zone).length + 1

      const newTable: TablePosition = {
        id: newId,
        name: `${zone}${tableNumber}`,
        zone,
        x,
        y,
        isActive: true,
        seats: Array.from({ length: 9 }, (_, seatIndex) => ({
          seatNumber: seatIndex + 1,
          isBooked: false,
        })),
      }

      setTablePositions((prev) => [...prev, newTable])
    },
    [tablePositions],
  )

  const removeTable = useCallback((tableId: number) => {
    setTablePositions((prev) => prev.filter((table) => table.id !== tableId))
  }, [])

  const toggleTableActive = useCallback((tableId: number) => {
    setTablePositions((prev) =>
      prev.map((table) => (table.id === tableId ? { ...table, isActive: !table.isActive } : table)),
    )
  }, [])

  const clearBooking = useCallback(() => {
    setSelectedSeats([])
    setBookingInfo(null)
    setPaymentProof(null)
  }, [])

  // เพิ่มฟังก์ชันคำนวณราคา
  const calculateTotalPrice = useCallback(
    (selectedSeats: Seat[]) => {
      // จัดกลุ่มที่นั่งตามโต๊ะและโซน
      const tableGroups: Record<string, { zone: string; seats: Seat[] }> = {}

      selectedSeats.forEach((seat) => {
        const table = tablePositions.find((t) => t.id === seat.tableId)
        if (!table) return

        const key = `${table.id}`
        if (!tableGroups[key]) {
          tableGroups[key] = {
            zone: table.zone,
            seats: [],
          }
        }
        tableGroups[key].seats.push(seat)
      })

      // คำนวณราคารวม
      let totalPrice = 0

      Object.values(tableGroups).forEach((group) => {
        const zoneConfig = zoneConfigs.find((z) => z.id === group.zone)
        if (!zoneConfig) return

        // ถ้าโซนนี้ไม่อนุญาตให้จองรายที่นั่ง หรือจำนวนที่นั่งที่เลือกครบทั้งโต๊ะ (9 ที่นั่ง)
        if (!zoneConfig.allowIndividualSeatBooking || group.seats.length === 9) {
          totalPrice += zoneConfig.tablePrice
        } else {
          // คิดราคาตามจำนวนที่นั่ง
          totalPrice += group.seats.length * zoneConfig.seatPrice
        }
      })

      return totalPrice
    },
    [tablePositions, zoneConfigs],
  )

  // เพิ่มฟังก์ชันคำนวณราคาแบบละเอียดใน BookingProvider
  const calculateDetailedPrice = useCallback(
    (selectedSeats: Seat[]) => {
      // จัดกลุ่มที่นั่งตามโต๊ะและโซน
      const tableGroups: Record<string, { zone: string; seats: Seat[]; tableId: number }> = {}

      selectedSeats.forEach((seat) => {
        const table = tablePositions.find((t) => t.id === seat.tableId)
        if (!table) return

        const key = `${table.id}`
        if (!tableGroups[key]) {
          tableGroups[key] = {
            zone: table.zone,
            seats: [],
            tableId: table.id,
          }
        }
        tableGroups[key].seats.push(seat)
      })

      // คำนวณราคารายละเอียด
      const priceDetails: Array<{
        tableId: number
        tableName: string
        zone: string
        seatCount: number
        isFullTable: boolean
        originalPrice: number
        finalPrice: number
        discount: number
        priceType: "seat" | "table"
      }> = []

      let totalOriginalPrice = 0
      let totalFinalPrice = 0
      let totalDiscount = 0

      Object.values(tableGroups).forEach((group) => {
        const zoneConfig = zoneConfigs.find((z) => z.id === group.zone)
        const table = tablePositions.find((t) => t.id === group.tableId)
        if (!zoneConfig || !table) return

        const isFullTable = group.seats.length === 9
        const allowIndividualBooking = zoneConfig.allowIndividualSeatBooking

        let originalPrice = 0
        let finalPrice = 0
        let discount = 0
        let priceType: "seat" | "table" = "seat"

        if (!allowIndividualBooking || isFullTable) {
          // จองทั้งโต๊ะ
          originalPrice = group.seats.length * zoneConfig.seatPrice
          finalPrice = zoneConfig.tablePrice
          discount = originalPrice - finalPrice
          priceType = "table"
        } else {
          // จองรายที่นั่ง
          originalPrice = group.seats.length * zoneConfig.seatPrice
          finalPrice = originalPrice
          discount = 0
          priceType = "seat"
        }

        priceDetails.push({
          tableId: group.tableId,
          tableName: table.name,
          zone: group.zone,
          seatCount: group.seats.length,
          isFullTable,
          originalPrice,
          finalPrice,
          discount,
          priceType,
        })

        totalOriginalPrice += originalPrice
        totalFinalPrice += finalPrice
        totalDiscount += discount
      })

      return {
        details: priceDetails,
        totalOriginalPrice,
        totalFinalPrice,
        totalDiscount,
      }
    },
    [tablePositions, zoneConfigs],
  )

  // เพิ่มฟังก์ชันใน return value
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
        tablePositions,
        updateTablePosition,
        addTable,
        removeTable,
        toggleTableActive,
        calculateTotalPrice,
        calculateDetailedPrice, // เพิ่มฟังก์ชันใหม่
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
