// โต๊ะจีนหนึ่งโต๊ะมี 9 ที่นั่ง ใช้เมื่อข้อมูลโต๊ะไม่มีรายการที่นั่งมาให้
export const SEATS_PER_TABLE = 9

type MetricZone = { id: string; isActive: boolean }
type MetricTable = { zone: string; isActive?: boolean; seats?: unknown[] }
type MetricBooking = {
  status: string
  totalPrice: number
  seats: Array<{ zone: string; checkIn?: { checkedIn: boolean } }>
}

export type ZoneOccupancy<Z extends MetricZone = MetricZone> = {
  zone: Z
  capacity: number
  confirmedSeats: number
  heldSeats: number
}

export function getZoneOccupancy<Z extends MetricZone>(zones: Z[], tables: MetricTable[], bookings: MetricBooking[]): ZoneOccupancy<Z>[] {
  return zones.map((zone) => {
    const capacity = tables
      .filter((table) => table.zone === zone.id && table.isActive !== false)
      .reduce((sum, table) => sum + (table.seats?.length || SEATS_PER_TABLE), 0)

    let confirmedSeats = 0
    let heldSeats = 0
    bookings.forEach((booking) => booking.seats.forEach((seat) => {
      if (seat.zone !== zone.id) return
      if (booking.status === "confirmed") confirmedSeats++
      else if (booking.status === "pending_payment") heldSeats++
    }))

    return { zone, capacity, confirmedSeats, heldSeats }
  })
}

export function getBookingSummary(bookings: MetricBooking[]) {
  const confirmed = bookings.filter((booking) => booking.status === "confirmed")
  const pendingPayment = bookings.filter((booking) => booking.status === "pending_payment")
  const confirmedSeats = confirmed.reduce((sum, booking) => sum + booking.seats.length, 0)

  return {
    confirmedRevenue: confirmed.reduce((sum, booking) => sum + booking.totalPrice, 0),
    confirmedBookings: confirmed.length,
    confirmedSeats,
    checkedInSeats: confirmed.reduce((sum, booking) => sum + booking.seats.filter((seat) => seat.checkIn?.checkedIn).length, 0),
    pendingPaymentBookings: pendingPayment.length,
    pendingPaymentSeats: pendingPayment.reduce((sum, booking) => sum + booking.seats.length, 0),
  }
}
