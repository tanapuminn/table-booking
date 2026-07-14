"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import axios from "axios"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, LogOut, User } from "lucide-react"

const AUTH_PATHS = ["/login", "/register"]
const baseURL = process.env.NEXT_PUBLIC_BASE_URL

type SiteSettings = {
  projectTitle: string
  projectSubtitle: string
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
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
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1" />
          <div className="min-w-0 flex-1 text-center">
            {settings ? (
              <>
                {settings.projectTitle && <h1 className="text-2xl font-bold leading-tight">{settings.projectTitle}</h1>}
                {settings.projectSubtitle && <h2 className="text-2xl font-bold leading-tight">{settings.projectSubtitle}</h2>}
              </>
            ) : (
              <div className="space-y-2 py-1">
                <div className="mx-auto h-6 w-48 animate-pulse rounded bg-muted" />
                <div className="mx-auto h-6 w-72 animate-pulse rounded bg-muted" />
              </div>
            )}
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            {user && (
              <>
                <button
                  onClick={() => router.push("/profile")}
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-32 truncate">{user.fullname}</span>
                  {user.role === "admin" && (
                    <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                      Admin
                    </span>
                  )}
                </button>
                {user.role === "admin" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/psmnlp-dashboard")}
                    className="gap-1"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
                  <LogOut className="h-4 w-4" />
                  {"\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}