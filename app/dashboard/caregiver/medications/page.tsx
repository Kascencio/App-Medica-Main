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
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { AlertCircle, Clock, Pill } from "lucide-react";
import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ApiMed {
  id: number;
  name: string;
  dosage: string;
  type: string;
  frequency: "daily" | "weekly" | "custom";
  startDate: string;
  endDate?: string;
  notes?: string;
}
interface Med extends ApiMed {
  nextDose: Date;
}

export default function CaregiverMedicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [meds, setMeds] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role === "CAREGIVER") {
      const pid = user.profileId;
      if (!pid) {
        console.warn("No profileId on caregiver");
        setLoading(false);
        return;
      }

      fetch(`/api/medications?patientProfileId=${pid}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load");
          return res.json() as Promise<ApiMed[]>;
        })
        .then((data) => {
          const validMeds: Med[] = data
            .map((m) => ({
              ...m,
              nextDose: parseISO(m.startDate),
            }))
            .filter((m) => isValid(m.nextDose));
          setMeds(validMeds);
        })
        .catch((err) => console.error("Error loading meds:", err))
        .finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Cargando medicamentos…</p>
      </div>
    );
  }

  if (user?.role !== "CAREGIVER") {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="mr-2" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>Sección solo para cuidadores.</AlertDescription>
      </Alert>
    );
  }

  if (!user.permissions?.viewMedications) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="mr-2" />
        <AlertTitle>Permiso Denegado</AlertTitle>
        <AlertDescription>
          El paciente no le ha concedido permiso para ver sus medicamentos.
        </AlertDescription>
      </Alert>
    );
  }

  // sort by nextDose ascending
  const sorted = [...meds].sort(
    (a, b) => a.nextDose.getTime() - b.nextDose.getTime()
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Medicamentos de {user.patientName}
        </h1>
        {user.permissions.manageMedications && (
          <Link href="/dashboard/medications" passHref>
            <Button>Crear Medicamento</Button>
          </Link>
        )}
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground p-6">
            No hay medicamentos registrados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((med) => (
            <Card key={med.id}>
              <CardHeader className="bg-primary/5 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <Pill className="mr-2 h-4 w-4" />
                    {med.name}
                  </CardTitle>
                  <Badge variant="outline">
                    {med.frequency === "daily"
                      ? "Diaria"
                      : med.frequency === "weekly"
                      ? "Semanal"
                      : "Personalizada"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Dosis:</span>
                  <span className="text-sm">{med.dosage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tipo:</span>
                  <span className="text-sm">{med.type}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground pt-2">
                  <Clock className="mr-1 h-4 w-4 flex-shrink-0" />
                  <span>
                    Próxima dosis:{" "}
                    {format(med.nextDose, "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}{" "}
                    a las{" "}
                    {format(med.nextDose, "HH:mm", { locale: es })}
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
      )}
    </div>
  );
}
