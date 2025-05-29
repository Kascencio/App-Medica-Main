// app/dashboard/appointments/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Stethoscope,
} from "lucide-react";

interface Appointment {
  id: number;
  patientProfileId: number;
  title: string;        // will store doctorName
  description?: string; // we'll pack specialty + "\n" + notes here
  dateTime: string;     // ISO
  location: string;
}

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // patientProfileId from JWT
  const pid = user?.profileId;

  // all appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Fetch list ─────────────────────────────────────────────────────────
  const fetchAppointments = async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?patientProfileId=${pid}`);
      if (!res.ok) throw new Error();
      setAppointments(await res.json());
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar citas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchAppointments();
  }, [authLoading, pid]);

  // ─── Create dialog state ─────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    doctorName: "",
    specialty: "",
    location: "",
    time: "",
    notes: "",
  });
  const [createDate, setCreateDate] = useState<Date>();

  const resetCreate = () => {
    setForm({ doctorName: "", specialty: "", location: "", time: "", notes: "" });
    setCreateDate(undefined);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid || !createDate || !form.time || !form.doctorName || !form.location) {
      toast({ title: "Error", description: "Complete todos los campos obligatorios", variant: "destructive" });
      return;
    }
    const dt = new Date(createDate);
    const [h, m] = form.time.split(":").map(Number);
    dt.setHours(h, m);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientProfileId: pid,
          title: form.doctorName,
          description: `Especialidad: ${form.specialty}\n${form.notes}`.trim(),
          dateTime: dt.toISOString(),
          location: form.location,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al crear");
      }
      await fetchAppointments();
      resetCreate();
      setCreateOpen(false);
      toast({ title: "Cita creada" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ─── Edit dialog state ───────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [toEdit, setToEdit] = useState<Appointment | null>(null);

  const openEdit = (app: Appointment) => {
    setToEdit(app);
    // parse existing into form
    const [specLine, ...noteLines] = (app.description || "").split("\n");
    setForm({
      doctorName: app.title,
      specialty: specLine.replace(/^Especialidad: */,""),
      location: app.location,
      time: format(new Date(app.dateTime), "HH:mm"),
      notes: noteLines.join("\n"),
    });
    setEditOpen(true);
    setCreateDate(new Date(app.dateTime));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEdit || !createDate || !form.time) return;
    const dt = new Date(createDate);
    const [h, m] = form.time.split(":").map(Number);
    dt.setHours(h, m);

    try {
      const res = await fetch(`/api/appointments/${toEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.doctorName,
          description: `Especialidad: ${form.specialty}\n${form.notes}`.trim(),
          dateTime: dt.toISOString(),
          location: form.location,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al actualizar");
      }
      await fetchAppointments();
      setEditOpen(false);
      toast({ title: "Cita actualizada" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const deleteAppointment = async (id: number) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAppointments((a) => a.filter((x) => x.id !== id));
      toast({ title: "Cita eliminada" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar cita", variant: "destructive" });
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return <p className="p-8 text-center text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header + Create */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Citas</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nueva cita
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Cita Médica</DialogTitle>
              <DialogDescription>Complete los datos de la cita</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Doctor</Label>
                  <Input
                    value={form.doctorName}
                    onChange={(e) => setForm((f) => ({ ...f, doctorName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Especialidad</Label>
                  <Input
                    value={form.specialty}
                    onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Ubicación</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start", !createDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {createDate
                            ? format(createDate, "PPP", { locale: es })
                            : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={createDate}
                          onSelect={setCreateDate}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild><span /></DialogTrigger>
        <DialogContent className="-mt-24 max-h-[67vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              {/* same fields as create */}
              <div>
                <Label>Doctor</Label>
                <Input
                  value={form.doctorName}
                  onChange={(e) => setForm((f) => ({ ...f, doctorName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Especialidad</Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start", !createDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createDate
                          ? format(createDate, "PPP", { locale: es })
                          : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={createDate}
                        onSelect={setCreateDate}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Actualizar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* List */}
      <div className="grid gap-4">
        {appointments.map((app) => {
          const dt = new Date(app.dateTime);
          return (
            <Card key={app.id}>
              <CardHeader className="bg-primary/5 flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  {app.title}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button size="icon" variant="outline" onClick={() => openEdit(app)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteAppointment(app.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    {format(dt, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    {format(dt, "HH:mm")}
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-4 w-4" />
                  {app.location}
                </div>
                {app.description && (
                  <p className="text-sm whitespace-pre-wrap">{app.description}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
