"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { jwtDecode } from "jwt-decode"
import { getCookie, setCookie, deleteCookie } from "cookies-next"

/* ──────────── Types ──────────── */
export type Role = "PATIENT" | "CAREGIVER"

export interface Permissions {
  viewMedications?: true
  viewAppointments?: true
  viewTreatments?: true
  viewNotes?: true
  manageMedications?: true
  manageAppointments?: true
  manageTreatments?: true
  manageNotes?: true
}

interface JwtPayload {
  sub: number
  role: Role
  exp: number
  profileId?: number
  patientId?: number
  patientName?: string
  permissions?: Permissions
}

export interface User {
  id: number
  role: Role
  email: string
  profileId?: number
  patientId?: number
  patientName?: string
  permissions?: Permissions
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, role: Role, inviteCode?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/* ──────────── Helper ──────────── */
function parseToken(token: string): User | null {
  try {
    const p = jwtDecode<JwtPayload>(token)
    if (p.exp * 1000 < Date.now()) return null
    return {
      id: p.sub,
      role: p.role,
      email: "",            // filled from server response on login/register
      profileId: p.profileId,
      patientId: p.patientId,
      patientName: p.patientName,
      permissions: p.permissions,
    }
  } catch {
    return null
  }
}

/* ──────────── Provider ──────────── */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = Boolean(user)
  const isLoading = loading

  /* load token on mount */
  useEffect(() => {
    const token = getCookie("jwt") as string | undefined
    if (token) {
      const parsed = parseToken(token)
      if (parsed) {
        setUser(parsed)
      }
    }
    setLoading(false)
  }, [])

  /* login */
  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const { error = "Credenciales incorrectas" } = await res.json().catch(() => ({}))
      throw new Error(error)
    }

    const { token, user: serverUser } = await res.json()
    setCookie("jwt", token, { sameSite: "lax" })
    setUser(serverUser ?? parseToken(token))
  }

  /* register */
  const register = async (
    email: string,
    password: string,
    role: Role,
    inviteCode?: string
  ) => {
    const body: Record<string, unknown> = { email, password, role }
    if (inviteCode) body.inviteCode = inviteCode

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) throw new Error("Email ya registrado")
      throw new Error(data.error || "Error al registrar")
    }

    // auto-login
    const { token, user: serverUser } = await res.json()
    setCookie("jwt", token, { sameSite: "lax" })
    setUser(serverUser ?? parseToken(token))
  }

  /* logout */
  const logout = () => {
    deleteCookie("jwt")
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* ---- Hook ---- */
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>")
  return ctx
}
