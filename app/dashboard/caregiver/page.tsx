"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Calendar, ClipboardList, FileText, Pill, User } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function CaregiverDashboardPage() {
  const { user } = useAuth()
  const [patientData, setPatientData] = useState<any>(null)
  const [medications, setMedications] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [treatments, setTreatments] = useState<any[]>([])
  const [medicalNotes, setMedicalNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // En una app real, esto cargaría datos del paciente desde una API
    // Para esta demo, usaremos localStorage
    if (user?.role === "caregiver" && user?.patientId) {
      // Cargar datos del paciente
      const storedPatientData = localStorage.getItem("patientData")
      if (storedPatientData) {
        setPatientData(JSON.parse(storedPatientData))
      }

      // Cargar medicamentos
      const storedMedications = localStorage.getItem("medications")
      if (storedMedications) {
        setMedications(JSON.parse(storedMedications))
      }

      // Cargar citas
      const storedAppointments = localStorage.getItem("appointments")
      if (storedAppointments) {
        setAppointments(JSON.parse(storedAppointments))
      }

      // Cargar tratamientos
      const storedTreatments = localStorage.getItem("treatments")
      if (storedTreatments) {
        setTreatments(JSON.parse(storedTreatments))
      }

      // Cargar notas médicas
      const storedNotes = localStorage.getItem("medicalNotes")
      if (storedNotes) {
        setMedicalNotes(JSON.parse(storedNotes))
      }

      setLoading(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Cargando datos del paciente...</p>
        </div>
      </div>
    )
  }

  if (!user?.patientId) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>No tiene acceso a ningún paciente. Por favor, contacte al administrador.</AlertDescription>
      </Alert>
    )
  }

  // Filtrar medicamentos próximos
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const upcomingMedications = medications
    .filter((med) => {
      const nextDose = new Date(med.nextDose)
      return nextDose >= today && nextDose < tomorrow
    })
    .sort((a, b) => new Date(a.nextDose).getTime() - new Date(b.nextDose).getTime())
    .slice(0, 3)

  // Filtrar citas próximas
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const upcomingAppointments = appointments
    .filter((appt) => {
      const apptDate = new Date(appt.date)
      return apptDate >= today && apptDate <= nextWeek
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  // Obtener notas recientes
  const recentNotes = [...medicalNotes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Panel de Cuidador</h1>
          <p className="text-muted-foreground">
            Gestionando cuidados para <span className="font-medium">{user.patientName || "Paciente"}</span>
          </p>
        </div>
      </div>

      {/* Tarjeta de información del paciente */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5 pb-2">
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Información del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {patientData ? (
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1 space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                    <p>{patientData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Edad</p>
                    <p>{patientData.age} años</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Sexo</p>
                    <p>
                      {patientData.sex === "male" && "Masculino"}
                      {patientData.sex === "female" && "Femenino"}
                      {patientData.sex === "other" && "Otro"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Tipo de Sangre</p>
                    <p>{patientData.bloodType}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Enfermedades Crónicas/Condiciones</p>
                  <p className="break-words">{patientData.conditions || "Ninguna"}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Alergias</p>
                    <p className="break-words">{patientData.allergies || "Ninguna"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Contraindicaciones</p>
                    <p className="break-words">{patientData.contraindications || "Ninguna"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center md:mt-0 md:w-1/4">
                {patientData.photoUrl ? (
                  <img
                    src={patientData.photoUrl || "/placeholder.svg"}
                    alt="Foto del paciente"
                    className="h-32 w-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No hay información del paciente disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Permisos del cuidador */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5 pb-2">
          <CardTitle>Sus Permisos</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="w-full">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.viewMedications ? "default" : "outline"} className="mb-2">
                  {user.permissions?.viewMedications ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Ver Medicamentos</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.manageMedications ? "default" : "outline"} className="mb-2">
                  {user.permissions?.manageMedications ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Gestionar Medicamentos</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.viewAppointments ? "default" : "outline"} className="mb-2">
                  {user.permissions?.viewAppointments ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Ver Citas</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.manageAppointments ? "default" : "outline"} className="mb-2">
                  {user.permissions?.manageAppointments ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Gestionar Citas</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.viewTreatments ? "default" : "outline"} className="mb-2">
                  {user.permissions?.viewTreatments ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Ver Tratamientos</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.manageTreatments ? "default" : "outline"} className="mb-2">
                  {user.permissions?.manageTreatments ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Gestionar Tratamientos</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.viewNotes ? "default" : "outline"} className="mb-2">
                  {user.permissions?.viewNotes ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Ver Notas</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border p-3">
                <Badge variant={user.permissions?.manageNotes ? "default" : "outline"} className="mb-2">
                  {user.permissions?.manageNotes ? "Permitido" : "No permitido"}
                </Badge>
                <p className="text-center text-sm">Gestionar Notas</p>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Secciones principales */}
      <div className="grid gap-6 md:grid-cols-2">
        {user.permissions?.viewMedications && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="flex items-center">
                <Pill className="mr-2 h-5 w-5" />
                Medicamentos Próximos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {upcomingMedications.length > 0 ? (
                <ul className="space-y-2">
                  {upcomingMedications.map((med, index) => (
                    <li key={index} className="rounded-lg border p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium">{med.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(med.nextDose).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {med.dose} - {med.type}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">No hay medicamentos programados para hoy</p>
              )}
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/caregiver/medications">Ver Todos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {user.permissions?.viewAppointments && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Citas Próximas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {upcomingAppointments.length > 0 ? (
                <ul className="space-y-2">
                  {upcomingAppointments.map((appt, index) => (
                    <li key={index} className="rounded-lg border p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium">{appt.doctorName}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(appt.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {appt.specialty} - {appt.time}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">No hay citas programadas para esta semana</p>
              )}
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/caregiver/appointments">Ver Todas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {user.permissions?.viewTreatments && treatments.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 pb-2">
            <CardTitle className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5" />
              Tratamientos Activos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ul className="space-y-2">
              {treatments.slice(0, 2).map((treatment, index) => (
                <li key={index} className="rounded-lg border p-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="font-medium">{treatment.name}</span>
                    <span className="text-sm text-muted-foreground">Doctor: {treatment.doctor}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{treatment.description}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/caregiver/treatments">Ver Todos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {user.permissions?.viewNotes && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 pb-2">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Notas Médicas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {recentNotes.length > 0 ? (
              <div className="space-y-4">
                {recentNotes.map((note) => (
                  <div key={note.id} className="rounded-lg border p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                      <h3 className="font-medium">{note.title}</h3>
                      <span className="text-xs text-muted-foreground">{new Date(note.date).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm line-clamp-2">{note.content}</p>
                  </div>
                ))}
                <div className="mt-2 text-center">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/caregiver/notes">Ver Todas</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No hay notas médicas registradas</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
