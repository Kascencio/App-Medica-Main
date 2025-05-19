"use client"

import React, { useEffect } from "react"
import { useRouter }       from "next/navigation"
import { useAuth }         from "@/lib/auth-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle }     from "lucide-react"

export default function CaregiverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router           = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.role !== "CAREGIVER") {
        router.push("/dashboard")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (user?.role !== "CAREGIVER") {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>Esta sección es solo para cuidadores.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}
