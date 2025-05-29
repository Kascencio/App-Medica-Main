"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PatientCard } from "@/components/patient-card"
import { MedicalNotes } from "@/components/medical-notes"
import { Button } from "@/components/ui/button"
import { PlusCircle, Clock, Calendar, Pill, TrendingUp, AlertCircle, Zap, MapPin, Stethoscope } from "lucide-react"
import { CaregiverView } from "@/components/caregiver-view"

/* ────────────────────────────────────────────────────────── */
/* tipos de datos que vienen de las APIs                      */
/* ────────────────────────────────────────────────────────── */
interface ApiMedication {
  id: number
  name: string
  dosage: string
  type: string
  startDate: string // ISO
  notes?: string | null
}

interface ApiAppointment {
  id: number
  title: string
  dateTime: string // ISO
  location?: string | null
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED"
}

/* ================================================================= */

export default function DashboardPage() {
  const { user } = useAuth()

  /* ---------------- Estado local ---------------- */
  const [upcomingMeds, setUpcomingMeds] = useState<ApiMedication[]>([])
  const [upcomingAppts, setUpcomingAppts] = useState<ApiAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMedications: 0,
    totalAppointments: 0,
    todayMedications: 0,
  })

  /* ---------------- Fetch data ------------------ */
  useEffect(() => {
    /* cuidador ⇒ vista propia */
    if (user?.role === "CAREGIVER") return

    /* paciente sin perfil todavía */
    if (!user?.profileId) {
      setLoading(false)
      return
    }

    const pid = user.profileId

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    /** meds **/
    fetch(`/api/medications?patientProfileId=${pid}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ApiMedication[]) => {
        // Guardar total de medicamentos
        setStats((prev) => ({ ...prev, totalMedications: data.length }))

        // Filtrar medicamentos para hoy
        const meds = data
          .filter((m) => {
            const d = new Date(m.startDate)
            return d >= today && d < tomorrow
          })
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 3)

        setUpcomingMeds(meds)
        setStats((prev) => ({ ...prev, todayMedications: meds.length }))
      })
      .catch(console.error)

    /** appts **/
    fetch(`/api/appointments?patientProfileId=${pid}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ApiAppointment[]) => {
        // Guardar total de citas
        setStats((prev) => ({ ...prev, totalAppointments: data.length }))

        // Filtrar citas para la próxima semana
        const appts = data
          .filter((a) => {
            const d = new Date(a.dateTime)
            return d >= today && d <= nextWeek
          })
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
          .slice(0, 3)
        setUpcomingAppts(appts)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  /* ---------------- Render ---------------------- */

  /* 1️⃣  Cuidadores ven su propio tablero */
  if (user?.role === "CAREGIVER") {
    return <CaregiverView />
  }

  /* 2️⃣  Mientras esperamos data */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="text-center">
          <div className="medical-icon mx-auto mb-4 animate-pulse">
            <TrendingUp className="h-6 w-6" />
          </div>
          <p className="text-slate-600">Cargando panel...</p>
        </div>
      </div>
    )
  }

  /* 3️⃣  Paciente sin perfil -> botón para crearlo */
  if (user?.role === "PATIENT" && !user.profileId) {
    return (
      <div className="space-y-8 p-6">
        {/* Header con saludo */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center">
              ¡Bienvenido a RecuerdaMed!
              <Zap className="h-8 w-8 text-yellow-500 ml-2" />
            </h1>
            <p className="text-slate-600 mt-1">Tu salud, inteligentemente gestionada</p>
          </div>
          <div className="medical-icon">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <Card className="medical-card animate-fade-in-up max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="medical-icon mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Completa tu perfil médico</h3>
            <p className="text-slate-600 text-center mb-6">
              Para comenzar a usar todas las funciones inteligentes de RecuerdaMed, necesitamos algunos datos básicos sobre
              tu salud
            </p>
            <Button asChild className="medical-button">
              <Link href="/dashboard/profile">
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Perfil Médico
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* 4️⃣  Panel del paciente */
  return (
    <div className="space-y-8 p-6">
      {/* Header con saludo */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center">
            ¡Bienvenido a RecuerdaMed!
            <Zap className="h-8 w-8 text-yellow-500 ml-2" />
          </h1>
          <p className="text-slate-600 mt-1">Tu salud, inteligentemente gestionada</p>
        </div>
        <div className="medical-icon">
          <TrendingUp className="h-6 w-6" />
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-6 md:grid-cols-3 animate-fade-in-up">
        <Card className="medical-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Medicamentos</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalMedications}</p>
              </div>
              <div className="medical-icon">
                <Pill className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="medical-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Citas</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalAppointments}</p>
              </div>
              <div className="health-icon">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="medical-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Hoy</p>
                <p className="text-2xl font-bold text-slate-900">{stats.todayMedications}</p>
              </div>
              <div className="danger-icon">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-in-up">
        <PatientCard />
      </div>

      <div className="grid gap-8 lg:grid-cols-2 animate-fade-in-up">
        {/* Medicamentos próximos */}
        <Card className="medical-card">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
                <div className="medical-icon mr-3">
                  <Pill className="h-5 w-5" />
                </div>
                Medicamentos 
                de Hoy
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-medical-200 text-medical-600 hover:bg-medical-50 my-3"
              >
                <Link href="/dashboard/medications">Ver Todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMeds.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeds.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center p-4 rounded-xl bg-gradient-to-r from-medical-50 to-blue-50 border border-medical-100"
                  >
                    <div className="medical-icon mr-4">
                      <Pill className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{med.name}</h4>
                      <p className="text-sm text-slate-600">
                        {med.dosage} - {med.type}
                      </p>
                      {med.notes && <p className="text-xs text-slate-500 mt-1">{med.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-medical-600">
                        {new Date(med.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="medical-icon mx-auto mb-4 opacity-50">
                  <Pill className="h-6 w-6" />
                </div>
                <p className="text-slate-500">No hay medicamentos programados para hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Citas próximas */}
        <Card className="medical-card">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center">
                <div className="health-icon mr-3">
                  <Calendar className="h-5 w-5" />
                </div>
                Próximas Citas
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-health-200 text-health-600 hover:bg-health-50 my-3"
              >
                <Link href="/dashboard/appointments">Ver Todas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppts.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center p-4 rounded-xl bg-gradient-to-r from-health-50 to-green-50 border border-health-100"
                  >
                    <div className="health-icon mr-4">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{appt.title}</h4>
                      {appt.location && (
                        <p className="text-sm text-slate-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-slate-400" />
                          <span className="truncate">{appt.location}</span>
                        </p>
                      )}
                      <div className="mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            appt.status === "SCHEDULED"
                              ? "bg-blue-100 text-blue-700"
                              : appt.status === "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {appt.status === "SCHEDULED"
                            ? "Programada"
                            : appt.status === "COMPLETED"
                              ? "Completada"
                              : "Cancelada"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-health-600">
                        {new Date(appt.dateTime).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(appt.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="health-icon mx-auto mb-4 opacity-50">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="text-slate-500">No hay citas programadas para esta semana</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-in-up">
        <MedicalNotes />
      </div>
    </div>
  )
}
