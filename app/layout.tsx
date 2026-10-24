import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { BookingProvider } from "@/components/booking-provider"
import { Header } from "@/components/header"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "../components/error-boundary"
import { NavigationLoadingProvider } from "@/components/navigation-loading"

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
      <body>
        <NavigationLoadingProvider>
          <ErrorBoundary>
            <AuthProvider>
              <BookingProvider>
                <div className="min-h-screen bg-background">
                  <Header />
                  <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
                </div>
                <Toaster />
              </BookingProvider>
            </AuthProvider>
          </ErrorBoundary>
        </NavigationLoadingProvider>
      </body>
    </html>
  )
}
