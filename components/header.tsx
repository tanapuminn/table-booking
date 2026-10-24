"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useLoadingRouter } from "@/components/navigation-loading"
import axios from "axios"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, LogOut, User } from "lucide-react"
import Image from "next/image"

const AUTH_PATHS = ["/login", "/register"]
const baseURL = process.env.NEXT_PUBLIC_BASE_URL

type SiteSettings = {
  projectTitle: string
  projectSubtitle: string
}

export function Header() {
  const pathname = usePathname()
  const router = useLoadingRouter()
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    const loadSettings = () => {
      axios
        .get(`${baseURL}/api/settings?t=${Date.now()}`)
        .then((res) => {
          setSettings({
            projectTitle: res.data?.projectTitle || "",
            projectSubtitle: res.data?.projectSubtitle || "",
          })
        })
        .catch(() => setSettings({ projectTitle: "", projectSubtitle: "" }))
    }

    loadSettings()
    window.addEventListener("site-settings-updated", loadSettings)
    return () => window.removeEventListener("site-settings-updated", loadSettings)
  }, [])

  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <header className="border-b border-pink-100 bg-white">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/images/psm.png" alt="ตราโรงเรียนประสานมิตร" width={52} height={52} className="h-11 w-11 object-contain sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-primary sm:text-sm">โรงเรียนประสานมิตร</p>
              <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">{settings?.projectSubtitle || settings?.projectTitle || "ระบบจองโต๊ะ"}</p>
              {settings?.projectSubtitle && settings?.projectTitle && (
                <p className="truncate text-xs text-slate-500">{settings.projectTitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            {user && (
              <>
                <button
                  onClick={() => router.push("/profile")}
                  aria-label="โปรไฟล์ของฉัน"
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden max-w-32 truncate sm:inline">{user.fullname}</span>
                  {user.role === "admin" && (
                    <span className="ml-1 hidden rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 md:inline">
                      Admin
                    </span>
                  )}
                </button>
                {user.role === "admin" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/psmnlp-dashboard")}
                    aria-label="แดชบอร์ดผู้ดูแล"
                    className="gap-1"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden md:inline">Dashboard</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="ออกจากระบบ" className="gap-1">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">ออกจากระบบ</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
