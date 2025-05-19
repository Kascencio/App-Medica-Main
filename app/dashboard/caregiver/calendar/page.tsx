"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addDays,
  isSameDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Pill, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Tipos de API ---------- */
interface ApiMedication {
  id: number;
  caregiverProfileId: number; // Cambiado de patientProfileId a caregiverProfileId
  name: string;
  dosage: string;
  type: string;
  frequency: "daily" | "weekly" | "custom";
  startDate: string; // ISO
  notes?: string | null;
}

interface ApiAppointment {
  id: number;
  caregiverProfileId: number; // Cambiado de patientProfileId a caregiverProfileId
  title: string;
  dateTime: string; // ISO
  location?: string | null;
  description?: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
}

type DayBucket = {
  medications: {
    id: number;
    name: string;
    time: string;
    dose: string;
    type: string;
  }[];
  appointments: {
    id: number;
    title: string;
    time: string;
    location?: string;
    status: ApiAppointment["status"];
  }[];
};

export default function CaregiverCalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const caregiverId = user?.profileId; // Cambiado de patientId a profileId
  const canViewMedications = Boolean(user?.permissions?.viewMedications);
  const canViewAppointments = Boolean(user?.permissions?.viewAppointments);

  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState<ApiMedication[]>([]);
  const [appts, setAppts] = useState<ApiAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  /* ---------- Fetch data ---------- */
  const fetchData = useCallback(async () => {
    if (!caregiverId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [medData, apptData] = await Promise.all([
        canViewMedications
          ? fetch(`/api/medications?patientProfileId=${caregiverId}`).then((r) =>
              r.json()
            )
          : Promise.resolve([]),
        canViewAppointments
          ? fetch(`/api/appointments?patientProfileId=${caregiverId}`).then((r) =>
              r.json()
            )
          : Promise.resolve([]),
      ]);
      setMeds(medData);
      setAppts(apptData);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, [caregiverId, canViewMedications, canViewAppointments]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  /* ---------- Build date-keyed buckets ---------- */
  const buckets = useMemo<Record<string, DayBucket>>(() => {
    const b: Record<string, DayBucket> = {};
    const key = (d: Date) => format(d, "yyyy-MM-dd");
    const ensure = (d: Date) => {
      const k = key(d);
      if (!b[k]) b[k] = { medications: [], appointments: [] };
      return b[k];
    };
    if (canViewMedications) {
      meds.forEach((m) => {
        const d = parseISO(m.startDate);
        ensure(d).medications.push({
          id: m.id,
          name: m.name,
          time: format(d, "HH:mm"),
          dose: m.dosage,
          type: m.type,
        });
      });
    }
    if (canViewAppointments) {
      appts.forEach((a) => {
        const d = parseISO(a.dateTime);
        ensure(d).appointments.push({
          id: a.id,
          title: a.title,
          time: format(d, "HH:mm"),
          location: a.location ?? undefined,
          status: a.status,
        });
      });
    }
    return b;
  }, [meds, appts, canViewMedications, canViewAppointments]);

  /* ---------- Compute calendar days ---------- */
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    let days = eachDayOfInterval({ start, end });
    const padStart = getDay(start); // 0=Sun…6=Sat
    if (padStart > 0) {
      days = [
        ...Array.from({ length: padStart }, (_, i) => addDays(start, i - padStart)),
        ...days,
      ];
    }
    const padEnd = 6 - getDay(end);
    if (padEnd > 0) {
      days = [...days, ...Array.from({ length: padEnd }, (_, i) => addDays(end, i + 1))];
    }
    return days;
  }, [currentMonth]);

  /* ---------- Handlers ---------- */
  const prevMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    setCurrentMonth(t);
    setSelectedDay(t);
  };

  /* ---------- Loading / errors / permissions ---------- */
  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Cargando calendario…</p>
      </div>
    );
  }

  if (!caregiverId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            Este cuidador no tiene aún un perfil asignado.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canViewMedications && !canViewAppointments) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            No tiene permisos para ver ni medicamentos ni citas como cuidador.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Calendario del Cuidador</h1>
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/10 py-3 flex justify-between">
          <CardTitle className="flex items-center text-lg">
            <CalendarIcon className="mr-2 h-5 w-5" />
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </CardTitle>
          <div className="space-x-2">
            <Button size="sm" variant="outline" onClick={prevMonth}>
              Anterior
            </Button>
            <Button size="sm" variant="outline" onClick={goToday}>
              Hoy
            </Button>
            <Button size="sm" variant="outline" onClick={nextMonth}>
              Siguiente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 bg-muted/20 text-center text-sm font-medium">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d} className="p-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const bucket = buckets[key];
              const inMonth = day.getMonth() === currentMonth.getMonth();
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "h-24 border-r border-b p-1.5 relative cursor-pointer hover:bg-muted/30",
                    !inMonth && "bg-muted/10 text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "absolute right-1 top-1 h-6 w-6 flex items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground font-semibold",
                      selectedDay && isSameDay(day, selectedDay) && "ring-2 ring-primary"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {!!bucket && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                          {canViewAppointments && bucket.appointments.length > 0 && (
                            <Badge
                              variant="outline"
                              className="w-full justify-start bg-blue-500/10 text-blue-600 border-blue-600/20 text-xxs"
                            >
                              <Stethoscope className="h-3 w-3 mr-1" />
                              {bucket.appointments.length} cita
                            </Badge>
                          )}
                          {canViewMedications && bucket.medications.length > 0 && (
                            <Badge
                              variant="outline"
                              className="w-full justify-start bg-green-500/10 text-green-600 border-green-600/20 text-xxs"
                            >
                              <Pill className="h-3 w-3 mr-1" />
                              {bucket.medications.length} med.
                            </Badge>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-0">
                        <div className="border-b p-3 font-medium">
                          {format(day, "PPP", { locale: es })}
                        </div>
                        <ScrollArea className="h-[240px]">
                          <div className="p-3 space-y-3">
                            {canViewAppointments &&
                              bucket.appointments.map((a) => (
                                <div key={`a-${a.id}`} className="border rounded-md p-2 text-xs">
                                  <div className="font-medium text-blue-700 flex items-center">
                                    <Stethoscope className="h-3 w-3 mr-1" />
                                    {a.title}
                                  </div>
                                  <div className="text-muted-foreground ml-4">
                                    {a.time}
                                    {a.location && ` – ${a.location}`}
                                  </div>
                                </div>
                              ))}
                            {canViewMedications &&
                              bucket.medications.map((m) => (
                                <div key={`m-${m.id}`} className="border rounded-md p-2 text-xs">
                                  <div className="font-medium text-green-700 flex items-center">
                                    <Pill className="h-3 w-3 mr-1" />
                                    {m.name}
                                  </div>
                                  <div className="text-muted-foreground ml-4">
                                    {m.dose} – {m.time}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}