/* app/(dashboard)/calendar/page.tsx */
"use client"

import {
  addDays, eachDayOfInterval, endOfMonth, format, getDay,
  isSameDay, isToday, parseISO, startOfMonth
} from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarIcon, Pill, Stethoscope
} from "lucide-react"
/* 👇 importa cada cosa de su archivo */
import { Button }            from "@/components/ui/button"
import { Badge }             from "@/components/ui/badge"
import {
  Card, CardContent, CardHeader, CardTitle
}                            from "@/components/ui/card"
import {
  Popover, PopoverContent, PopoverTrigger
}                            from "@/components/ui/popover"
import { ScrollArea }        from "@/components/ui/scroll-area"
        // <-- tu barrel export
import { cn }      from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import React, { useCallback, useEffect, useMemo, useState } from "react"

/* ---------- Tipos de API ---------- */
type MedFreq = "daily" | "weekly" | "custom"
interface ApiMedication {
  id: number; patientProfileId: number; name: string; dosage: string;
  type: string; frequency: MedFreq; startDate: string; notes?: string | null;
}
type ApptStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED"
interface ApiAppointment {
  id: number; patientProfileId: number; title: string;
  dateTime: string; location?: string | null;
  description?: string | null; status: ApptStatus;
}
/* ---------- Tipos internos ---------- */
interface CalMed { id:number; name:string; time:string; dose:string; type:string }
interface CalAppt{ id:number; title:string; time:string; location?:string|null; status:ApptStatus }
type DayBucket = { medications: CalMed[]; appointments: CalAppt[] }
/* ============================================================= */

