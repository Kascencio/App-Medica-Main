"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CalendarIcon, Pill, Stethoscope } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addDays, getDay, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export default function CaregiverCalendarPage() {
  const { user } = useAuth()
  const [medications, setMedications] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarDays, setCalendarDays] = useState<Date[]>([])
  const [events, setEvents] = useState<{ [key: string]: { medications: any[]; appointments: any[] } }>({})

  // Verificar permisos
  const canViewMedications = user?.permissions?.viewMedications
  const canViewAppointments = user?.permissions?.viewAppointments

  useEffect(() => {
    if (user?.role === "caregiver" && user?.patientId) {
      // Cargar medicamentos
      if (canViewMedications) {
        const storedMedications = localStorage.getItem("medications")
        if (storedMedications) {
          setMedications(JSON.parse(storedMedications))
        }
      }

      // Cargar citas
      if (canViewAppointments) {
        const storedAppointments = localStorage.getItem("appointments")
        if (storedAppointments) {
          setAppointments(JSON.parse(storedAppointments))
        }
      }

      setLoading(false)
    }
  }, [user, canViewMedications, canViewAppointments])

  // Generar días del calendario para el mes actual
  useEffect(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)

    // Obtener todos los días del mes
    let days = eachDayOfInterval({ start, end })

    // Añadir días anteriores para completar la semana
    const firstDayOfWeek = getDay(start)
    if (firstDayOfWeek > 0) {
      const prevDays = Array.from({ length: firstDayOfWeek }, (_, i) => addDays(start, -firstDayOfWeek + i))
      days = [...prevDays, ...days]
    }

    // Añadir días posteriores para completar la última semana
    const lastDayOfWeek = getDay(end)
    if (lastDayOfWeek < 6) {
      const nextDays = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => addDays(end, i + 1))
      days = [...days, ...nextDays]
    }

    setCalendarDays(days)
  }, [currentDate])

  // Procesar eventos para el calendario
  useEffect(() => {
    const newEvents: { [key: string]: { medications: any[]; appointments: any[] } } = {}

    // Procesar medicamentos
    medications.forEach((med) => {
      const nextDose = new Date(med.nextDose)
      const dateKey = format(nextDose, "yyyy-MM-dd")

      if (!newEvents[dateKey]) {
        newEvents[dateKey] = { medications: [], appointments: [] }
      }

      newEvents[dateKey].medications.push({
        ...med,
        time: format(nextDose, "HH:mm"),
      })
    })

    // Procesar citas
    appointments.forEach((appt) => {
      const apptDate = new Date(appt.date)
      const dateKey = format(apptDate, "yyyy-MM-dd")

      if (!newEvents[dateKey]) {
        newEvents[dateKey] = { medications: [], appointments: [] }
      }

      newEvents[dateKey].appointments.push(appt)
    })

    setEvents(newEvents)
  }, [medications, appointments])

  // Cambiar al mes anterior
  const prevMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
    setSelectedDate(null)
  }

  // Cambiar al mes siguiente
  const nextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
    })
    setSelectedDate(null)
  }

  // Ir al mes actual
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Verificar si un día tiene eventos
  const hasEvents = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd")
    return events[dateKey] && (events[dateKey].medications.length > 0 || events[dateKey].appointments.length > 0)
  }

  // Obtener eventos para un día específico
  const getEventsForDay = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd")
    return events[dateKey] || { medications: [], appointments: [] }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">Cargando calendario...</p>
        </div>
      </div>
    )
  }

  if (!canViewMedications && !canViewAppointments) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tiene permisos para ver medicamentos ni citas. Por favor, contacte al paciente para solicitar acceso.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
        <p className="text-muted-foreground">Calendario de {user?.patientName || "Paciente"}</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                Siguiente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 bg-muted/50">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, i) => (
              <div key={i} className="p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              const dayHasEvents = hasEvents(day)
              const isTodayDate = isToday(day)

              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[100px] p-1 relative",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                    isSelected && "bg-primary/10",
                    isTodayDate && "border-primary",
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div
                    className={cn(
                      "flex justify-center items-center h-6 w-6 rounded-full text-sm",
                      isTodayDate && "bg-primary text-primary-foreground font-bold",
                    )}
                  >
                    {format(day, "d")}
                  </div>

                  {dayHasEvents && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="mt-1 space-y-1 cursor-pointer">
                          {getEventsForDay(day).appointments.length > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs w-full justify-start"
                            >
                              <Stethoscope className="h-3 w-3 mr-1" />
                              {getEventsForDay(day).appointments.length}{" "}
                              {getEventsForDay(day).appointments.length === 1 ? "cita" : "citas"}
                            </Badge>
                          )}

                          {getEventsForDay(day).medications.length > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-500 border-green-500/20 text-xs w-full justify-start"
                            >
                              <Pill className="h-3 w-3 mr-1" />
                              {getEventsForDay(day).medications.length}{" "}
                              {getEventsForDay(day).medications.length === 1 ? "medicamento" : "medicamentos"}
                            </Badge>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-3 border-b">
                          <h3 className="font-medium">{format(day, "EEEE d 'de' MMMM, yyyy", { locale: es })}</h3>
                        </div>
                        <ScrollArea className="h-[300px]">
                          <div className="p-3 space-y-4">
                            {canViewAppointments && getEventsForDay(day).appointments.length > 0 && (
                              <div>
                                <h4 className="font-medium text-blue-500 flex items-center mb-2">
                                  <Stethoscope className="h-4 w-4 mr-1" />
                                  Citas
                                </h4>
                                <div className="space-y-2">
                                  {getEventsForDay(day).appointments.map((appt: any, idx: number) => (
                                    <div key={idx} className="rounded-md border p-2 text-sm">
                                      <div className="font-medium">{appt.doctorName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {appt.specialty} - {appt.time}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">{appt.location}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {canViewMedications && getEventsForDay(day).medications.length > 0 && (
                              <div>
                                <h4 className="font-medium text-green-500 flex items-center mb-2">
                                  <Pill className="h-4 w-4 mr-1" />
                                  Medicamentos
                                </h4>
                                <div className="space-y-2">
                                  {getEventsForDay(day).medications.map((med: any, idx: number) => (
                                    <div key={idx} className="rounded-md border p-2 text-sm">
                                      <div className="font-medium">{med.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {med.dose} - {med.time}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="text-sm font-medium">Leyenda:</div>
        {canViewAppointments && (
          <div className="flex items-center">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              <Stethoscope className="h-3 w-3 mr-1" />
              Citas
            </Badge>
          </div>
        )}
        {canViewMedications && (
          <div className="flex items-center">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <Pill className="h-3 w-3 mr-1" />
              Medicamentos
            </Badge>
          </div>
        )}
      </div>

      {/* Vista detallada del día seleccionado */}
      {selectedDate && (
        <Card>
          <CardHeader className="bg-primary/5 pb-2">
            <CardTitle>{format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {hasEvents(selectedDate) ? (
              <div className="space-y-6">
                {canViewAppointments && getEventsForDay(selectedDate).appointments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-blue-500 flex items-center mb-3">
                      <Stethoscope className="h-5 w-5 mr-2" />
                      Citas
                    </h3>
                    <div className="space-y-3">
                      {getEventsForDay(selectedDate).appointments.map((appt: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                            <div className="font-medium text-base">{appt.doctorName}</div>
                            <div className="text-sm text-muted-foreground">{appt.time}</div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{appt.specialty}</div>
                          <div className="text-sm text-muted-foreground mt-1">{appt.location}</div>
                          {appt.notes && <div className="mt-2 rounded-md bg-muted p-2 text-sm">{appt.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canViewMedications && getEventsForDay(selectedDate).medications.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-green-500 flex items-center mb-3">
                      <Pill className="h-5 w-5 mr-2" />
                      Medicamentos
                    </h3>
                    <div className="space-y-3">
                      {getEventsForDay(selectedDate).medications.map((med: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                            <div className="font-medium text-base">{med.name}</div>
                            <div className="text-sm text-muted-foreground">{med.time}</div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {med.dose} - {med.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No hay eventos programados para este día</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
