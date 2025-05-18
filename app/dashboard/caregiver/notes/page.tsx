"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileText } from "lucide-react"
import { MedicalNotes } from "@/components/medical-notes"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

export default function CaregiverNotesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "caregiver" && user?.patientId) {
      setLoading(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Cargando notas médicas...</p>
        </div>
      </div>
    )
  }

  if (!user?.permissions?.viewNotes) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tiene permisos para ver las notas médicas. Por favor, contacte al paciente para solicitar acceso.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notas Médicas</h1>
        <p className="text-muted-foreground">Notas médicas de {user.patientName || "Paciente"}</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5 pb-2">
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Historial de Notas
          </CardTitle>
        </CardHeader>
        <MedicalNotes readOnly={!user.permissions?.manageNotes} />
      </Card>
    </div>
  )
}
