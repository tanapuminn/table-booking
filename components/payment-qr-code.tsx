"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { QrCode, Download, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import { apiBaseUrl } from "@/lib/api"

interface PaymentQRCodeProps {
  amount: number
  recipientName?: string
  bankName?: string
}

type PaymentSettings = {
  paymentType: "bank" | "promptpay"
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  bankAccountImage: string
  promptpayName: string
  promptpayNumber: string
}

export function PaymentQRCode({ amount, recipientName = "พัชรี เวชยันต์วิวัฒน์", bankName = "ธนาคารไทยพาณิชย์" }: PaymentQRCodeProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [qrSize, setQrSize] = useState(220)
  const [bankSettings, setBankSettings] = useState<PaymentSettings>({
    paymentType: "bank",
    bankName,
    bankAccountName: recipientName,
    bankAccountNumber: "",
    bankAccountImage: "",
    promptpayName: "",
    promptpayNumber: "",
  })
  const [promptpayQr, setPromptpayQr] = useState("")
  const [promptpayQrError, setPromptpayQrError] = useState(false)

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/settings?includeBankImage=true`)
      .then((res) => setBankSettings({
        paymentType: res.data?.paymentType === "promptpay" ? "promptpay" : "bank",
        bankName: res.data?.bankName || bankName,
        bankAccountName: res.data?.bankAccountName || recipientName,
        bankAccountNumber: res.data?.bankAccountNumber || "",
        bankAccountImage: res.data?.bankAccountImage || "",
        promptpayName: res.data?.promptpayName || "",
        promptpayNumber: res.data?.promptpayNumber || "",
      }))
      .catch((error) => console.error("Error loading bank account settings:", error))
  }, [bankName, recipientName])

  useEffect(() => {
    if (bankSettings.paymentType !== "promptpay" || !bankSettings.promptpayNumber || amount <= 0) {
      setPromptpayQr("")
      setPromptpayQrError(false)
      return
    }

    let cancelled = false
    setPromptpayQr("")
    setPromptpayQrError(false)
    axios.get(`${apiBaseUrl}/api/settings/promptpay-qr`, { params: { amount } })
      .then((res) => { if (!cancelled) setPromptpayQr(res.data?.qrCode || "") })
      .catch(() => { if (!cancelled) setPromptpayQrError(true) })
    return () => { cancelled = true }
  }, [bankSettings.paymentType, bankSettings.promptpayNumber, amount])

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
    if (!bankSettings.bankAccountNumber) return
    navigator.clipboard.writeText(bankSettings.bankAccountNumber).then(() => {
      setCopied(true)
      toast({
        title: bankSettings.paymentType === "promptpay" ? "คัดลอกเลขพร้อมเพย์แล้ว" : "คัดลอกเลขบัญชีแล้ว",
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
          ช่องทางชำระเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-6 space-y-4">
        <div className="text-center mb-2">
          {/* <p className="text-sm text-muted-foreground">PromptPay / พร้อมเพย์</p> */}
          <p className="text-xl text-muted-foreground">
            {bankSettings.paymentType === "promptpay" ? "PromptPay" : bankSettings.bankName}
          </p>
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
        <div className="flex min-h-40 items-center justify-center rounded-lg border bg-white p-3 shadow-sm">
          {bankSettings.paymentType === "promptpay" ? promptpayQr ? (
            <Image src={promptpayQr} alt={`PromptPay QR สำหรับยอด ${amount.toLocaleString("th-TH")} บาท`} className="mx-auto object-contain" width={qrSize} height={qrSize} unoptimized />
          ) : promptpayQrError ? (
            <p className="text-sm text-destructive">สร้าง QR ไม่สำเร็จ กรุณาตรวจเลขพร้อมเพย์ในตั้งค่าเว็บ</p>
          ) : (
            <p className="text-sm text-muted-foreground">กำลังสร้าง QR พร้อมเพย์...</p>
          ) : bankSettings.bankAccountImage ? (
            <Image src={bankSettings.bankAccountImage} alt="รูปบัญชีธนาคาร" className="mx-auto object-contain" width={qrSize} height={qrSize} unoptimized />
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่ได้ตั้งค่ารูปบัญชีธนาคาร</p>
          )}
        </div>


        <div className="text-center space-y-1">
          <p className="font-medium">
            {bankSettings.paymentType === "promptpay" ? bankSettings.promptpayName : bankSettings.bankAccountName}
          </p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-muted-foreground">
              {bankSettings.paymentType === "promptpay"
                ? bankSettings.promptpayNumber || "ยังไม่ได้ตั้งค่าเลขพร้อมเพย์"
                : bankSettings.bankAccountNumber || "ยังไม่ได้ตั้งค่าเลขบัญชี"}
            </p>
            {(bankSettings.paymentType === "promptpay" ? bankSettings.promptpayNumber : bankSettings.bankAccountNumber) && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAccountNumber} aria-label="คัดลอกเลขบัญชี">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>

        <Separator />
        
      </CardContent>
    </Card>
  )
}
