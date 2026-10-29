import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"]
const ADMIN_PATH = "/psmnlp-dashboard"

const unavailableResponse = () => new NextResponse(
  "ไม่สามารถตรวจสอบสิทธิ์ได้ชั่วคราว กรุณาลองใหม่อีกครั้ง",
  { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
)

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value
  const { pathname } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p)
  const isAdminPath = pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`)

  if (!token) {
    if (isPublicPath) return NextResponse.next()
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // A present cookie can still contain an expired or revoked session.
  // Validate it before redirecting away from /login or opening protected pages.
  try {
    const authUrl = new URL("/api/auth/me", request.url)
    const authResponse = await fetch(authUrl, {
      headers: { cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    })

    if (authResponse.status === 401 || authResponse.status === 404) {
      const response = isPublicPath
        ? NextResponse.next()
        : NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url))
      response.cookies.delete("auth_token")
      return response
    }

    // ลิงก์ตั้งรหัสผ่านใหม่จากอีเมลต้องเปิดได้แม้เบราว์เซอร์นั้นล็อกอินอยู่
    if (authResponse.ok && isPublicPath && pathname !== "/reset-password") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    if (isAdminPath) {
      if (!authResponse.ok) return unavailableResponse()
      const { user } = await authResponse.json()
      if (user?.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }
  } catch {
    if (isAdminPath) return unavailableResponse()
    // Keep the current page available when the API is temporarily unreachable.
    // The client can show its maintenance state without discarding a valid cookie.
  }

  return NextResponse.next()
}

// Apply only to specific app pages — NOT _next/* or static assets
export const config = {
  matcher: [
    "/",
    "/payment",
    "/ticket",
    "/profile",
    "/profile/complete",
    "/psmnlp-dashboard",
    "/psmnlp-dashboard/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
}
