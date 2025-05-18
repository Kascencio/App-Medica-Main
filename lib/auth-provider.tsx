"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import {jwtDecode} from 'jwt-decode'
import { deleteCookie, getCookie, setCookie } from 'cookies-next'

// --- Tipos ---------------------------------------------------
export type Role = 'PATIENT' | 'CAREGIVER'

export interface Permissions {
  viewMedications?: boolean
  viewAppointments?: boolean
  viewTreatments?: boolean
  viewNotes?: boolean
  manageMedications?: boolean
  manageAppointments?: boolean
  manageTreatments?: boolean
  manageNotes?: boolean
}

interface JwtPayload {
  sub: number
  role: Role
  exp: number
  profileId?: number
  patientName?: string
  permissions?: Permissions
}

export interface User {
  id: number
  role: Role
  email: string
  profileId?: number
  patientName?: string
  permissions?: Permissions
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, role: Role) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const parseToken = (token: string): User | null => {
    try {
      const p = jwtDecode<JwtPayload>(token)
      if (p.exp * 1000 < Date.now()) return null
      return {
        id: p.sub,
        role: p.role,
        email: '', // could include if sent in JWT
        profileId: p.profileId,
        patientName: p.patientName,
        permissions: p.permissions
      }
    } catch {
      return null
    }
  }

  useEffect(() => {
    const token = getCookie('jwt') as string | undefined
    if (token) {
      const parsed = parseToken(token)
      setUser(parsed)
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Credenciales incorrectas')
    }

  const { token } = await res.json()
  setCookie("jwt", token, { sameSite: "lax" }) 
  setUser(parseToken(token))
  }

  const register = async (email: string, password: string, role: Role) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    })

    if (res.ok) {
      // al registrarse, hacemos login automático
      await login(email, password)
      return
    }

    // manejar errores
    let msg = 'Error al registrar'
    try {
      const data = await res.json()
      if (data.error) msg = data.error
      else if (res.status === 409) msg = 'Email ya registrado'
    } catch {
      if (res.status === 409) msg = 'Email ya registrado'
    }

    throw new Error(msg)
  }

  const logout = () => {
    deleteCookie('jwt')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
