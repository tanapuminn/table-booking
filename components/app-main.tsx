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

  return <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
}
