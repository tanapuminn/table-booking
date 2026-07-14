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

function setAuthCookies(token: string, role: string) {
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
  document.cookie = `auth_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearAuthCookies() {
  document.cookie = "auth_token=; path=/; max-age=0"
  document.cookie = "auth_role=; path=/; max-age=0"
}

function storeSession(token: string, user: AuthUser) {
  localStorage.setItem("auth_token", token)
  setAuthCookies(token, user.role)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Add Authorization header to all axios requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("auth_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
    return () => axios.interceptors.request.eject(interceptor)
  }, [])

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      setIsLoading(false)
      return
    }
    axios
      .get(`${baseURL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUser(res.data.user)
      })
      .catch(() => {
        localStorage.removeItem("auth_token")
        clearAuthCookies()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (phone: string, password: string) => {
    const res = await axios.post(`${baseURL}/api/auth/login`, { phone, password })
    const { token, user } = res.data as { token: string; user: AuthUser }
    storeSession(token, user)
    setUser(user)
    return { user }
  }, [])

  const googleLogin = useCallback(async (credential: string) => {
    const res = await axios.post(`${baseURL}/api/auth/google`, { credential })
    const { token, user } = res.data as { token: string; user: AuthUser }
    storeSession(token, user)
    setUser(user)
    return { user }
  }, [])

  const updateProfile = useCallback(async (values: { phone?: string; fullname?: string }) => {
    const res = await axios.put(`${baseURL}/api/auth/profile`, values)
    const { token, user } = res.data as { token: string; user: AuthUser }
    storeSession(token, user)
    setUser(user)
    return { user }
  }, [])
  const logout = useCallback(() => {
    localStorage.removeItem("auth_token")
    clearAuthCookies()
    setUser(null)
  }, [])

  const register = useCallback(async (phone: string, email: string, password: string, fullname: string, googleCredential?: string) => {
    const res = await axios.post(`${baseURL}/api/auth/register`, { phone, email, password, fullname, googleCredential })
    const { token, user } = res.data as { token: string; user: AuthUser }
    storeSession(token, user)
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
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
