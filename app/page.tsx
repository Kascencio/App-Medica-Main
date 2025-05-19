"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const isAuthenticated = !!user

  useEffect(() => {
    if (loading) return

    if (isAuthenticated) {
      if (user?.role === 'CAREGIVER') {
        router.push('/dashboard/caregiver')
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router, user])

  return (
    <main className="flex min-h-screen items-center justify-center dark">
      <div className="animate-pulse text-center">
        <h1 className="text-2xl font-bold">Agenda Electrónica Médica</h1>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </main>
  )
}