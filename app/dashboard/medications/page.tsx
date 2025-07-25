"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast"
import { es } from "date-fns/locale";
import { CalendarIcon, Pill, Plus, Edit3, Trash2 } from "lucide-react";

interface MedicationData {
  id: number;
  patientProfileId: number;
  name: string;
  dosage: string;
  type:  "Oral" | "Inyectable" | "Tópico";
  frequency: "daily" | "weekly" | "custom";
  startDate: string;
  notes?: string;
}

export default function MedicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast().toast;

  const pid = user?.profileId;
  const [meds, setMeds] = useState<MedicationData[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Notificaciones locales ──────────────────────────────────────────
  const notificationTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission().then((perm) => console.log("Notification permission:", perm));
    }
  }, []);

// ─── Notificaciones push via servidor ────────────────────────────────
useEffect(() => {
  notificationTimeouts.current.forEach(clearTimeout);
  notificationTimeouts.current = [];

  meds.forEach((med) => {
    const notifyTime = new Date(med.startDate).getTime();
    const delay = notifyTime - Date.now();
    if (delay > 0) {
      const t = setTimeout(async () => {
        // 1) Llamada al servidor para enviar el push
        try {
          await fetch('/api/sendPush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Hora de tomar: ${med.name}`,
              body: `Dosis: ${med.dosage}`
            })
          });
        } catch (err) {
          console.error('Error enviando push:', err);
        }

        // 2) Toast local como respaldo
        toast({
          title: `Hora de tomar: ${med.name}`,
          description: `Dosis: ${med.dosage}`,
        });
      }, delay);

      notificationTimeouts.current.push(t);
    }
  });

  return () => {
    notificationTimeouts.current.forEach(clearTimeout);
    notificationTimeouts.current = [];
  };
}, [meds, toast]);


  // ─── Fetch medicamentos ───────────────────────────────────────────────
  const fetchMedications = async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/medications?patientProfileId=${pid}`);
      if (!res.ok) throw new Error("Failed to load");
      setMeds(await res.json());
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudieron cargar los medicamentos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchMedications();
  }, [authLoading, pid]);

  // ─── Create Dialog State ────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", dosage: "" , type: "Oral" as "Oral" | "Inyectable" | "Topico", frequency: "Diario" as "Diario" | "Semanal" | "custom", notes: "" });
  const [createStart, setCreateStart] = useState<Date>();
  const [createTime, setCreateTime] = useState<string>("");

  const resetCreate = () => {
    setCreateForm({ name: "", dosage: "", type: "Oral", frequency: "Diario", notes: "" });
    setCreateStart(undefined);
    setCreateTime("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid || !createStart || !createTime) {
      toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" });
      return;
    }
    const [h, m] = createTime.split(":").map(Number);
    const dt = new Date(createStart);
    dt.setHours(h, m);

    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientProfileId: pid, ...createForm, startDate: dt.toISOString() }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      await fetchMedications();
      resetCreate();
      setCreateOpen(false);
      toast({ title: "Medicamento creado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ─── Edit Dialog State ──────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [medToEdit, setMedToEdit] = useState<MedicationData | null>(null);
  const [editForm, setEditForm] = useState({ name: "", dosage: "", type: "Oral" as "Oral" | "Inyectable" | "Topico", frequency: "Diario" as "Diario" | "Semanal" | "custom", notes: "" });
  const [editStart, setEditStart] = useState<Date>();
  const [editTime, setEditTime] = useState<string>("");

  const openEdit = (med: MedicationData) => {
    setMedToEdit(med);
    setEditForm({ name: med.name, dosage: med.dosage, type: med.type === "Tópico" ? "Topico" : med.type, frequency: med.frequency === "daily" ? "Diario" : med.frequency === "weekly" ? "Semanal" : med.frequency, notes: med.notes || "" });
    const dt = new Date(med.startDate);
    setEditStart(dt);
    setEditTime(dt.toTimeString().slice(0, 5));
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medToEdit || !editStart || !editTime) return;
    const [h, m] = editTime.split(":").map(Number);
    const dt = new Date(editStart);
    dt.setHours(h, m);

    try {
      const res = await fetch(`/api/medications/${medToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, startDate: dt.toISOString() }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      await fetchMedications();
      setEditOpen(false);
      toast({ title: "Medicamento actualizado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────
  const deleteMed = async (id: number) => {
    try {
      const res = await fetch(`/api/medications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMeds((ms) => ms.filter((m) => m.id !== id));
      toast({ title: "Medicamento eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return <p className="p-8 text-center text-muted-foreground">Cargando…</p>;
  }
  return (
    <div className="space-y-6 p-4">
      {/* Header + Create */}
      <div className="flex justify-between items-center">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent className="-mt-36 max-h-[54vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Medicamento</DialogTitle>
              <DialogDescription>
                Completa la información para crear un medicamento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Dosis</Label>
                  <Input
                    value={createForm.dosage}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, dosage: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(v) =>
                      setCreateForm((f) => ({ ...f, type: v as any }))
                    }
                    required
                  > <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oral">Oral</SelectItem>
                      <SelectItem value="Inyectable">Inyectable</SelectItem>
                      <SelectItem value="Topico">Topico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frecuencia</Label>
                  <Select
                    value={createForm.frequency}
                    onValueChange={(v) =>
                      setCreateForm((f) => ({ ...f, frequency: v as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="custom">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start",
                          !createStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createStart
                          ? format(createStart, "PPP", { locale: es })
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={createStart}
                        onSelect={setCreateStart}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={createTime}
                  onChange={(e) => setCreateTime(e.target.value)}
                  required
                />
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={createForm.notes}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, notes: e.target.value }))
                    }
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
        <DialogTrigger asChild>
          {/* we'll open programmatically via openEdit() */}
          <span />
        </DialogTrigger>
        <DialogContent className="-mt-36 max-h-[54vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Medicamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label>Dosis</Label>
                <Input
                  value={editForm.dosage}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, dosage: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(e) =>
                    setEditForm((f) => ({ ...f, type: e as any }))
                  }
                  required
                >
                   <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oral">Oral</SelectItem>
                      <SelectItem value="Inyectable">Inyectable</SelectItem>
                      <SelectItem value="Topico">Topico</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              <div>
                <Label>Frecuencia</Label>
                <Select
                  value={editForm.frequency}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, frequency: v as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diaria</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start",
                        !editStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editStart
                        ? format(editStart, "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editStart}
                      onSelect={setEditStart}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                 <Label>Hora</Label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, notes: e.target.value }))
                  }
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {meds.map((med) => (
          <Card key={med.id}>
            <CardHeader className="bg-primary/5 pb-2">
              <div className="flex items-center justify-between">
                <CardContent className="flex items-center text-base">
                  <Pill className="mr-2 h-4 w-4" />
                  {med.name}
                </CardContent>
                <div className="flex space-x-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openEdit(med)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteMed(med.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Dosis:</span>
                <span className="text-sm">{med.dosage}</span>
                <span className="text-sm">Tipo: {med.type}</span>
                <span className="text-sm">Hora:</span>
                <span className="text-sm">{format(new Date(med.startDate),"HH:mm")}</span>
              </div>
              <div>
                  <span className="text-sm">Frecuencia: {med.frequency}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground pt-2">
                <span>
                  Fecha:{" "}
                  {format(new Date(med.startDate), "d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </span>
              </div>
              {med.notes && (
                <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                  {med.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
