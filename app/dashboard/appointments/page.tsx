"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

interface Appointment {
  id: number;
  patientProfileId: number;
  doctorName: string;
  specialty?: string;
  location: string;
  date: string; // ISO
  time: string;
  notes?: string;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  // Mejoramos la detección del ID del perfil de paciente
  const pid = user ? (
    // Primero intentamos usar patientId si existe
    (user as any)?.patientId || 
    // Luego profileId si el usuario es paciente
    (user.role === "PATIENT" ? user.profileId : undefined) ||
    // Como último recurso, usamos el ID del usuario si tiene rol de paciente
    (user.role === "PATIENT" ? user.id : undefined)
  ) : undefined;
  
  // Para depuración - muestra en consola los valores
  useEffect(() => {
    if (user) {
      console.log("Usuario:", user);
      console.log("PID detectado:", pid);
    }
  }, [user, pid]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [newAppointment, setNewAppointment] = useState({
    doctorName: "",
    specialty: "",
    location: "",
    time: "",
    notes: "",
  });
  const { toast } = useToast();

  /* -------------------- Load existing appointments -------------------- */
  useEffect(() => {
    if (!pid) return;
    const controller = new AbortController();
    fetch(`/api/appointments?patientProfileId=${pid}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        // Adapta los datos del backend al formato esperado por el frontend
        const adaptedData = data.map((item: any) => ({
          id: item.id,
          patientProfileId: item.patientProfileId,
          doctorName: item.title, // Título se usa como doctorName
          specialty: extractSpecialty(item.description),
          location: item.location || "",
          date: item.dateTime, // ISO
          time: formatTimeFromDate(new Date(item.dateTime)),
          notes: extractNotes(item.description),
        }));
        setAppointments(adaptedData);
      })
      .catch(console.error);
    return () => controller.abort();
  }, [pid]);

  // Función para extraer la especialidad de la descripción
  const extractSpecialty = (description?: string): string => {
    if (!description) return "";
    const match = description.match(/Especialidad: (.*?)(?:\n|$)/);
    return match ? match[1] : "";
  };

  // Función para extraer las notas excluyendo la especialidad
  const extractNotes = (description?: string): string => {
    if (!description) return "";
    return description.replace(/Especialidad: (.*?)(?:\n|$)/, "").trim();
  };

  // Función para formatear hora de una fecha
  const formatTimeFromDate = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewAppointment((p) => ({ ...p, [name]: value }));
  };

  /* -------------------- Submit new appointment -------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({
        title: "Error",
        description: "Seleccione fecha",
        variant: "destructive",
      });
      return;
    }
    
    // Determinar patientProfileId - si no tenemos pid, usamos el ID del usuario
    const patientProfileId = pid || user?.profileId || user?.id;
    
    if (!patientProfileId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el perfil de paciente",
        variant: "destructive",
      });
      return;
    }

    // Combina la fecha y la hora
    const appointmentDate = new Date(date);
    const [hours, minutes] = newAppointment.time.split(':').map(Number);
    appointmentDate.setHours(hours, minutes);

    const body = {
      patientProfileId: patientProfileId,
      doctorName: newAppointment.doctorName,
      specialty: newAppointment.specialty,
      location: newAppointment.location,
      dateTime: appointmentDate.toISOString(),
      time: newAppointment.time,
      notes: newAppointment.notes,
    };

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }));
        console.error("Error al crear cita:", errorData);
        toast({
          title: "Error",
          description: errorData.error || "No se pudo guardar la cita",
          variant: "destructive",
        });
        return;
      }
      
      const created: Appointment = await res.json();
      setAppointments((prev) => [...prev, created]);

      setNewAppointment({
        doctorName: "",
        specialty: "",
        location: "",
        time: "",
        notes: "",
      });
      setDate(undefined);
      setOpen(false);
      toast({
        title: "Cita agregada",
        description: "La cita ha sido agregada correctamente.",
      });
    } catch (error) {
      console.error("Error de red:", error);
      toast({
        title: "Error",
        description: "Error de conexión al guardar la cita",
        variant: "destructive",
      });
    }
  };

  const deleteAppointment = async (id: number) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || "Error al eliminar");
      }
      
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      
      toast({ 
        title: "Cita eliminada",
        description: "La cita ha sido eliminada correctamente."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la cita",
        variant: "destructive",
      });
    }
  };

  /* -------------------- Ordenar y agrupar -------------------- */
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const grouped: Record<string, Appointment[]> = {};
  sorted.forEach((a) => {
    const key = format(new Date(a.date), "MMMM yyyy", { locale: es });
    (grouped[key] ||= []).push(a);
  });
  
  return (
    <div className="space-y-6">
      {/* Header + Nuevo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Citas Médicas</h1>
        {/* Mostramos el botón si hay un usuario autenticado */}
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Agregar Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Agregar Nueva Cita</DialogTitle>
                  <DialogDescription>
                    Complete la información de la cita médica
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="doctorName">Nombre del Doctor</Label>
                    <Input
                      id="doctorName"
                      name="doctorName"
                      value={newAppointment.doctorName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="specialty">Especialidad</Label>
                    <Input
                      id="specialty"
                      name="specialty"
                      value={newAppointment.specialty}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Hospital/Clínica</Label>
                    <Input
                      id="location"
                      name="location"
                      value={newAppointment.location}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Fecha</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date
                              ? format(date, "PPP", { locale: es })
                              : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time">Hora</Label>
                      <Input
                        id="time"
                        name="time"
                        type="time"
                        value={newAppointment.time}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={newAppointment.notes}
                      onChange={handleChange}
                      placeholder="Motivo, preparación, etc."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {/* Listado */}
      <div className="space-y-6">
        {Object.keys(grouped).length ? (
          Object.entries(grouped).map(([monthYear, list]) => (
            <div key={monthYear} className="space-y-4">
              <h2 className="capitalize text-xl font-semibold">{monthYear}</h2>
              <div className="grid gap-4">
                {list.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col sm:flex-row items-start space-x-0 sm:space-x-4 space-y-4 sm:space-y-0">
                          <div className="rounded-full bg-primary/10 p-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                          </div>
                          <div className="w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                              <h3 className="font-medium">
                                {appointment.doctorName}
                              </h3>
                              <span className="text-sm text-muted-foreground">
                                {format(
                                  new Date(appointment.date),
                                  "EEEE d 'de' MMMM, yyyy",
                                  { locale: es }
                                )}
                              </span>
                            </div>
                            {appointment.specialty && (
                              <p className="text-sm text-muted-foreground">
                                {appointment.specialty}
                              </p>
                            )}
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Clock className="mr-1 h-4 w-4 flex-shrink-0" />
                                <span>{appointment.time}</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="mr-1 h-4 w-4 flex-shrink-0" />
                                <span>{appointment.location}</span>
                              </div>
                              {appointment.notes && (
                                <div className="mt-2 rounded-md bg-muted p-2">
                                  <p className="text-sm">{appointment.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAppointment(appointment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="mb-4 text-center text-muted-foreground">
                No hay citas médicas registradas
              </p>
              {user && (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Agregar Cita
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}