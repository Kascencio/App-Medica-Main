
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ClipboardList, Plus, Trash2 } from "lucide-react";

interface Treatment {
  id: number;
  patientProfileId: number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress?: string | null;
}

export default function CaregiverTreatmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast(); // Corregido aquí - desestructurando toast correctamente
  // Este es el profileId del paciente al que cuida
  const pid = user?.patientId;

  const [list, setList] = useState<Treatment[]>([]);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [form, setForm] = useState({ title: "", description: "", progress: "" });

  // Carga inicial de tratamientos
  useEffect(() => {
    if (!pid) return
    const ctrl = new AbortController()
    
    console.log("Cargando tratamientos para paciente:", pid) // Para debugging

    fetch(`/api/treatments?patientProfileId=${pid}`, { 
      signal: ctrl.signal,
      // Asegurarse de enviar cualquier token de autenticación si es necesario
      // headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => {
        console.log("Status de carga:", r.status)
        if (!r.ok) {
          return Promise.reject(`Error ${r.status}`)
        }
        return r.json()
      })
      .then(data => {
        console.log("Tratamientos cargados:", data)
        setList(data)
      })
      .catch((err) => {
        console.error("Error al cargar tratamientos:", err)
        toast({ 
          title: "Error", 
          description: "No se pudieron cargar los tratamientos", 
          variant: "destructive" 
        })
      })

    return () => ctrl.abort()
  }, [pid, toast])

  // Handlers de formulario
  const updateForm = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const resetForm = () => {
    setForm({ title: "", description: "", progress: "" });
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Crear tratamiento
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid) {
      toast({ title:"Sin perfil", variant:"destructive" })
      return
    }

    // Crea el cuerpo de la solicitud usando null para valores vacíos
    // en lugar de undefined, que podría ser mejor soportado por la API
    const body = {
      patientProfileId: pid,
      title: form.title,
      description: form.description || null,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      progress: form.progress || null,
    }

    console.log("Enviando tratamiento:", body) // Para debugging

    try {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Asegurarse de enviar cualquier token de autenticación si es necesario
          // "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(body),
      })

      // Log completo de la respuesta para diagnóstico
      console.log("Status:", res.status)
      
      const responseData = await res.json()
      console.log("Respuesta:", responseData)
      
      if (!res.ok) {
        toast({ 
          title: "Error", 
          description: responseData.error || `Error ${res.status}: No se pudo guardar`, 
          variant: "destructive" 
        })
        return
      }

      setList(l => [...l, responseData])
      resetForm()
      setOpen(false)
      toast({ title: "Tratamiento agregado" })
    } catch (error) {
      console.error("Error al guardar tratamiento:", error)
      toast({ 
        title: "Error", 
        description: "Ocurrió un error al procesar la solicitud", 
        variant: "destructive" 
      })
    }
  };

  // Eliminar tratamiento
  const handleDelete = async (id: number) => {
    try {
      console.log("Eliminando tratamiento:", id) // Para debugging
      
      const res = await fetch(`/api/treatments/${id}`, { 
        method: "DELETE",
        // Asegurarse de enviar cualquier token de autenticación si es necesario
        // headers: { "Authorization": `Bearer ${token}` }  
      });
      
      console.log("Status de eliminación:", res.status)
      
      if (!res.ok) {
        let errorMsg = "No se pudo eliminar el tratamiento";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
          console.log("Error data:", errorData);
        } catch (e) {
          console.log("No se pudo obtener detalles del error");
        }
        
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }
      
      setList((l) => l.filter((t) => t.id !== id));
      toast({ title: "Tratamiento eliminado" });
    } catch (error) {
      console.error("Error al eliminar tratamiento:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la solicitud de eliminación",
        variant: "destructive",
      });
    }
  };

  // Loading / permisos
  if (authLoading) {
    return <p className="text-center py-8">Cargando…</p>;
  }
  if (user?.role !== "CAREGIVER") {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>Solo cuidadores pueden ver esto.</AlertDescription>
      </Alert>
    );
  }
  if (!user.permissions?.viewTreatments) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Permiso Denegado</AlertTitle>
        <AlertDescription>
          El paciente no ha compartido sus tratamientos contigo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header + Nuevo */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tratamientos de {user.patientName}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Agregar Tratamiento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Nuevo Tratamiento</DialogTitle>
                <DialogDescription>
                  Complete la información del tratamiento
                </DialogDescription>
              </DialogHeader>
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
                        className={cn(
                          "justify-start",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate
                          ? format(startDate, "PPP", { locale: es })
                          : "Inicio"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP", { locale: es }) : "Fin (opcional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={es}
                      />
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

      {/* Lista */}
      <div className="grid gap-4">
        {list.length === 0 ? (
          <Card>
            <CardContent className="text-center text-muted-foreground p-6">
              No hay tratamientos registrados.
            </CardContent>
          </Card>
        ) : (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {t.description && <p className="text-sm">{t.description}</p>}
                {t.startDate && (
                  <p className="text-xs text-muted-foreground">
                    Inicio:{" "}
                    {format(new Date(t.startDate), "PPP", { locale: es })}
                    {t.endDate &&
                      ` · Fin: ${format(
                        new Date(t.endDate),
                        "PPP",
                        { locale: es }
                      )}`}
                  </p>
                )}
                {t.progress && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Progreso</h4>
                    <div className="border p-2 rounded-md text-xs mt-1 whitespace-pre-wrap">
                      {t.progress}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}