"use client"

import axios from "axios"
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

// เพิ่ม axios interceptor เพื่อจัดการ errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    // ถ้าเป็น network error หรือ chunk loading error
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('ChunkLoadError')) {
      console.error('Network or chunk loading error detected');
    }
    return Promise.reject(error);
  }
);

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
  seats: Array<{ tableId: number; seatNumber: number; zone: string; tableName?: string }>
  notes?: string
  totalPrice: number
  status: "pending" | "pending_payment" | "confirmed" | "cancelled" | "payment_timeout"
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
  setBookingHistory: React.Dispatch<React.SetStateAction<BookingRecord[]>>;
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
  isLoading: boolean
  error: string | null
  retryFetchData: () => void
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

// เพิ่มฟังก์ชันคำนวณราคาใน BookingProvider
export function BookingProvider({ children }: { children: ReactNode }) {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingRecord[]>([]);
  const [zoneConfigs, setZoneConfigs] = useState<ZoneConfig[]>([]);
  const [tablePositions, setTablePositions] = useState<TablePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // ฟังก์ชันสำหรับ retry API calls
  const retryApiCall = async (apiCall: () => Promise<any>, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        console.error(`API call failed (attempt ${i + 1}/${maxRetries}):`, error);
        if (i === maxRetries - 1) {
          throw error;
        }
        // รอสักครู่ก่อนลองใหม่
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  // ฟังก์ชันสำหรับ retry fetch data
  const retryFetchData = useCallback(() => {
    setRetryTrigger(prev => prev + 1);
  }, []);

  // ดึงข้อมูลจาก API เมื่อ component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {

        const response = await retryApiCall(() => axios.get(`${baseURL}/api/health-check`));

        const fetchWithRetry = async () => {
          const [bookingsRes, zonesRes, tablesRes] = await Promise.all([
            retryApiCall(() => axios.get(`${baseURL}/api/bookings`)),
            retryApiCall(() => axios.get(`${baseURL}/api/zones`)),
            retryApiCall(() => axios.get(`${baseURL}/api/tables`)),
          ]);

          setBookingHistory(bookingsRes.data);
          setZoneConfigs(zonesRes.data);
          setTablePositions(tablesRes.data);
        };

        if (response.data.status === 'healthy') {
          await fetchWithRetry();
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');

        // ถ้าเป็น chunk loading error ให้ reload หน้า
        if (error instanceof Error &&
          (error.message.includes('ChunkLoadError') ||
            error.message.includes('Loading chunk'))) {
          console.log('Detected chunk loading error, reloading page...');
          window.location.reload();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [retryTrigger]);

  const addBookingRecord = useCallback((record: BookingRecord) => {
    setBookingHistory((prev) => {
      const exists = prev.some((booking) => booking.id === record.id);
      if (exists) return prev;
      return [record, ...prev];
    });
  }, []);

  // ฟังก์ชันช่วยสำหรับตรวจสอบข้อมูลก่อนส่ง
  const validateBookingUpdates = (updates: Partial<BookingRecord>): boolean => {
    // ตรวจสอบข้อมูลที่สำคัญ
    if (updates.customerName !== undefined && (!updates.customerName || updates.customerName.trim() === '')) {
      console.error('Customer name cannot be empty');
      return false;
    }

    if (updates.phone !== undefined && (!updates.phone || updates.phone.trim() === '')) {
      console.error('Phone cannot be empty');
      return false;
    }

    if (updates.seats !== undefined && (!Array.isArray(updates.seats) || updates.seats.length === 0)) {
      console.error('Seats must be a non-empty array');
      return false;
    }

    return true;
  };

  // ฟังก์ชันที่ปรับปรุงแล้วพร้อมการตรวจสอบ
  const updateBookingRecord = useCallback(async (id: string, updates: Partial<BookingRecord>) => {
    try {
      // ตรวจสอบข้อมูลก่อนส่ง
      if (!validateBookingUpdates(updates)) {
        throw new Error('Invalid booking data');
      }

      // ใช้ JSON แทน FormData เพื่อความง่าย
      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      console.log('Sending updates:', cleanUpdates); // debug log

      const response = await axios.put(`${baseURL}/api/bookings/${id}`, cleanUpdates, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setBookingHistory((prev) =>
        prev.map((booking) => (booking.id === id ? response.data : booking))
      );

      return response.data;
    } catch (error) {
      console.error("Error updating booking:", error);
      if (axios.isAxiosError(error)) {
        console.error("Server response:", error.response?.data);
      }
      throw error;
    }
  }, []);

  // const updateBookingRecordOLD = useCallback(async (id: string, updates: Partial<BookingRecord>) => {
  //   try {
  //     const formData = new FormData();
  //     Object.entries(updates).forEach(([key, value]) => {
  //       if (key === "seats") {
  //         formData.append(key, JSON.stringify(value));
  //       } else if (value !== undefined) {
  //         formData.append(key, value!!.toString());
  //       }
  //     });

  //     const response = await axios.put(`${baseURL}/api/bookings/${id}`, formData);
  //     setBookingHistory((prev) =>
  //       prev.map((booking) => (booking.id === id ? response.data : booking))
  //     );
  //   } catch (error) {
  //     console.error("Error updating booking:", error);
  //   }
  // }, []);

  const updateZoneConfig = useCallback(async (zoneId: string, updates: Partial<ZoneConfig>) => {
    try {
      const response = await axios.put(`${baseURL}/api/zones/${zoneId}`, updates);
      setZoneConfigs((prev) =>
        prev.map((zone) => (zone.id === zoneId ? response.data : zone))
      );
    } catch (error) {
      console.error("Error updating zone config:", error);
    }
  }, []);

  const updateTablePosition = useCallback(async (tableId: number, x: number, y: number) => {
    try {
      const response = await axios.put(`${baseURL}/api/tables/${tableId}`, { x, y });
      setTablePositions((prev) =>
        prev.map((table) => (table.id === tableId ? response.data : table))
      );
    } catch (error) {
      console.error("Error updating table position:", error);
    }
  }, []);

  const addTable = useCallback(async (zone: string, x: number, y: number) => {
    try {
      // ดึงโต๊ะทั้งหมดเพื่อหา id สูงสุด
      const response = await axios.get(`${baseURL}/api/tables`);
      const allTables = response.data;
      const maxId = allTables.length > 0 ? Math.max(...allTables.map((table: TablePosition) => table.id)) : 0;
      const newId = maxId + 1;

      // นับจำนวนโต๊ะในโซนนี้เพื่อสร้าง name (เช่น B1, B2)
      const zoneTables = allTables.filter((table: TablePosition) => table.zone === zone);
      const tableCountInZone = zoneTables.length + 1;
      const newName = `${zone}${tableCountInZone}`; // เช่น B1, B2

      // สร้าง payload สำหรับ API
      const newTable = {
        id: newId,
        zone,
        name: newName,
        x,
        y,
      };

      const createResponse = await axios.post(`${baseURL}/api/tables`, newTable);
      setTablePositions((prev) => [...prev, createResponse.data]);

      return createResponse.data; // ส่งคืนโต๊ะที่สร้างใหม่
    } catch (error) {
      console.error("Error adding table:", error);
      throw (error instanceof Error ? error.message : "Failed to add table");
    }
  }, []);

  const removeTable = useCallback(async (tableId: number) => {
    try {
      await axios.delete(`${baseURL}/api/tables/${tableId}`);
      setTablePositions((prev) => prev.filter((table) => table.id !== tableId));
    } catch (error) {
      console.error("Error removing table:", error);
    }
  }, []);

  const toggleTableActive = useCallback(async (tableId: number) => {
    try {
      const response = await axios.put(`${baseURL}/api/tables/${tableId}/toggle-active`);
      setTablePositions((prev) =>
        prev.map((table) => (table.id === tableId ? response.data : table))
      );
    } catch (error) {
      console.error("Error toggling table active status:", error);
    }
  }, []);

  const clearBooking = useCallback(() => {
    setSelectedSeats([]);
    setBookingInfo(null);
    setPaymentProof(null);
  }, []);

  const calculateTotalPrice = useCallback(
    (selectedSeats: Seat[]) => {
      const tableGroups: Record<string, { zone: string; seats: Seat[] }> = {};

      selectedSeats.forEach((seat) => {
        const table = tablePositions.find((t) => t.id === seat.tableId);
        if (!table) return;

        const key = `${table.id}`;
        if (!tableGroups[key]) {
          tableGroups[key] = {
            zone: table.zone,
            seats: [],
          };
        }
        tableGroups[key].seats.push(seat);
      });

      let totalPrice = 0;

      Object.values(tableGroups).forEach((group) => {
        const zoneConfig = zoneConfigs.find((z) => z.id === group.zone);
        if (!zoneConfig) return;

        if (!zoneConfig.allowIndividualSeatBooking || group.seats.length === 9) {
          totalPrice += zoneConfig.tablePrice;
        } else {
          totalPrice += group.seats.length * zoneConfig.seatPrice;
        }
      });

      return totalPrice;
    },
    [tablePositions, zoneConfigs]
  );

  const calculateDetailedPrice = useCallback(
    (selectedSeats: Seat[]) => {
      const tableGroups: Record<string, { zone: string; seats: Seat[]; tableId: number }> = {};

      selectedSeats.forEach((seat) => {
        const table = tablePositions.find((t) => t.id === seat.tableId);
        if (!table) return;

        const key = `${table.id}`;
        if (!tableGroups[key]) {
          tableGroups[key] = {
            zone: table.zone,
            seats: [],
            tableId: table.id,
          };
        }
        tableGroups[key].seats.push(seat);
      });

      const priceDetails: Array<{
        tableId: number;
        tableName: string;
        zone: string;
        seatCount: number;
        isFullTable: boolean;
        originalPrice: number;
        finalPrice: number;
        discount: number;
        priceType: "seat" | "table";
      }> = [];

      let totalOriginalPrice = 0;
      let totalFinalPrice = 0;
      let totalDiscount = 0;

      Object.values(tableGroups).forEach((group) => {
        const zoneConfig = zoneConfigs.find((z) => z.id === group.zone);
        const table = tablePositions.find((t) => t.id === group.tableId);
        if (!zoneConfig || !table) return;

        const isFullTable = group.seats.length === 9;
        const allowIndividualBooking = zoneConfig.allowIndividualSeatBooking;

        let originalPrice = 0;
        let finalPrice = 0;
        let discount = 0;
        let priceType: "seat" | "table" = "seat";

        if (!allowIndividualBooking || isFullTable) {
          originalPrice = group.seats.length * zoneConfig.seatPrice;
          finalPrice = zoneConfig.tablePrice;
          discount = originalPrice - finalPrice;
          priceType = "table";
        } else {
          originalPrice = group.seats.length * zoneConfig.seatPrice;
          finalPrice = originalPrice;
          discount = 0;
          priceType = "seat";
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
        });

        totalOriginalPrice += originalPrice;
        totalFinalPrice += finalPrice;
        totalDiscount += discount;
      });

      return {
        details: priceDetails,
        totalOriginalPrice,
        totalFinalPrice,
        totalDiscount,
      };
    },
    [tablePositions, zoneConfigs]
  );

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
        setBookingHistory,
        zoneConfigs,
        updateZoneConfig,
        tablePositions,
        updateTablePosition,
        addTable,
        removeTable,
        toggleTableActive,
        calculateTotalPrice,
        calculateDetailedPrice,
        isLoading,
        error,
        retryFetchData,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider")
  }
  return context
}
