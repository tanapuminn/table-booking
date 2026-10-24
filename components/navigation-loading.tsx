"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, Suspense } from "react"
import type { ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

type NavigationContextValue = {
  start: (destination?: string) => void
  stop: () => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

function RouteChangeListener({ stop }: { stop: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const route = `${pathname}?${searchParams.toString()}`
  const previousRoute = useRef(route)

  useEffect(() => {
    if (previousRoute.current !== route) {
      previousRoute.current = route
      stop()
    }
  }, [route, stop])

  return null
}

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false)

  const stop = useCallback(() => setLoading(false), [])
  const start = useCallback((destination?: string) => {
    if (destination) {
      const target = new URL(destination, window.location.href)
      if (target.origin !== window.location.origin) return
      if (target.pathname === window.location.pathname && target.search === window.location.search) return
    }
    setLoading(true)
  }, [])

  useEffect(() => {
    if (!loading) return
    const timeout = window.setTimeout(stop, 10000)
    return () => window.clearTimeout(timeout)
  }, [loading, stop])

  useEffect(() => {
    const onLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element).closest("a[href]")
      if (!link || link.hasAttribute("download") || link.getAttribute("target") === "_blank") return
      const href = link.getAttribute("href")
      if (href && !href.startsWith("#")) start(href)
    }
    document.addEventListener("click", onLinkClick)
    return () => document.removeEventListener("click", onLinkClick)
  }, [start])

  useEffect(() => {
    const onPopState = () => start()
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [start])

  const value = useMemo(() => ({ start, stop }), [start, stop])

  return (
    <NavigationContext.Provider value={value}>
      <Suspense fallback={null}>
        <RouteChangeListener stop={stop} />
      </Suspense>
      {children}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm" role="status" aria-live="polite" aria-label="กำลังโหลดหน้า">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 text-card-foreground shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <span className="font-medium">กำลังโหลดหน้า...</span>
          </div>
        </div>
      )}
    </NavigationContext.Provider>
  )
}

export function useLoadingRouter() {
  const router = useRouter()
  const navigation = useContext(NavigationContext)

  if (!navigation) throw new Error("useLoadingRouter must be used within NavigationLoadingProvider")

  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => {
      navigation.start(href)
      router.push(href, options)
    },
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
      navigation.start(href)
      router.replace(href, options)
    },
    back: () => {
      navigation.start()
      router.back()
    },
  }), [router, navigation])
}
