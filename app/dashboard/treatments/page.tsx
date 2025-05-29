"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ClipboardList, Plus, Trash2, Edit3 } from "lucide-react";

interface Treatment {
  id: number;
  patientProfileId: number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress?: string | null;
}

export default function TreatmentsPage() {
  const { user } = useAuth();
  const pid =
    (user as any)?.patientId ??
    (user?.role === "PATIENT" ? (user as any)?.profileId : undefined);

  const { toast } = useToast();

  // Lista de tratamientos
  const [list, setList] = useState<Treatment[]>([]);

  // Estados para crear nuevo tratamiento
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [form, setForm] = useState({ title: "", description: "", progress: "" });

  // Estados para editar tratamiento
  const [editOpen, setEditOpen] = useState(false);
  const [editTreatment, setEditTreatment] = useState<Treatment | null>(null);
  const [editStart, setEditStart] = useState<Date>();
  const [editEnd, setEditEnd] = useState<Date>();
  const [editForm, setEditForm] = useState({ title: "", description: "", progress: "" });

  // Cargar tratamientos
  useEffect(() => {
    if (!pid) return;
    const ctrl = new AbortController();

    fetch(`/api/treatments?patientProfileId=${pid}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setList)
      .catch(() =>
        toast({
          title: "Error",
          description: "No se pudieron cargar los tratamientos",
          variant: "destructive",
        })
      );

    return () => ctrl.abort();
  }, [pid, toast]);

  // Helpers
  const updateForm = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const reset = () => {
    setForm({ title: "", description: "", progress: "" });
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Crear tratamiento
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid) {
      toast({ title: "Sin perfil", variant: "destructive" });
      return;
    }

    const body = {
      patientProfileId: pid,
      title: form.title,
      description: form.description || undefined,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      progress: form.progress || undefined,
    };

    const res = await fetch("/api/treatments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Error", description: err.error || "No se pudo guardar", variant: "destructive" });
      return;
    }

    const created: Treatment = await res.json();
    setList((l) => [...l, created]);
    reset();
    setOpen(false);
    toast({ title: "Tratamiento agregado" });
  };

  // Eliminar tratamiento
  const remove = async (id: number) => {
    const res = await fetch(`/api/treatments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
      return;
    }
    setList((l) => l.filter((t) => t.id !== id));
    toast({ title: "Tratamiento eliminado" });
  };

  // Abrir diálogo edición y precargar datos
  const openEdit = (treatment: Treatment) => {
    setEditTreatment(treatment);
    setEditForm({
      title: treatment.title,
      description: treatment.description ?? "",
      progress: treatment.progress ?? "",
    });
    setEditStart(treatment.startDate ? new Date(treatment.startDate) : undefined);
    setEditEnd(treatment.endDate ? new Date(treatment.endDate) : undefined);
    setEditOpen(true);
  };

  // Actualizar tratamiento
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTreatment) return;

    const body = {
      title: editForm.title,
      description: editForm.description || undefined,
      progress: editForm.progress || undefined,
      startDate: editStart?.toISOString() || null,
      endDate: editEnd?.toISOString() || null,
    };

    try {
      const res = await fetch(`/api/treatments/${editTreatment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al actualizar");
      }
      const updated: Treatment = await res.json();
      setList((lst) => lst.map((t) => (t.id === updated.id ? updated : t)));
      toast({ title: "Tratamiento actualizado" });
      setEditOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y crear nuevo tratamiento */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tratamientos</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Agregar Tratamiento
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={save}>
              <DialogHeader>
                <DialogTitle>Nuevo Tratamiento</DialogTitle>
              </DialogHeader>
              <DialogDescription>Complete la información</DialogDescription>

              <div className="grid gap-4 py-4">
                <Input
                  name="title"
                  placeholder="Título"
                  value={form.title}
                  onChange={updateForm}
                  required
                />
                <Textarea
                  name="description"
                  placeholder="Descripción"
                  value={form.description}
                  onChange={updateForm}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("justify-start", !startDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP", { locale: es }) : "Inicio"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={es} />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("justify-start", !endDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP", { locale: es }) : "Fin (opcional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>

                <Textarea
                  name="progress"
                  placeholder="Progreso"
                  value={form.progress}
                  onChange={updateForm}
                />
              </div>

              <DialogFooter>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de tratamientos */}
      <div className="grid gap-4">
        {list.length ? (
          list.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-6 space-y-2">
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="rounded-full bg-primary/10 p-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">{t.title}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => remove(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {t.description && <p className="text-sm">{t.description}</p>}

                {t.startDate && (
                  <p className="text-xs text-muted-foreground">
                    Inicio: {format(new Date(t.startDate), "PPP", { locale: es })}
                    {t.endDate && ` · Fin: ${format(new Date(t.endDate), "PPP", { locale: es })}`}
                  </p>
                )}

                {t.progress && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Progreso</h4>
                    <div className="border p-2 rounded-md text-xs mt-1 whitespace-pre-wrap">{t.progress}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">No hay tratamientos</CardContent>
          </Card>
        )}
      </div>

      {/* Dialogo de edición */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="-mt-36 max-h-[58vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Tratamiento</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                required
              />

              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
              />

              <div className="grid grid-cols-1 gap-4">
                <Popover>
                   <span>Fecha de inicio</span>
                  <PopoverTrigger asChild>
                   
                    <Button
                      variant="outline"
                      className={cn("justify-start", !editStart && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-1 h-2 w-2" />
                      {editStart ? format(editStart, "PPP", { locale: es }) : "Inicio"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={editStart} onSelect={setEditStart} locale={es} />
                  </PopoverContent>
                </Popover>

                <Popover>
                     <span>Fecha de finalización</span>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start", !editEnd && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editEnd ? format(editEnd, "PPP", { locale: es }) : "Fin (opcional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={editEnd} onSelect={setEditEnd} locale={es} />
                  </PopoverContent>
                </Popover>
              </div>

              <Label htmlFor="edit-progress">Progreso</Label>
              <Textarea
                id="edit-progress"
                value={editForm.progress}
                onChange={(e) => setEditForm(f => ({ ...f, progress: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="submit">Actualizar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
