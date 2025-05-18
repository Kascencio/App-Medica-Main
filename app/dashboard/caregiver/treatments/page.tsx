"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ClipboardList, Calendar } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function CaregiverTreatmentsPage() {
  const { user } = useAuth()
  const [treatments, setTreatments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "caregiver" && user?.patientId) {
      const storedTreatments = localStorage.getItem("treatments")
      if (storedTreatments) {
        setTreatments(JSON.parse(storedTreatments))
      }
      setLoading(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Cargando tratamientos...</p>
        </div>
      </div>
    )
  }

  if (!user?.permissions?.viewTreatments) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tiene permisos para ver los tratamientos. Por favor, contacte al paciente para solicitar acceso.
        </AlertDescription>
      </Alert>
    )
  }

  // Ordenar tratamientos por fecha de inicio (más recientes primero)
  const sortedTreatments = [...treatments].sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  })

  // Determinar si un tratamiento está activo (ha comenzado pero no ha terminado)
  const isActive = (treatment: any) => {
    const today = new Date()
    const startDate = new Date(treatment.startDate)
    const endDate = treatment.endDate ? new Date(treatment.endDate) : null

    return startDate <= today && (!endDate || endDate >= today)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tratamientos</h1>
          <p className="text-muted-foreground">Tratamientos de {user.patientName || "Paciente"}</p>
        </div>
        {user.permissions?.manageTreatments && (
          <Button asChild>
            <Link href="/dashboard/treatments">Gestionar Tratamientos</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {sortedTreatments.length > 0 ? (
          sortedTreatments.map((treatment) => (
            <Card key={treatment.id} className="overflow-hidden">
              <CardHeader className="bg-primary/5 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    {treatment.name}
                  </CardTitle>
                  {isActive(treatment) ? (
                    <Badge className="ml-2">Activo</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">
                      {new Date(treatment.startDate) > new Date() ? "Pendiente" : "Completado"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Doctor:</span>
                    <span className="text-sm">{treatment.doctor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Inicio:</span>
                    <span className="text-sm">
                      {format(new Date(treatment.startDate), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                  {treatment.endDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fin:</span>
                      <span className="text-sm">
                        {format(new Date(treatment.endDate), "d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-sm">{treatment.description}</p>
                  </div>
                  {treatment.notes && (
                    <div className="rounded-md bg-muted p-2">
                      <p className="text-xs">{treatment.notes}</p>
                    </div>
                  )}

                  {/* Sección de progreso */}
                  {treatment.progress && treatment.progress.length > 0 && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="progress">
                        <AccordionTrigger className="text-sm font-medium">
                          Seguimiento del Tratamiento ({treatment.progress.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="mt-2 space-y-2">
                            {treatment.progress.map((progress: any) => (
                              <div key={progress.id} className="rounded-md border p-2 text-sm">
                                <div className="flex items-center">
                                  <Calendar className="mr-1 h-4 w-4" />
                                  <span className="font-medium">
                                    {format(new Date(progress.date), "d 'de' MMMM, yyyy", { locale: es })}
                                  </span>
                                </div>
                                {progress.notes && <p className="mt-1 text-xs">{progress.notes}</p>}
                                {progress.sideEffects && (
                                  <div className="mt-1 text-xs">
                                    <span className="font-medium">Efectos secundarios: </span>
                                    {progress.sideEffects}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">No hay tratamientos registrados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
