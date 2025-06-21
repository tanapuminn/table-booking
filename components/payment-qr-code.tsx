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
}

export function PaymentQRCode({ amount, recipientName = "PRASANMIT" }: PaymentQRCodeProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [qrSize, setQrSize] = useState(220)
  const [qrCode, setQrCode] = useState("");
  let promptpay = '0805912700';

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

  // สร้าง URL สำหรับ QR Code ของ promptpay
  // ในระบบจริงควรใช้ API หรือ library ที่เหมาะสม
  const generateQRCodeURL = (amount: number) => {
    // ในตัวอย่างนี้เราจะใช้ placeholder QR code
    // ในระบบจริงควรใช้ API เช่น promptpay-qr หรือ API ของธนาคาร
    const promptpayNumber = "0899999999" // เบอร์ PromptPay ของร้าน

    // สร้าง URL สำหรับ QR Code
    // ในที่นี้เราใช้ placeholder แทน API จริง
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=promptpay:${promptpayNumber}|${amount.toFixed(2)}&format=svg`
  }



  const handleCreateQR = async (amount: number) => {
    const promptpay = '0805912700';
    const response = await axios.get(`https://promptpay.io/${promptpay}/${amount}`);
    // const response = await axios.get(`https://www.pp-qr.com/api/${promptpay}/${amount}`);
    console.log('response', response);

    if (response.status === 200) {
      // return response.data.qrImage;
      setQrCode(response.data.qrImage);
    } else {
      alert(response.data.error);
    }
  }

  // useEffect(() => {
  //   // เรียกใช้ฟังก์ชันสร้าง QR Code เมื่อ component ถูก mount
  //   handleCreateQR(amount);
  // }, [amount]);

  const handleCopyPromptPay = () => {
    navigator.clipboard.writeText("0805912700").then(() => {
      setCopied(true)
      toast({
        title: "คัดลอกเบอร์ PromptPay แล้ว",
        description: "คุณสามารถวางในแอปธนาคารได้ทันที",
      })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadQR = () => {
    const link = document.createElement("a")
    // link.href = qrCode
    // link.href = generateQRCodeURL(amount)
    link.href = `https://promptpay.io/${promptpay}/${amount}`
    link.download = `promptpay-${amount}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "ดาวน์โหลด QR Code สำเร็จ",
      description: "คุณสามารถสแกน QR Code นี้เพื่อชำระเงินได้",
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
          <p className="text-sm text-muted-foreground">PromptPay / พร้อมเพย์</p>
          <p className="text-lg font-bold">฿{amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border">
          {/* <img 
            src={`https://www.pp-qr.com/api/image/${promptpay}/${amount}`}
            alt={`QR Code สำหรับชำระเงิน ${amount} บาท`}
            className="mx-auto"
            width={qrSize}
            height={qrSize}
          /> */}
          <img
            // src={generateQRCodeURL(amount) || "/placeholder.svg"}
            // src={qrCode || "/placeholder.svg"}
            src={`https://promptpay.io/${promptpay}/${amount}.png`}
            alt={`QR Code สำหรับชำระเงิน ${amount} บาท`}
            className="mx-auto"
            width={qrSize}
            height={qrSize}
          />
        </div>

        <div className="text-center space-y-1">
          <p className="font-medium">{recipientName}</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-muted-foreground">{promptpay}</p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPromptPay}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="text-center space-y-2 w-full">
          <p className="text-sm text-muted-foreground">สแกน QR Code ด้านบนด้วยแอปธนาคารหรือแอปที่รองรับ PromptPay</p>
          {/* <Button variant="outline" size="sm" className="w-full flex items-center gap-2" onClick={handleDownloadQR}>
            <Download className="h-4 w-4" />
            ดาวน์โหลด QR Code
          </Button> */}
        </div>
      </CardContent>
    </Card>
  )
}
