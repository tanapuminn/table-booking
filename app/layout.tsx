import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BookingProvider } from "@/components/booking-provider"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "../components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Prasanmit Chinese Restaurant Booking System",
  description: "ระบบจองโต๊ะและที่นั่งสำหรับร้านอาหารจีน",
  generator: 'v0.dev',
  icons: {
    icon: "/images/psm.png",      // favicon (default)
    apple: "/images/psm.png",     // สำหรับ Apple device
    shortcut: "/images/psm.png",  // shortcut icon
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <ErrorBoundary>
          <BookingProvider>
            <div className="min-h-screen bg-background">
              <header className="border-b">
                <div className="container mx-auto px-4 py-4">
                  <h1 className="text-2xl font-bold text-center">ระบบจองโต๊ะจีน</h1>
                </div>
              </header>
              <main className="container mx-auto px-4 py-8">{children}</main>
            </div>
            <Toaster />
          </BookingProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
