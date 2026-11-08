"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

// หน้าแอดมินมี sidebar และ header ของตัวเอง จึงใช้พื้นที่เต็มจอโดยไม่มี padding ของหน้าเว็บหลัก
export const ADMIN_SHELL_PATH = "/psmnlp-dashboard"

export function AppMain({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith(ADMIN_SHELL_PATH)) {
    return <main>{children}</main>
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="border-t border-border bg-background" role="contentinfo">
        <div className="mx-auto w-full max-w-[1480px] px-4 py-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          © 2025 Focus Works Studio. All rights reserved.
        </div>
      </footer>
    </>
  )
}
