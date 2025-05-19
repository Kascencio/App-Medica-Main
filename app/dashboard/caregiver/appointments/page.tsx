"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { AlertCircle, Stethoscope, Calendar as CalendarIcon, Clock, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Appointment {
  id: number;
  doctorName: string;
  specialty?: string;
  dateTime: string;
  location: string;
  notes?: string;
}

export default function CaregiverAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // new‐appointment form state
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [form, setForm] = useState({
    doctorName: "",
    specialty: "",
    location: "",
    time: "",
    notes: "",
  });

  // fetch all
  const load = () => {
    if (!user || user.role !== "CAREGIVER" || !user.profileId) {
      setLoading(false);
      return;
    }
    fetch(`/api/appointments?patientProfileId=${user.profileId}`)
      .then(r => r.ok ? r.json() as Promise<Appointment[]> : Promise.reject())
      .then(setAppointments)
      .catch(err => {
        console.error(err);
        toast({ title: "Error", description: "No se pudieron cargar las citas", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <p className="text-center py-8">Cargando citas…</p>;
  }

  if (user?.role !== "CAREGIVER") {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="mr-2" />
        Área de cuidadores solamente.
      </Alert>
    );
  }

  if (!user.permissions?.viewAppointments) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="mr-2" />
        <AlertTitle>Sin permiso</AlertTitle>
        <AlertDescription>
          Pide al paciente que te otorgue acceso a las citas.
        </AlertDescription>
      </Alert>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({ title: "Error", description: "Selecciona fecha", variant: "destructive" });
      return;
    }
    const pid = user.profileId!;
    // combine date + time
    const [h, m] = form.time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(h, m);

    const body = {
      patientProfileId: pid,
      doctorName: form.doctorName,
      specialty: form.specialty || undefined,
      location: form.location,
      dateTime: dt.toISOString(),
      notes: form.notes || undefined,
    };

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Error", description: err.error || "No se pudo crear", variant: "destructive" });
      return;
    }
    setOpen(false);
    setForm({ doctorName: "", specialty: "", location: "", time: "", notes: "" });
    setDate(undefined);
    toast({ title: "Cita creada" });
    load();
  };

  const deleteAppt = async (id: number) => {
    const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
      return;
    }
    toast({ title: "Cita eliminada" });
    load();
  };

  // group by month
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );
  const grouped: Record<string, Appointment[]> = {};
  sorted.forEach(a => {
    const key = format(new Date(a.dateTime), "MMMM yyyy", { locale: es });
    (grouped[key] ||= []).push(a);
  });

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Citas {user.patientName}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Stethoscope className="mr-2" /> Agregar Cita</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Nueva Cita</DialogTitle>
                <DialogDescription>Completa la información</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Doctor</Label>
                  <Input name="doctorName" value={form.doctorName} onChange={handleChange} required />
                </div>
                <div className="grid gap-2">
                  <Label>Especialidad</Label>
                  <Input name="specialty" value={form.specialty} onChange={handleChange} />
                </div>
                <div className="grid gap-2">
                  <Label>Ubicación</Label>
                  <Input name="location" value={form.location} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(!date && "text-muted-foreground", "justify-start")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP", { locale: es }) : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} locale={es} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label>Hora</Label>
                    <Input type="time" name="time" value={form.time} onChange={handleChange} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notas</Label>
                  <Textarea name="notes" value={form.notes} onChange={handleChange} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(grouped).map(monthYear => (
        <div key={monthYear} className="space-y-4">
          <h2 className="capitalize text-xl font-semibold">{monthYear}</h2>
          <div className="space-y-4">
            {grouped[monthYear].map(appt => {
              const d = new Date(appt.dateTime);
              return (
                <Card key={appt.id}>
                  <CardContent className="p-4 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="text-primary" />
                        <h3 className=" text-cyan-400">{appt.doctorName}</h3>
                      </div>
                      {appt.specialty && <p className="text-sm text-muted-foreground">{appt.specialty}</p>}
                      <div className="text-sm text-muted-foreground flex space-x-4">
                        <span>
                          <CalendarIcon className="inline mr-1" />
                          {format(d, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                        </span>
                        <span>
                          <Clock className="inline mr-1" />
                          {format(d, "HH:mm", { locale: es })}
                        </span>
                        <span>
                          <MapPin className="inline mr-1" />
                          {appt.location}
                        </span>
                      </div>
                      {appt.notes && <p className="mt-2 text-sm bg-muted p-2 rounded">{appt.notes}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteAppt(appt.id)}>
                      <Trash2 />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
