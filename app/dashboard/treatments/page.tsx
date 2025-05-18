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
import { CalendarIcon, ClipboardList, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

interface TreatmentData {
  id: number;
  patientProfileId: number;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  progress?: string;
}

export default function TreatmentsPage() {
  const { user } = useAuth();
  const pid =
    (user as any)?.patientId ??
    (user?.role === "PATIENT" ? (user as any)?.profileId : undefined);

  const { toast } = useToast();

  /* ---------------- state ---------------- */
  const [treatments, setTreatments] = useState<TreatmentData[]>([]);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [form, setForm] = useState({
    title: "",
    description: "",
    progress: "",
  });

  /* ---------------- fetch existing ---------------- */
  useEffect(() => {
    fetchTreatments();
  }, []);

  const fetchTreatments = async () => {
    try {
      const response = await fetch(`/api/treatments`);
      if (response.ok) {
        const data = await response.json();
        setTreatments(data);
      } else {
        console.error("Error fetching treatments");
      }
    } catch (error) {
      console.error("Error fetching treatments:", error);
    }
  };

  /* ---------------- helpers ---------------- */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const resetForm = () => {
    setForm({ title: "", description: "", progress: "" });
    setStartDate(undefined);
    setEndDate(undefined);
  };

  /* ---------------- submit new treatment ---------------- */
  const submitTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const body = {
      patientProfileId: pid || 1, // Usamos 1 como valor predeterminado si no hay pid
      title: form.title,
      description: form.description || undefined,
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined,
      progress: form.progress || undefined,
    };

    try {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast({
          title: "Error",
          description: errorData.error || "No se pudo guardar",
          variant: "destructive",
        });
        return;
      }

      const created: TreatmentData = await res.json();
      setTreatments((t) => [...t, created]);
      resetForm();
      setOpen(false);
      toast({ title: "Tratamiento agregado" });
    } catch (error) {
      console.error("Error creating treatment:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el tratamiento",
        variant: "destructive",
      });
    }
  };

  /* ---------------- delete ---------------- */
  const deleteTreatment = async (id: number) => {
    try {
      const res = await fetch(`/api/treatments/${id}`, { method: "DELETE" });
      
      if (res.ok) {
        setTreatments((t) => t.filter((tr) => tr.id !== id));
        toast({ title: "Tratamiento eliminado" });
      } else {
        toast({ 
          title: "Error", 
          description: "No se pudo eliminar el tratamiento",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error deleting treatment:", error);
      toast({ 
        title: "Error", 
        description: "Error al eliminar el tratamiento",
        variant: "destructive" 
      });
    }
  };

  /* ---------------- render ---------------- */
  return (
    <div className="space-y-6">
      {/* header + dialog */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <h1 className="text-2xl font-bold">Tratamientos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Tratamiento
            </Button>
          </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={submitTreatment}>
                <DialogHeader>
                  <DialogTitle>Nuevo Tratamiento</DialogTitle>
                  <DialogDescription>Complete la información</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input
                    name="title"
                    placeholder="Título del tratamiento"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />
                  <Textarea
                    name="description"
                    placeholder="Descripción"
                    value={form.description}
                    onChange={handleChange}
                  />
                  
                  {/* Fechas */}
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
                            : "Fecha inicio"}
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
                          {endDate
                            ? format(endDate, "PPP", { locale: es })
                            : "Fecha fin (opcional)"}
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
                    placeholder="Progreso (opcional)"
                    value={form.progress}
                    onChange={handleChange}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
      </div>
      
      {/* list */}
      <div className="grid gap-4">
        {treatments.length > 0 ? (
          treatments.map((t) => (
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
                    onClick={() => deleteTreatment(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {t.description && (
                  <p className="text-sm">{t.description}</p>
                )}
                
                {t.startDate && (
                  <p className="text-xs text-muted-foreground">
                    Inicio: {format(new Date(t.startDate), "PPP", { locale: es })}
                    {t.endDate && ` - Fin: ${format(new Date(t.endDate), "PPP", { locale: es })}`}
                  </p>
                )}
                
                {t.progress && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Progreso</h4>
                    <div className="border p-2 rounded-md text-xs mt-1">
                      <p>{t.progress}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No hay tratamientos
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}