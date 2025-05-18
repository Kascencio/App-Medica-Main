"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientCard } from "@/components/patient-card";
import { MedicalNotes } from "@/components/medical-notes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Calendar, ClipboardList, Pill } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

// Tipos auxiliares
interface Medication {
  id: number;
  name: string;
  type?: string;
  dose?: string;
  nextDose: string;
}

interface Appointment {
  id: number;
  doctorName: string;
  specialty?: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
}

interface Treatment {
  id: number;
  name: string;
  doctor?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  progress?: {
    id: number;
    date: string;
    notes?: string;
    sideEffects?: string;
  }[];
}

interface PatientData {
  id: number;
  name: string;
}

export function CaregiverView() {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper de fetch con AbortController
  const fetchWithAbort = async <T,>(
    url: string,
    signal: AbortSignal
  ): Promise<T> => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Fetch error");
    return res.json();
  };

  // Carga inicial de datos
  useEffect(() => {
    if (user?.role === "CAREGIVER" && (user as any).patientId) {
      const { patientId } = user as any;
      const controller = new AbortController();

      Promise.all([
        fetchWithAbort<PatientData>(
          `/api/patients/${patientId}`,
          controller.signal
        ).then(setPatientData),
        fetchWithAbort<Medication[]>(
          `/api/medications?patientProfileId=${patientId}`,
          controller.signal
        ).then(setMedications),
        fetchWithAbort<Appointment[]>(
          `/api/appointments?patientProfileId=${patientId}`,
          controller.signal
        ).then(setAppointments),
        fetchWithAbort<Treatment[]>(
          `/api/treatments?patientProfileId=${patientId}`,
          controller.signal
        ).then(setTreatments),
      ])
        .catch(console.error)
        .finally(() => setLoading(false));

      return () => controller.abort();
    }

    setLoading(false);
  }, [user]);

  // --------- Estados de carga / error ---------
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-center">
          <p className="text-muted-foreground">
            Cargando datos del paciente...
          </p>
        </div>
      </div>
    );
  }

  if (!(user as any)?.patientId) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No tiene acceso a ningún paciente. Por favor, contacte al
          administrador.
        </AlertDescription>
      </Alert>
    );
  }

  // --------- Cálculos de resumen ---------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcomingMedications = medications
    .filter((m) => {
      const n = new Date(m.nextDose);
      return n >= today && n < tomorrow;
    })
    .sort(
      (a, b) => new Date(a.nextDose).getTime() - new Date(b.nextDose).getTime()
    )
    .slice(0, 3);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingAppointments = appointments
    .filter((a) => {
      const d = new Date(a.date);
      return d >= today && d <= nextWeek;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // --------- UI ---------
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Panel de Cuidador -{" "}
          {patientData?.name || (user as any).patientName || "Paciente"}
        </h1>
      </div>

      <PatientCard />

      <Tabs defaultValue="overview" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="flex w-full sm:grid sm:grid-cols-4">
            <TabsTrigger value="overview" className="flex-1">
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="medications"
              className="flex-1"
              disabled={!user?.permissions?.viewMedications}
            >
              Medicamentos
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="flex-1"
              disabled={!user?.permissions?.viewAppointments}
            >
              Citas
            </TabsTrigger>
            <TabsTrigger
              value="treatments"
              className="flex-1"
              disabled={!user?.permissions?.viewTreatments}
            >
              Tratamientos
            </TabsTrigger>
          </TabsList>
        </ScrollArea>
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {user?.permissions?.viewMedications && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    Medicamentos Próximos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingMedications.length ? (
                    <ul className="space-y-2">
                      {upcomingMedications.map((med) => (
                        <li key={med.id} className="rounded-lg border p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="font-medium">{med.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(med.nextDose).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {med.dose} {med.type && `- ${med.type}`}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      No hay medicamentos programados para hoy
                    </p>
                  )}
                  <div className="mt-4 text-center">
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/medications">Ver Todos</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {user?.permissions?.viewAppointments && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Citas Próximas</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length ? (
                    <ul className="space-y-2">
                      {upcomingAppointments.map((appt) => (
                        <li key={appt.id} className="rounded-lg border p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="font-medium">
                              {appt.doctorName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(appt.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {appt.specialty} {appt.time && `- ${appt.time}`}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      No hay citas programadas para esta semana
                    </p>
                  )}
                  <div className="mt-4 text-center">
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/appointments">Ver Todas</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {user?.permissions?.viewTreatments && treatments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tratamientos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {treatments.slice(0, 2).map((t) => (
                    <li key={t.id} className="rounded-lg border p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium">{t.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Doctor: {t.doctor}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-center">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/treatments">Ver Todos</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {user?.permissions?.viewNotes && (
            <MedicalNotes readOnly={!user.permissions?.manageNotes} />
          )}
        </TabsContent>
        /* -------------------------- MEDICATIONS -------------------------- */
        <TabsContent value="medications" className="space-y-4 pt-4">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold">Medicamentos</h2>
            {user?.permissions?.manageMedications && (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/dashboard/medications">
                  Gestionar Medicamentos
                </Link>
              </Button>
            )}
          </div>

          {medications.length ? (
            <div className="grid gap-4">
              {medications.map((med) => (
                <Card key={med.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4">
                      <div className="mb-3 flex justify-center sm:mb-0 sm:block">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Pill className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-center font-medium sm:text-left">
                          {med.name}
                        </h3>
                        <p className="text-center text-sm text-muted-foreground sm:text-left">
                          {med.dose} {med.type && `- ${med.type}`}
                        </p>
                        <div className="mt-2 text-center text-sm text-muted-foreground sm:text-left">
                          Próxima dosis:{" "}
                          {new Date(med.nextDose).toLocaleDateString()} a las{" "}
                          {new Date(med.nextDose).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No hay medicamentos registrados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        /* -------------------------- APPOINTMENTS -------------------------- */
        <TabsContent value="appointments" className="space-y-4 pt-4">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold">Citas Médicas</h2>
            {user?.permissions?.manageAppointments && (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/dashboard/appointments">Gestionar Citas</Link>
              </Button>
            )}
          </div>

          {appointments.length ? (
            <div className="grid gap-4">
              {appointments.map((appt) => (
                <Card key={appt.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4">
                      <div className="mb-3 flex justify-center sm:mb-0 sm:block">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-center font-medium sm:text-left">
                          {appt.doctorName}
                        </h3>
                        <p className="text-center text-sm text-muted-foreground sm:text-left">
                          {appt.specialty}
                        </p>
                        <div className="mt-2 space-y-1 text-center text-sm text-muted-foreground sm:text-left">
                          <div>
                            Fecha: {new Date(appt.date).toLocaleDateString()}
                          </div>
                          {appt.time && <div>Hora: {appt.time}</div>}
                          {appt.location && <div>Lugar: {appt.location}</div>}
                          {appt.notes && (
                            <div className="mt-2 rounded-md bg-muted p-2">
                              <p className="text-sm">{appt.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No hay citas médicas registradas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        /* -------------------------- TREATMENTS -------------------------- */
        <TabsContent value="treatments" className="space-y-4 pt-4">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold">Tratamientos</h2>
            {user?.permissions?.manageTreatments && (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/dashboard/treatments">Gestionar Tratamientos</Link>
              </Button>
            )}
          </div>

          {treatments.length ? (
            <div className="grid gap-4">
              {treatments.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4">
                      <div className="mb-3 flex justify-center sm:mb-0 sm:block">
                        <div className="rounded-full bg-primary/10 p-2">
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-center font-medium sm:text-left">
                          {t.name}
                        </h3>
                        {t.doctor && (
                          <p className="text-center text-sm text-muted-foreground sm:text-left">
                            Doctor: {t.doctor}
                          </p>
                        )}
                        <div className="mt-2 space-y-1 text-center text-sm text-muted-foreground sm:text-left">
                          <div>
                            Inicio: {new Date(t.startDate).toLocaleDateString()}
                            {t.endDate &&
                              ` - Fin: ${new Date(
                                t.endDate
                              ).toLocaleDateString()}`}
                          </div>
                          {t.description && (
                            <p className="mt-2">{t.description}</p>
                          )}
                          {t.notes && (
                            <div className="mt-2 rounded-md bg-muted p-2">
                              <p className="text-sm">{t.notes}</p>
                            </div>
                          )}
                        </div>

                        {t.progress && t.progress.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-center text-sm font-medium sm:text-left">
                              Seguimiento del Tratamiento
                            </h4>
                            <div className="mt-2 space-y-2">
                              {t.progress.slice(0, 2).map((p) => (
                                <div
                                  key={p.id}
                                  className="rounded-md border p-2 text-sm"
                                >
                                  <div className="flex flex-col sm:flex-row sm:justify-between">
                                    <span className="text-center font-medium sm:text-left">
                                      {new Date(p.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {p.notes && <p className="mt-1">{p.notes}</p>}
                                  {p.sideEffects && (
                                    <div className="mt-1">
                                      <span className="font-medium">
                                        Efectos secundarios:{" "}
                                      </span>
                                      {p.sideEffects}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No hay tratamientos registrados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
