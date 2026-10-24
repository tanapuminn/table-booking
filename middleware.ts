import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/register"]

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value
  const { pathname } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p)

  // On login/register: redirect to home if already logged in
  if (isPublicPath) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Protected pages: redirect to login if not logged in
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
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
  ],
}
