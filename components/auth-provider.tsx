"use client"

import axios from "axios"
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

const baseURL = process.env.NEXT_PUBLIC_BASE_URL

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

    axios
      .get(`${baseURL}/api/auth/me`)
      .then((res) => {
        setUser(res.data.user)
      })
      .catch(() => {
        void axios.post(`${baseURL}/api/auth/logout`).catch(() => undefined)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (phone: string, password: string) => {
    const res = await axios.post(`${baseURL}/api/auth/login`, { phone, password })
    const { user } = res.data as { user: AuthUser }
    setUser(user)
    return { user }
  }, [])

  const googleLogin = useCallback(async (credential: string) => {
    const res = await axios.post(`${baseURL}/api/auth/google`, { credential })
    const { user } = res.data as { user: AuthUser }
    setUser(user)
    return { user }
  }, [])

  const updateProfile = useCallback(async (values: { phone?: string; fullname?: string }) => {
    const res = await axios.put(`${baseURL}/api/auth/profile`, values)
    const { user } = res.data as { user: AuthUser }
    setUser(user)
    return { user }
  }, [])

  const logout = useCallback(() => {
    void axios.post(`${baseURL}/api/auth/logout`).finally(() => {
      clearLegacyClientAuth()
      setUser(null)
    })
  }, [])

  const register = useCallback(async (phone: string, email: string, password: string, fullname: string, googleCredential?: string) => {
    const res = await axios.post(`${baseURL}/api/auth/register`, { phone, email, password, fullname, googleCredential })
    const { user } = res.data as { user: AuthUser }
    setUser(user)
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