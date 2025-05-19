"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Alert, AlertTitle, AlertDescription,
} from "@/components/ui/alert"
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertCircle, Calendar, ClipboardList,
  FileText, Pill, User,
} from "lucide-react"
import { useAuth } from "@/lib/auth-provider"

/* ------------------------------------------------------------------ */
/* ------------------------- Tipos de datos ------------------------- */

interface PatientProfile {
  id: number
  name: string | null
  age: number | null
  sex: "male" | "female" | "other" | null
  bloodType: string | null
  conditions: string | null
  allergies: string | null
  contraindications: string | null
  photoUrl: string | null
}

interface Medication {
  id: number
  name: string
  dosage: string
  type: string
  nextDose: string  // ISO
}

interface Appointment {
  id: number
  doctorName: string
  specialty: string | null
  dateTime: string  // ISO
}

interface Treatment {
  id: number
  title: string
  description: string | null
}

interface Note {
  id: number
  title: string
  content: string
  date: string  // ISO
}

/* ------------------------------------------------------------------ */

export default function CaregiverDashboardPage () {
  const { user } = useAuth()

  const [patient,      setPatient]      = useState<PatientProfile | null>(null)
  const [medications,  setMedications]  = useState<Medication[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [treatments,   setTreatments]   = useState<Treatment[]>([])
  const [notes,        setNotes]        = useState<Note[]>([])

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  /* ----------------- helpers ----------------- */
  const pid = user?.profileId           // <-- del token si el cuidador ES paciente
            ?? user?.patientId          // <-- del token si viene explícito
            ?? null

  /** Carga las colecciones en paralelo */
  const fetchAll = async () => {
    if (!pid) return

    try {
      setError(null)
      setLoading(true)

      const [
        patientRes,
        medsRes,
        apptRes,
        treatRes,
        notesRes,
      ] = await Promise.all([
        fetch(`/api/patients/${pid}`),
        fetch(`/api/medications?patientProfileId=${pid}`),
        fetch(`/api/appointments?patientProfileId=${pid}`),
        fetch(`/api/treatments?patientProfileId=${pid}`),
        fetch(`/api/notes?patientProfileId=${pid}`),
      ])

      if (!patientRes.ok)  throw new Error("Error cargando paciente")
      if (!medsRes.ok)     throw new Error("Error cargando medicamentos")
      if (!apptRes.ok)     throw new Error("Error cargando citas")
      if (!treatRes.ok)    throw new Error("Error cargando tratamientos")
      if (!notesRes.ok)    throw new Error("Error cargando notas")

      setPatient(     await patientRes.json() )
      setMedications( await medsRes.json()    )
      setAppointments(await apptRes.json()    )
      setTreatments(  await treatRes.json()   )
      setNotes(       await notesRes.json()   )
    } catch (e: any) {
      console.error("[CG-dashboard] fetch error:", e)
      setError(e.message || "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  /* 1ª carga */
  useEffect(() => { if (pid) fetchAll() }, [pid])

  /* -------------- filtros rápidos -------------- */
  const today     = new Date()
  today.setHours(0,0,0,0)
  const tomorrow  = new Date(today);      tomorrow.setDate(today.getDate()+1)
  const nextWeek  = new Date(today);      nextWeek.setDate(today.getDate()+7)

  const upcomingMeds = medications
    .filter(m => {
      const d = new Date(m.nextDose)
      return d >= today && d < tomorrow
    })
    .sort((a,b)=> new Date(a.nextDose).getTime() - new Date(b.nextDose).getTime())
    .slice(0,3)

  const upcomingAppts = appointments
    .filter(a => {
      const d = new Date(a.dateTime)
      return d >= today && d <= nextWeek
    })
    .sort((a,b)=> new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0,3)

  const recentNotes = [...notes]
    .sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0,2)

  /* -------------- renders -------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Cargando información…</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!pid) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sin paciente asignado</AlertTitle>
        <AlertDescription>
          Aún no tienes acceso a un paciente. Solicita un&nbsp;
          <Link href="/settings" className="underline">código de invitación</Link>.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Panel de Cuidador
        </h1>
        <p className="text-muted-foreground">
          Gestionando a&nbsp;
          <span className="font-medium">
            {patient?.name || user?.patientName || "Paciente"}
          </span>
        </p>
      </header>

      {/* ---------------- Información del paciente ---------------- */}
      <Card>
        <CardHeader className="bg-primary/5 pb-2">
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Información del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {patient ? (
            <div className="grid gap-4 md:grid-cols-3">
              <dl className="space-y-2 md:col-span-2">
                <Item label="Nombre"          value={patient.name}           />
                <Item label="Edad"            value={patient.age && `${patient.age} años`} />
                <Item label="Sexo"            value={
                  patient.sex === "male"   ? "Masculino" :
                  patient.sex === "female" ? "Femenino" : "Otro"
                } />
                <Item label="Tipo de sangre"  value={patient.bloodType}      />
                <Item label="Condiciones"     value={patient.conditions || "Ninguna"} />
                <Item label="Alergias"        value={patient.allergies  || "Ninguna"} />
                <Item label="Contraindicaciones" value={patient.contraindications || "Ninguna"} />
              </dl>

              <div className="flex items-center justify-center">
                {patient.photoUrl
                  ? <img src={patient.photoUrl} alt="Foto" className="h-32 w-32 rounded-full object-cover" />
                  : <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-16 w-16 text-muted-foreground" />
                    </div>}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No disponible</p>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Permisos ---------------- */}
      <PermisosCard />

      <div className="grid gap-6 md:grid-cols-2">
        {user?.permissions?.viewMedications && (
          <ListaSimple
            icon={Pill}
            title="Medicamentos Próximos"
            items={upcomingMeds}
            empty="No hay medicamentos para hoy"
            href="/dashboard/caregiver/medications"
            render={(m: Medication) => (
              <>
                <span className="font-medium">{m.name}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(m.nextDose).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </>
            )}
            sub={(m: Medication) => `${m.dosage} - ${m.type}`}
          />
        )}

        {user?.permissions?.viewAppointments && (
          <ListaSimple
            icon={Calendar}
            title="Citas Próximas"
            items={upcomingAppts}
            empty="No hay citas programadas"
            href="/dashboard/caregiver/appointments"
            render={(a: Appointment) => (
              <>
                <span className="font-medium">{a.doctorName}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(a.dateTime).toLocaleDateString()}
                </span>
              </>
            )}
            sub={(a: Appointment) => `${a.specialty ?? ""}`}
          />
        )}
      </div>

      {user?.permissions?.viewTreatments && treatments.length > 0 && (
        <ListaSimple
          icon={ClipboardList}
          title="Tratamientos Activos"
          items={treatments.slice(0,2)}
          empty="No hay tratamientos"
          href="/dashboard/caregiver/treatments"
          render={(t: Treatment) => <span className="font-medium">{t.title}</span>}
          sub={(t: Treatment) => t.description ?? ""}
        />
      )}

      {user?.permissions?.viewNotes && (
        <ListaNotas notes={recentNotes} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* --------------------  Componentes auxiliares  -------------------- */

function Item ({ label, value }: { label: string, value: string | number | null | undefined }) {
  return (
    <div className="grid grid-cols-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value ?? "—"}</dd>
    </div>
  )
}

function PermisosCard () {
  const { user } = useAuth()

  const perms = [
    ["viewMedications",    "Ver Medicamentos"],
    ["manageMedications",  "Gestionar Medicamentos"],
    ["viewAppointments",   "Ver Citas"],
    ["manageAppointments", "Gestionar Citas"],
    ["viewTreatments",     "Ver Tratamientos"],
    ["manageTreatments",   "Gestionar Tratamientos"],
    ["viewNotes",          "Ver Notas"],
    ["manageNotes",        "Gestionar Notas"],
  ] as const

  return (
    <Card>
        <CardHeader className="bg-primary/5 pb-2">
          <CardTitle>Permisos Asignados</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="w-full">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {perms.map(([key, label]) => (
                <div key={key} className="flex flex-col items-center rounded-lg border p-3">
                  <Badge variant={user?.permissions?.[key] ? "default" : "outline"} className="mb-2">
                    {user?.permissions?.[key] ? "Permitido" : "No"}
                  </Badge>
                  <p className="text-center text-xs">{label}</p>
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

/* ------------------ Plantilla lista simple ------------------ */
type ListaProps<T> = {
  icon: any
  title: string
  items: T[]
  empty: string
  href: string
  render: (item: T)=>React.ReactNode
  sub?:  (item: T)=>React.ReactNode
}

function ListaSimple<T> ({ icon:Icon, title, items, empty, href, render, sub }: ListaProps<T>) {
  return (
    <Card>
      <CardHeader className="bg-primary/5 pb-2">
        <CardTitle className="flex items-center">
          <Icon className="mr-2 h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {items.length > 0 ? (
          <>
            <ul className="space-y-2">
              {items.map((it,i)=>(
                <li key={i} className="rounded-lg border p-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    {render(it)}
                  </div>
                  {sub && <div className="text-sm text-muted-foreground">{sub(it)}</div>}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href={href}>Ver Todos</Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- Notas médicas recientes ------------------ */
function ListaNotas ({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return null

  return (
    <Card>
      <CardHeader className="bg-primary/5 pb-2">
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Notas Médicas Recientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <ul className="space-y-4">
          {notes.map(n=>(
            <li key={n.id} className="rounded-lg border p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <h3 className="font-medium">{n.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.date).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-sm line-clamp-2 whitespace-pre-wrap">{n.content}</p>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-center">
          <Button variant="outline" asChild>
            <Link href="/dashboard/caregiver/notes">Ver Todas</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
