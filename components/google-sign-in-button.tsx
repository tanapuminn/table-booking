"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type GoogleCredentialResponse = {
  credential?: string
  select_by?: string
}

type GoogleSignInButtonProps = {
  onCredential: (credential: string) => Promise<void> | void
  disabled?: boolean
  text?: string
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black"
              size?: "large" | "medium" | "small"
              width?: number
              text?: "signin_with" | "signup_with" | "continue_with" | "signin"
            }
          ) => void
        }
      }
    }
  }
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export function GoogleSignInButton({ onCredential, disabled, text = "continue_with" }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!googleClientId || disabled) return

    const loadGoogleScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve()
          return
        }

        const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-identity]")
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), { once: true })
          existingScript.addEventListener("error", () => reject(new Error("Google script failed to load")), { once: true })
          return
        }

        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        script.dataset.googleIdentity = "true"
        script.onload = () => resolve()
        script.onerror = () => reject(new Error("Google script failed to load"))
        document.head.appendChild(script)
      })

    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) return
            setIsLoading(true)
            try {
              await onCredential(response.credential)
            } finally {
              setIsLoading(false)
            }
          },
        })

        buttonRef.current.innerHTML = ""
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: buttonRef.current.clientWidth || 360,
          text: text as "signin_with" | "signup_with" | "continue_with" | "signin",
        })
        setIsReady(true)
      })
      .catch(() => setIsReady(false))

    return () => {
      cancelled = true
    }
  }, [disabled, onCredential, text])

  if (!googleClientId) {
    return (
      <Button type="button" variant="outline" className="w-full" disabled>
        Google sign-in is not configured
      </Button>
    )
  }

  return (
    <div className="relative min-h-10 w-full">
      <div ref={buttonRef} className={`min-h-10 w-full ${disabled ? "pointer-events-none opacity-50" : ""}`} />
      {(!isReady || isLoading) && (
        <Button type="button" variant="outline" className="absolute inset-0 w-full" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading Google...
        </Button>
      )}
    </div>
  )
}
