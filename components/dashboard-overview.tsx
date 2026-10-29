"use client"

import dayjs from "dayjs"
import { Armchair, ArrowRight, Clock3, ScanLine, Wallet } from "lucide-react"
import { useBooking } from "@/components/booking-provider"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BOOKING_STATUS_META, type BookingStatus, formatBaht, getBookingStatusMeta } from "@/lib/booking-status"
import { getBookingSummary, getZoneOccupancy } from "@/lib/dashboard-metrics"
import { cn } from "@/lib/utils"

const RECENT_LIMIT = 6
const STATUS_ORDER: BookingStatus[] = ["confirmed", "pending_payment", "payment_timeout", "cancelled"]

export function DashboardOverview({
  onOpenBookings, onOpenSection,
}: {
  onOpenBookings: (status?: BookingStatus) => void
  onOpenSection: (section: "checkin" | "zones") => void
}) {
  const { bookingHistory, zoneConfigs, tablePositions, isLoading } = useBooking()

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border bg-card" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl border bg-card" />
          <div className="h-72 animate-pulse rounded-xl border bg-card" />
        </div>
      </div>
    )
  }

  const summary = getBookingSummary(bookingHistory)
  const occupancy = getZoneOccupancy(zoneConfigs, tablePositions, bookingHistory)
  const activeOccupancy = occupancy.filter((item) => item.zone.isActive)
  const inactiveZoneCount = occupancy.length - activeOccupancy.length
  const capacity = activeOccupancy.reduce((sum, item) => sum + item.capacity, 0)
  const availableSeats = Math.max(0, capacity - summary.confirmedSeats - summary.pendingPaymentSeats)
  const recentBookings = [...bookingHistory]
    .sort((a, b) => dayjs(b.bookingDate).valueOf() - dayjs(a.bookingDate).valueOf())
    .slice(0, RECENT_LIMIT)
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: bookingHistory.filter((booking) => booking.status === status).length,
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="รายได้ที่ยืนยันแล้ว"
          value={formatBaht(summary.confirmedRevenue)}
          icon={Wallet}
          tone="primary"
          hint={`จาก ${summary.confirmedBookings.toLocaleString("th-TH")} การจอง`}
        />
        <StatCard
          label="ที่นั่งที่ยืนยันแล้ว"
          value={summary.confirmedSeats.toLocaleString("th-TH")}
          suffix={`/ ${capacity.toLocaleString("th-TH")} ที่นั่ง`}
          icon={Armchair}
          progress={capacity > 0 ? (summary.confirmedSeats / capacity) * 100 : 0}
          hint={`ว่าง ${availableSeats.toLocaleString("th-TH")} ที่นั่ง`}
        />
        <StatCard
          label="รอชำระเงิน"
          value={summary.pendingPaymentBookings.toLocaleString("th-TH")}
          suffix="รายการ"
          icon={Clock3}
          tone={summary.pendingPaymentBookings > 0 ? "warning" : "default"}
          hint={`กันที่นั่งไว้ ${summary.pendingPaymentSeats.toLocaleString("th-TH")} ที่นั่ง · ดูรายการ`}
          onClick={() => onOpenBookings("pending_payment")}
        />
        <StatCard
          label="เช็กอินแล้ว"
          value={summary.checkedInSeats.toLocaleString("th-TH")}
          suffix={`/ ${summary.confirmedSeats.toLocaleString("th-TH")} ที่นั่ง`}
          icon={ScanLine}
          tone="success"
          hint="เปิดผังเช็กอินหน้างาน"
          onClick={() => onOpenSection("checkin")}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="rounded-xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">ความจุแต่ละโซน</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-primary" />ยืนยันแล้ว</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-warning/60" />รอชำระเงิน</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeOccupancy.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                ยังไม่มีโซนที่เปิดให้จอง
                <Button variant="link" className="h-auto p-0 pl-1" onClick={() => onOpenSection("zones")}>ไปที่โซนและราคา</Button>
              </div>
            ) : (
              activeOccupancy.map(({ zone, capacity: zoneCapacity, confirmedSeats, heldSeats }) => {
                const toPercent = (value: number) => (zoneCapacity > 0 ? Math.min(100, (value / zoneCapacity) * 100) : 0)
                const isFull = zoneCapacity > 0 && confirmedSeats >= zoneCapacity
                return (
                  <div key={zone.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{zone.name || `โซน ${zone.id}`}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {isFull ? <span className="font-medium text-success">เต็มแล้ว</span> : `${confirmedSeats + heldSeats}/${zoneCapacity}`}
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${toPercent(confirmedSeats)}%` }} />
                      <div className="h-full bg-warning/60" style={{ width: `${toPercent(heldSeats)}%` }} />
                    </div>
                  </div>
                )
              })
            )}
            {inactiveZoneCount > 0 && (
              <p className="border-t pt-3 text-xs text-muted-foreground">ปิดให้บริการอยู่ {inactiveZoneCount} โซน</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-base">การจองล่าสุด</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => onOpenBookings()}>
              ดูทั้งหมด<ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีการจอง</p>
            ) : (
              <ul className="divide-y">
                {recentBookings.map((booking) => {
                  const status = getBookingStatusMeta(booking.status)
                  const tables = Array.from(new Set(booking.seats.map((seat) => seat.tableName || `${seat.zone}${seat.tableId}`)))
                  return (
                    <li key={booking.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{booking.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tables.join(", ")} · {booking.seats.length} ที่นั่ง · {dayjs(booking.bookingDate).format("DD/MM HH:mm")}
                        </p>
                      </div>
                      <span className="hidden shrink-0 text-sm font-medium tabular-nums sm:inline">{formatBaht(booking.totalPrice)}</span>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", status.badgeClass)}>{status.label}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap gap-2 border-t pt-3">
              {statusCounts.map(({ status, count }) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onOpenBookings(status)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {BOOKING_STATUS_META[status].label}
                  <span className="font-semibold tabular-nums text-foreground">{count}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
