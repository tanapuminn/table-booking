"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { QrCode, Download, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

interface PaymentQRCodeProps {
  amount: number
  recipientName?: string
  bankName?: string
}

export function PaymentQRCode({ amount, recipientName = "PRASANMIT", bankName = "ธนาคารไทยพาณิชย์" }: PaymentQRCodeProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [qrSize, setQrSize] = useState(220)
  const [qrCode, setQrCode] = useState("");
  let promptpay = '0805912700';
  let bankAccountNumber = '080-5-91270-0';

  // ปรับขนาด QR Code ตามขนาดหน้าจอ
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setQrSize(180)
      } else {
        setQrSize(220)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(bankAccountNumber).then(() => {
      setCopied(true)
      toast({
        title: "คัดลอกเลขบัญชีแล้ว",
        description: "คุณสามารถวางในแอปธนาคารได้ทันที",
      })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyPromptPay = () => {
    navigator.clipboard.writeText(promptpay).then(() => {
      setCopied(true)
      toast({
        title: "คัดลอกเบอร์ PromptPay แล้ว",
        description: "คุณสามารถวางในแอปธนาคารได้ทันที",
      })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          สแกนเพื่อชำระเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-6 space-y-4">
        <div className="text-center mb-2">
          {/* <p className="text-sm text-muted-foreground">PromptPay / พร้อมเพย์</p> */}
          <p className="text-xl text-muted-foreground">ธนาคารไทยพาณิชย์</p>
          <p className="text-lg font-bold">฿{amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
        </div>

        {/* <div className="bg-white p-3 rounded-lg shadow-sm border">
          <img
            src={`https://promptpay.io/${promptpay}/${amount}.png`}
            alt={`QR Code สำหรับชำระเงิน ${amount} บาท`}
            className="mx-auto"
            width={qrSize}
            height={qrSize}
          />
        </div> */}
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <img
            src={`https://i.pinimg.com/736x/02/31/87/023187a2f2dc47bbdc809b43c7667b3a.jpg`}
            alt={`เลขที่บัญชีธนาคาร`}
            className="mx-auto"
            width={qrSize}
            height={qrSize}
          />
        </div>


        <div className="text-center space-y-1">
          <p className="font-medium">{recipientName}</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-muted-foreground">{bankAccountNumber}</p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAccountNumber}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <Separator />
        
      </CardContent>
    </Card>
  )
}
