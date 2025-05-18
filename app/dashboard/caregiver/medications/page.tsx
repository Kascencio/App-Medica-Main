"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Clock, Pill } from "lucide-react"
import Link from "next/link"

export default function CaregiverMedicationsPage() {
  const { user } = useAuth()
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "caregiver" && user?.patientId) {
      const storedMedications = localStorage.getItem("medications")
      if (storedMedications) {
        setMedications(JSON.parse(storedMedications))
      }
      setLoading(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Cargando medicamentos...</p>
        </div>
      </div>
    )
  }

  if (!user?.permissions?.viewMedications) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tiene permisos para ver los medicamentos. Por favor, contacte al paciente para solicitar acceso.
        </AlertDescription>
      </Alert>
    )
  }

  // Ordenar medicamentos por próxima dosis
  const sortedMedications = [...medications].sort((a, b) => {
    return new Date(a.nextDose).getTime() - new Date(b.nextDose).getTime()
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-muted-foreground">Medicamentos de {user.patientName || "Paciente"}</p>
        </div>
        {user.permissions?.manageMedications && (
          <Button asChild>
            <Link href="/dashboard/medications">Gestionar Medicamentos</Link>
          </Button>
        )}
      </div>

      {medications.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMedications.map((med, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-primary/5 pb-2">
                <CardTitle className="flex items-center text-base">
                  <Pill className="mr-2 h-4 w-4" />
                  {med.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Dosis:</span>
                    <span className="text-sm">{med.dose}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tipo:</span>
                    <span className="text-sm">{med.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Frecuencia:</span>
                    <span className="text-sm">
                      {med.frequency === "daily" ? "Diaria" : med.frequency === "weekly" ? "Semanal" : "Personalizada"}
                    </span>
                  </div>
                  <div className="pt-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>
                        Próxima dosis: {new Date(med.nextDose).toLocaleDateString()} a las{" "}
                        {new Date(med.nextDose).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No hay medicamentos registrados</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