export default function CalendarPage() {
  /* --- auth --- */
  const { user, loading: authLoading } = useAuth()
  const pid = user?.profileId               // <- viene en el JWT? si no, será undefined

  /* --- state básico --- */
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string|null>(null)
  const [meds,     setMeds]     = useState<ApiMedication[]>([])
  const [appts,    setAppts]    = useState<ApiAppointment[]>([])
  /* calendario */
  const [month,        setMonth]        = useState(new Date())
  const [selectedDay,  setSelectedDay]  = useState<Date|null>(new Date())

  /* ---------- fetch ---------- */
  const hydrate = useCallback(async () => {
    if (!pid) {                         // <- ¡cortamos el loading aquí!
      setLoading(false)
      return
    }
    try {
      const [m, a] = await Promise.all([
        fetch(`/api/medications?patientProfileId=${pid}`).then(r=>r.json()),
        fetch(`/api/appointments?patientProfileId=${pid}`).then(r=>r.json()),
      ])
      setMeds(m); setAppts(a); setError(null)
    } catch (e:any) {
      setError(e.message ?? "Error al cargar datos")
    } finally { setLoading(false) }
  }, [pid])

  useEffect(() => { if (!authLoading) hydrate() }, [authLoading, hydrate])

  /* ---------- buckets por día ---------- */
  const buckets = useMemo<Record<string,DayBucket>>(() => {
    const b: Record<string,DayBucket> = {}
    const key = (d:Date) => format(d,"yyyy-MM-dd")

    const add = (d:Date) => {
      const k = key(d)
      if (!b[k]) b[k] = { medications:[], appointments:[] }
      return b[k]
    }
    meds.forEach(m => {
      const d = parseISO(m.startDate)
      add(d).medications.push({
        id:m.id, name:m.name, time:format(d,"HH:mm"), dose:m.dosage, type:m.type
      })
    })
    appts.forEach(a => {
      const d = parseISO(a.dateTime)
      add(d).appointments.push({
        id:a.id, title:a.title, time:format(d,"HH:mm"),
        location:a.location ?? undefined, status:a.status
      })
    })
    return b
  }, [meds, appts])

  /* ---------- helpers calendario ---------- */
  const days = useMemo(() => {
    const s = startOfMonth(month), e = endOfMonth(month)
    let d   = eachDayOfInterval({start:s,end:e})
    const pre = getDay(s)
    if (pre) d = [...Array.from({length:pre},(_,i)=>addDays(s,-(pre-i))), ...d]
    const post = 6-getDay(e)
    if (post) d = [...d, ...Array.from({length:post},(_,i)=>addDays(e,i+1))]
    return d
  }, [month])

  /* ---------- UI ---------- */
  if (authLoading || loading)
    return (
      <div className="flex h-full items-center justify-center py-16">
        <p className="text-muted-foreground">Cargando calendario…</p>
      </div>
    )

  /* ───── perfil faltante ───── */
  if (!pid)
    return (
      <div className="flex h-full items-center justify-center py-16">
        <Card>
          <CardHeader><CardTitle>Error</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">
              Este usuario aún no tiene un perfil de paciente asignado.<br/>
              Cree el perfil y vuelva a intentarlo.
            </p>
          </CardContent>
        </Card>
      </div>
    )

  /* ───── error de carga ───── */
  if (error)
    return (
      <div className="flex h-full items-center justify-center py-16">
        <p className="text-destructive">{error}</p>
      </div>
    )

  /* ───── vista principal ───── */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>

      <Card className="overflow-hidden">
        {/* encabezado */}
        <CardHeader className="bg-primary/10 py-3 flex justify-between">
          <CardTitle className="flex items-center text-lg">
            <CalendarIcon className="mr-2 h-5 w-5"/>
            {format(month,"MMMM yyyy",{locale:es})}
          </CardTitle>
          <div className="space-x-2">
            <Button size="sm" variant="outline" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>Anterior</Button>
            <Button size="sm" variant="outline" onClick={()=>{ const t=new Date(); setMonth(t); setSelectedDay(t)}}>Hoy</Button>
            <Button size="sm" variant="outline" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>Siguiente</Button>
          </div>
        </CardHeader>

        {/* grid días */}
        <CardContent className="p-0">
          <div className="grid grid-cols-7 bg-muted/20 text-center text-sm font-medium">
            {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d=><div key={d} className="p-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map(d=>{
              const k   = format(d,"yyyy-MM-dd")
              const ev  = buckets[k]
              const cur = d.getMonth()===month.getMonth()
              return (
                <div key={k}
                  onClick={()=>setSelectedDay(d)}
                  className={cn("h-24 border-r border-b p-1.5 relative cursor-pointer hover:bg-muted/30",
                    !cur && "bg-muted/10 text-muted-foreground")}>
                  {/* número */}
                  <span className={cn(
                    "absolute right-1 top-1 h-6 w-6 inline-flex items-center justify-center rounded-full text-xs",
                    isToday(d)&&"bg-primary text-primary-foreground font-semibold",
                    selectedDay && isSameDay(d,selectedDay)&&"ring-2 ring-primary"
                  )}>{d.getDate()}</span>

                  {ev && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                          {!!ev.appointments.length &&
                            <Badge variant="outline" className="w-full justify-start bg-blue-500/10 text-blue-600 border-blue-600/20 text-xxs">
                              <Stethoscope className="h-3 w-3 mr-1"/> {ev.appointments.length} cita
                            </Badge>}
                          {!!ev.medications.length &&
                            <Badge variant="outline" className="w-full justify-start bg-green-500/10 text-green-600 border-green-600/20 text-xxs">
                              <Pill className="h-3 w-3 mr-1"/> {ev.medications.length} med.
                            </Badge>}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-0">
                        <div className="border-b p-3 font-medium">
                          {format(d,"PPP",{locale:es})}
                        </div>
                        <ScrollArea className="h-[240px]">
                          <div className="p-3 space-y-3">
                            {ev.appointments.map(a=>(
                              <div key={`a-${a.id}`} className="border rounded-md p-2 text-xs">
                                <div className="font-medium text-blue-700 flex items-center"><Stethoscope className="h-3 w-3 mr-1"/>{a.title}</div>
                                <div className="text-muted-foreground ml-4">{a.time}{a.location &&` - ${a.location}`}</div>
                              </div>))}
                            {ev.medications.map(m=>(
                              <div key={`m-${m.id}`} className="border rounded-md p-2 text-xs">
                                <div className="font-medium text-green-700 flex items-center"><Pill className="h-3 w-3 mr-1"/>{m.name}</div>
                                <div className="text-muted-foreground ml-4">{m.dose} – {m.time}</div>
                              </div>))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
