"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useBooking } from "./booking-provider"
import { Calculator, Percent, Receipt } from "lucide-react"

interface PriceSummaryProps {
  selectedSeats: Array<{
    id: string
    tableId: number
    seatNumber: number
    isBooked: boolean
  }>
}

export function PriceSummary({ selectedSeats }: PriceSummaryProps) {
  const { calculateDetailedPrice, zoneConfigs } = useBooking()

  if (selectedSeats.length === 0) {
    return null
  }

  const priceData = calculateDetailedPrice(selectedSeats)

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          สรุปรายการราคา
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* รายละเอียดแต่ละโต๊ะ */}
        <div className="space-y-3">
          {priceData.details.map((detail) => {
            const zoneConfig = zoneConfigs.find((z) => z.id === detail.zone)

            return (
              <div key={detail.tableId} className="bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{detail.tableName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {detail.seatCount} ที่นั่ง • {zoneConfig?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={detail.priceType === "table" ? "default" : "secondary"}>
                      {detail.priceType === "table" ? "ราคาโต๊ะ" : "ราคารายที่นั่ง"}
                    </Badge>
                    {detail.isFullTable && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ทั้งโต๊ะ
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {detail.priceType === "seat" ? (
                    <div className="flex justify-between text-sm">
                      <span>
                        {detail.seatCount} ที่นั่ง × {zoneConfig?.seatPrice} บาท
                      </span>
                      <span className="font-medium">฿{detail.finalPrice}</span>
                    </div>
                  ) : (
                    <>
                      {/* แสดงราคาที่นั่งเฉพาะเมื่อโซนอนุญาตให้จองรายที่นั่ง */}
                      {zoneConfig?.allowIndividualSeatBooking && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>
                            {detail.seatCount} ที่นั่ง × {zoneConfig?.seatPrice} บาท
                          </span>
                          <span className="line-through">฿{detail.originalPrice}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>
                          {zoneConfig?.allowIndividualSeatBooking
                            ? `ราคาโต๊ะ (ส่วนลด ${detail.discount} บาท)`
                            : `ราคาโต๊ะ (${detail.seatCount} ที่นั่ง)`}
                        </span>
                        <span className="font-medium text-green-600">฿{detail.finalPrice}</span>
                      </div>
                      {detail.discount > 0 && zoneConfig?.allowIndividualSeatBooking && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Percent className="h-3 w-3" />
                          <span>ประหยัด {detail.discount} บาท</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        {/* สรุปราคารวม */}
        <div className="space-y-2">
          {priceData.totalDiscount > 0 &&
            priceData.details.some((d) => zoneConfigs.find((z) => z.id === d.zone)?.allowIndividualSeatBooking) && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>ราคาเต็ม</span>
                <span className="line-through">฿{priceData.totalOriginalPrice}</span>
              </div>
            )}

          {priceData.totalDiscount > 0 &&
            priceData.details.some((d) => zoneConfigs.find((z) => z.id === d.zone)?.allowIndividualSeatBooking) && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  ส่วนลดรวม
                </span>
                <span>-฿{priceData.totalDiscount}</span>
              </div>
            )}

          <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
            <span>ราคารวมสุทธิ</span>
            <span className="text-primary">฿{priceData.totalFinalPrice}</span>
          </div>

          {priceData.totalDiscount > 0 &&
            priceData.details.some((d) => zoneConfigs.find((z) => z.id === d.zone)?.allowIndividualSeatBooking) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2 text-green-800">
                  <Calculator className="h-4 w-4" />
                  <span className="text-sm font-medium">คุณประหยัดได้ {priceData.totalDiscount} บาท จากการจองทั้งโต๊ะ!</span>
                </div>
              </div>
            )}
        </div>

        {/* คำอธิบายเพิ่มเติม */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-blue-900 mb-1">หมายเหตุ:</h5>
          <ul className="text-xs text-blue-800 space-y-1">
            {priceData.details.some((d) => zoneConfigs.find((z) => z.id === d.zone)?.allowIndividualSeatBooking) && (
              <li>• การจองทั้งโต๊ะ (9 ที่นั่ง) จะได้ราคาพิเศษ</li>
            )}
            {priceData.details.some((d) => zoneConfigs.find((z) => z.id === d.zone)?.allowIndividualSeatBooking) && (
              <li>• การจองรายที่นั่งจะคิดราคาตามจำนวนที่นั่งที่เลือก</li>
            )}
            <li>• ราคาอาจแตกต่างกันตามโซนที่เลือก</li>
            {priceData.details.some((d) => !zoneConfigs.find((z) => z.id === d.zone)?.allowIndividualSeatBooking) && (
              <li>• บางโซนจองได้เฉพาะทั้งโต๊ะเท่านั้น</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
