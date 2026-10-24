"use client"

import axios from "axios"
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { apiBaseUrl } from "@/lib/api"

export interface AuthUser {
  id: string
  phone: string
  email: string
  fullname: string
  role: "user" | "admin"
  profileCompleted?: boolean
  authProviders?: {
    password: boolean
    google: boolean
  }
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (phone: string, password: string) => Promise<{ user: AuthUser }>
  googleLogin: (credential: string) => Promise<{ user: AuthUser }>
  updateProfile: (values: { phone?: string; fullname?: string }) => Promise<{ user: AuthUser }>
  logout: () => void
  register: (phone: string, email: string, password: string, fullname: string, googleCredential?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function clearLegacyClientAuth() {
  localStorage.removeItem("auth_token")
  document.cookie = "auth_token=; path=/; max-age=0"
  document.cookie = "auth_role=; path=/; max-age=0"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const authRequestVersion = useRef(0)

  // Authentication is carried by the server-set HttpOnly cookie.
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      config.withCredentials = true
      return config
    })
    return () => axios.interceptors.request.eject(interceptor)
  }, [])

  useEffect(() => {
    clearLegacyClientAuth()
    const requestVersion = authRequestVersion.current

    axios
      .get(`${apiBaseUrl}/api/auth/me`)
      .then((res) => {
        if (requestVersion === authRequestVersion.current) setUser(res.data.user)
      })
      .catch(() => {
        if (requestVersion === authRequestVersion.current) setUser(null)
      })
      .finally(() => {
        if (requestVersion === authRequestVersion.current) setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (phone: string, password: string) => {
    authRequestVersion.current += 1
    setIsLoading(false)
    const res = await axios.post(`${apiBaseUrl}/api/auth/login`, { phone, password })
    const { user } = res.data as { user: AuthUser }
    setUser(user)
    setIsLoading(false)
    return { user }
  }, [])

  const googleLogin = useCallback(async (credential: string) => {
    authRequestVersion.current += 1
    setIsLoading(false)
    const res = await axios.post(`${apiBaseUrl}/api/auth/google`, { credential })
    const { user } = res.data as { user: AuthUser }
    setUser(user)
    setIsLoading(false)
    return { user }
  }, [])

  const updateProfile = useCallback(async (values: { phone?: string; fullname?: string }) => {
    const res = await axios.put(`${apiBaseUrl}/api/auth/profile`, values)
    const { user } = res.data as { user: AuthUser }
    setUser(user)
    return { user }
  }, [])

  const logout = useCallback(() => {
    authRequestVersion.current += 1
    setUser(null)
    void axios.post(`${apiBaseUrl}/api/auth/logout`).finally(() => {
      clearLegacyClientAuth()
    })
  }, [])

  const register = useCallback(async (phone: string, email: string, password: string, fullname: string, googleCredential?: string) => {
    authRequestVersion.current += 1
    setIsLoading(false)
    const res = await axios.post(`${apiBaseUrl}/api/auth/register`, { phone, email, password, fullname, googleCredential })
    const { user } = res.data as { user: AuthUser }
    setUser(user)
    setIsLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, googleLogin, updateProfile, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
