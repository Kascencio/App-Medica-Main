"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Calendar, MapPin } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

export default function CaregiverAppointmentsPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "caregiver" && user?.patientId) {
      const storedAppointments = localStorage.getItem("appointments")
      if (storedAppointments) {
        setAppointments(JSON.parse(storedAppointments))
      }
      setLoading(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Cargando citas...</p>
        </div>
      </div>
    )
  }

  if (!user?.permissions?.viewAppointments) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tiene permisos para ver las citas. Por favor, contacte al paciente para solicitar acceso.
        </AlertDescription>
      </Alert>
    )
  }

  // Ordenar citas por fecha
  const sortedAppointments = [...appointments].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  // Agrupar citas por mes
  const groupedAppointments: Record<string, any[]> = {}

  sortedAppointments.forEach((appointment) => {
    const date = new Date(appointment.date)
    const monthYear = format(date, "MMMM yyyy", { locale: es })

    if (!groupedAppointments[monthYear]) {
      groupedAppointments[monthYear] = []
    }

    groupedAppointments[monthYear].push(appointment)
  })

  // Determinar si una cita es próxima (en los próximos 3 días)
  const isUpcoming = (date: string) => {
    const appointmentDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(today.getDate() + 3)

    return appointmentDate >= today && appointmentDate <= threeDaysFromNow
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Citas Médicas</h1>
          <p className="text-muted-foreground">Citas de {user.patientName || "Paciente"}</p>
        </div>
        {user.permissions?.manageAppointments && (
          <Button asChild>
            <Link href="/dashboard/appointments">Gestionar Citas</Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {Object.keys(groupedAppointments).length > 0 ? (
          Object.entries(groupedAppointments).map(([monthYear, monthAppointments]) => (
            <div key={monthYear} className="space-y-4">
              <h2 className="capitalize text-xl font-semibold">{monthYear}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {monthAppointments.map((appointment) => (
                  <Card key={appointment.id} className="overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base">
                          <Calendar className="mr-2 h-4 w-4" />
                          {appointment.doctorName}
                        </CardTitle>
                        {isUpcoming(appointment.date) && (
                          <Badge variant="secondary" className="ml-2">
                            Próxima
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Especialidad:</span>
                          <span className="text-sm">{appointment.specialty}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Fecha:</span>
                          <span className="text-sm">
                            {format(new Date(appointment.date), "d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Hora:</span>
                          <span className="text-sm">{appointment.time}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground pt-2">
                          <MapPin className="mr-1 h-4 w-4 flex-shrink-0" />
                          <span>{appointment.location}</span>
                        </div>
                        {appointment.notes && (
                          <div className="mt-2 rounded-md bg-muted p-2">
                            <p className="text-xs">{appointment.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">No hay citas médicas registradas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
