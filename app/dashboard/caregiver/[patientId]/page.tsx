"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  FileText,
  Pill,
  User,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface PatientProfile {
  id: number;
  name: string | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  bloodType: string | null;
  conditions: string | null;
  allergies: string | null;
  contraindications: string | null;
  photoUrl: string | null;
}
interface Medication {
  id: number;
  name: string;
  dosage: string;
  type: string;
  nextDose: string; // ISO
}
interface Appointment {
  id: number;
  doctorName: string;
  specialty: string | null;
  dateTime: string; // ISO
}
interface Treatment {
  id: number;
  title: string;
  description: string | null;
}
interface Note {
  id: number;
  title: string;
  content: string;
  date: string; // ISO
}

export default function CaregiverDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { patientId } = useParams<{ patientId: string }>();
  const pid = parseInt(patientId!, 10);
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar que sea caregiver
    if (!user || user.role !== "CAREGIVER") {
      router.replace("/dashboard");
      return;
    }

    // Cargar datos del paciente ‘pid’
    const fetchAll = async () => {
      if (!pid) return;
      try {
        setError(null);
        setLoading(true);

        // 1) Comprobar que tenga permiso (opcional: se puede crear ruta dedicada para verificar)
        //    Si no, redirigir de nuevo a /dashboard/caregiver

        const [patientRes, medsRes, apptRes, treatRes, notesRes] = await Promise.all([
          fetch(`/api/patients/${pid}`),
          fetch(`/api/medications?patientProfileId=${pid}`),
          fetch(`/api/appointments?patientProfileId=${pid}`),
          fetch(`/api/treatments?patientProfileId=${pid}`),
          fetch(`/api/notes?patientProfileId=${pid}`),
        ]);

        if (!patientRes.ok) throw new Error("Error cargando paciente");
        if (!medsRes.ok) throw new Error("Error cargando medicamentos");
        if (!apptRes.ok) throw new Error("Error cargando citas");
        if (!treatRes.ok) throw new Error("Error cargando tratamientos");
        if (!notesRes.ok) throw new Error("Error cargando notas");

        setPatient(await patientRes.json());
        setMedications(await medsRes.json());
        setAppointments(await apptRes.json());
        setTreatments(await treatRes.json());
        setNotes(await notesRes.json());
      } catch (e: any) {
        console.error("[CG-dashboard] fetch error:", e);
        setError(e.message || "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [pid, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Cargando información…</p>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!pid) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sin paciente seleccionado</AlertTitle>
        <AlertDescription>
          Elige un paciente de la lista:{" "}
          <Link href="/dashboard/caregiver" className="underline">
            volver atrás
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Cuidador</h1>
        <p className="text-muted-foreground">
          Gestionando a&nbsp;
          <span className="font-medium">{patient?.name || "Paciente"}</span>
        </p>
      </header>

      {/* Información del paciente */}
      <Card>
        <CardHeader className="bg-primary/5 pb-2">
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Información del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {patient ? (
            <div className="grid gap-4 md:grid-cols-3">
              <dl className="space-y-2 md:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Nombre</dt>
                <dd className="col-span-2 break-words">{patient.name ?? "—"}</dd>
                <dt className="text-sm font-medium text-muted-foreground">Edad</dt>
                <dd className="col-span-2 break-words">{patient.age != null ? patient.age + " años" : "—"}</dd>
                <dt className="text-sm font-medium text-muted-foreground">Sexo</dt>
                <dd className="col-span-2 break-words">
                  {patient.sex === "male"
                    ? "Masculino"
                    : patient.sex === "female"
                    ? "Femenino"
                    : "Otro"}
                </dd>
                <dt className="text-sm font-medium text-muted-foreground">Tipo de sangre</dt>
                <dd className="col-span-2 break-words">{patient.bloodType ?? "—"}</dd>
                <dt className="text-sm font-medium text-muted-foreground">Condiciones</dt>
                <dd className="col-span-2 break-words">{patient.conditions ?? "Ninguna"}</dd>
                <dt className="text-sm font-medium text-muted-foreground">Alergias</dt>
                <dd className="col-span-2 break-words">{patient.allergies ?? "Ninguna"}</dd>
                <dt className="text-sm font-medium text-muted-foreground">Contraindicaciones</dt>
                <dd className="col-span-2 break-words">{patient.contraindications ?? "Ninguna"}</dd>
              </dl>
              <div className="flex items-center justify-center">
                {patient.photoUrl ? (
                  <img
                    src={patient.photoUrl}
                    alt="Foto"
                    className="h-32 w-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Aquí irían tus listas de “Medicamentos próximos”, “Citas próximas”, etc. */}
    </div>
  );
}
