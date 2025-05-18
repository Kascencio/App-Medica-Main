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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Pill, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

interface MedicationData {
  id: number;
  patientProfileId: number;
  name: string;
  dosage: string;
  type: string;
  frequency: "daily" | "weekly" | "custom";
  startDate: string;
  endDate?: string;
  notes?: string;
}

export default function MedicationsPage() {
  const { user } = useAuth();
  // Modificamos la obtención del patientProfileId
  const defaultPatientId = 1; // Valor predeterminado en caso de que no haya ID
  const pid =
    (user as any)?.patientId ??
    (user?.role === "PATIENT" ? (user as any)?.profileId : undefined) ?? 
    defaultPatientId;

  const { toast } = useToast();

  /* ---------------- state ---------------- */
  const [medications, setMedications] = useState<MedicationData[]>([]);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    type: "",
    frequency: "daily" as "daily" | "weekly" | "custom",
    notes: "",
  });

  /* ---------------- fetch existing ---------------- */
  useEffect(() => {
    if (pid) {
      fetchMedications();
    } else {
      console.log("Esperando ID de paciente...");
    }
  }, [pid]);

  const fetchMedications = async () => {
    try {
      // Siempre usamos el pid (ahora tiene un valor predeterminado)
      const response = await fetch(`/api/medications?patientProfileId=${pid}`);
      if (response.ok) {
        const data = await response.json();
        setMedications(data);
      } else {
        console.error("Error fetching medications");
        toast({
          title: "Error",
          description: "No se pudieron cargar los medicamentos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching medications:", error);
      toast({
        title: "Error",
        description: "Error al cargar los medicamentos",
        variant: "destructive",
      });
    }
  };

  /* ---------------- helpers ---------------- */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSelectChange = (value: "daily" | "weekly" | "custom") => {
    setForm((p) => ({ ...p, frequency: value }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      dosage: "",
      type: "",
      frequency: "daily",
      notes: "",
    });
    setStartDate(undefined);
  };

  /* ---------------- submit new medication ---------------- */
  const submitMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate) {
      toast({
        title: "Error",
        description: "Debe seleccionar una fecha de inicio",
        variant: "destructive",
      });
      return;
    }
    
    const body = {
      patientProfileId: pid, // Ahora siempre tendrá un valor
      name: form.name,
      dosage: form.dosage,
      type: form.type,
      frequency: form.frequency,
      startDate: startDate.toISOString(),
      notes: form.notes || undefined,
    };

    try {
      const res = await fetch("/api/medications", {
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

      const created: MedicationData = await res.json();
      setMedications((m) => [...m, created]);
      resetForm();
      setOpen(false);
      toast({ title: "Medicamento agregado" });
    } catch (error) {
      console.error("Error creating medication:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el medicamento",
        variant: "destructive",
      });
    }
  };

  /* ---------------- delete ---------------- */
  const deleteMedication = async (id: number) => {
    try {
      const res = await fetch(`/api/medications/${id}`, { method: "DELETE" });
      
      if (res.ok) {
        setMedications((m) => m.filter((med) => med.id !== id));
        toast({ title: "Medicamento eliminado" });
      } else {
        toast({ 
          title: "Error", 
          description: "No se pudo eliminar el medicamento",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error deleting medication:", error);
      toast({ 
        title: "Error", 
        description: "Error al eliminar el medicamento",
        variant: "destructive" 
      });
    }
  };

  /* ---------------- render frequency text ---------------- */
  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case "daily": return "Diario";
      case "weekly": return "Semanal";
      case "custom": return "Personalizado";
      default: return frequency;
    }
  };

  /* ---------------- render medication type ---------------- */
  const getMedicationType = (type: string) => {
    switch (type.toLowerCase()) {
      case "oral": return "Oral";
      case "liquid": return "Líquido";
      case "injection": return "Inyección";
      case "topical": return "Tópico";
      case "inhaler": return "Inhalador";
      default: return type;
    }
  };

  /* ---------------- render ---------------- */
  return (
    <div className="space-y-6">
      {/* header + dialog */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <h1 className="text-2xl font-bold">Medicamentos</h1>
        {pid && (
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Medicamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={submitMedication}>
              <DialogHeader>
                <DialogTitle>Nuevo Medicamento</DialogTitle>
                <DialogDescription>Complete la información del medicamento</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del medicamento</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Nombre del medicamento"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosis</Label>
                    <Input
                      id="dosage"
                      name="dosage"
                      placeholder="Ej: 500mg"
                      value={form.dosage}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Input
                      id="type"
                      name="type"
                      placeholder="Ej: Oral, Líquido"
                      value={form.type}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frecuencia</Label>
                  <Select 
                    value={form.frequency} 
                    onValueChange={(value: any) => handleSelectChange(value)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Seleccione frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Fecha de inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate
                          ? format(startDate, "PPP", { locale: es })
                          : "Seleccionar fecha"}
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Notas adicionales (opcional)"
                    value={form.notes}
                    onChange={handleChange}
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
      
      {/* list */}
      <div className="grid gap-4">
        {medications.length > 0 ? (
          medications.map((med) => (
            <Card key={med.id}>
              <CardContent className="p-6 space-y-2">
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{med.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {med.dosage} - {getMedicationType(med.type)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteMedication(med.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-secondary/50 rounded-full px-3 py-1">
                    {getFrequencyText(med.frequency)}
                  </span>
                  <span className="bg-secondary/50 rounded-full px-3 py-1">
                    Desde: {format(new Date(med.startDate), "PPP", { locale: es })}
                  </span>
                </div>
                
                {med.notes && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Notas</h4>
                    <div className="border p-2 rounded-md text-xs mt-1">
                      <p>{med.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No hay medicamentos registrados
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}