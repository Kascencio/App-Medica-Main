"use client";

import { useEffect, useState } from "react";
import Link                     from "next/link";
import { useAuth }              from "@/lib/auth-provider";

/* UI */
import { Card, CardContent }   from "@/components/ui/card";
import { Button }              from "@/components/ui/button";
import { PlusCircle }          from "lucide-react";
import { PatientCard }         from "@/components/patient-card";
import { MedicalNotes }        from "@/components/medical-notes";
import { CaregiverView }       from "@/components/caregiver-view";

/* ────────────────────────────────────────────────────────── */
/* tipos de datos que vienen de las APIs                      */
/* ────────────────────────────────────────────────────────── */
interface ApiMedication {
  id: number;
  name: string;
  dosage: string;
  type: string;
  startDate: string;                   // ISO
  notes?: string | null;
}

interface ApiAppointment {
  id: number;
  title: string;
  dateTime: string;                    // ISO
  location?: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
}

/* ================================================================= */

export default function DashboardPage() {
  const { user } = useAuth();

  /* ---------------- Estado local ---------------- */
  const [upcomingMeds,  setUpcomingMeds]  = useState<ApiMedication[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<ApiAppointment[]>([]);
  const [loading,       setLoading]       = useState(true);

  /* ---------------- Fetch data ------------------ */
  useEffect(() => {
    /* cuidador ⇒ vista propia */
    if (user?.role === "CAREGIVER") return;

    /* paciente sin perfil todavía */
    if (!user?.profileId) {
      setLoading(false);
      return;
    }

    const pid = user.profileId;

    const today     = new Date();
    const tomorrow  = new Date(today);   tomorrow.setDate(today.getDate() + 1);
    const nextWeek  = new Date(today);   nextWeek.setDate(today.getDate() + 7);

    /** meds **/
    fetch(`/api/medications?patientProfileId=${pid}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ApiMedication[]) => {
        const meds = data
          .filter(m => {
            const d = new Date(m.startDate);
            return d >= today && d < tomorrow;
          })
          .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0,3);
        setUpcomingMeds(meds);
      })
      .catch(console.error);

    /** appts **/
    fetch(`/api/appointments?patientProfileId=${pid}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ApiAppointment[]) => {
        const appts = data
          .filter(a => {
            const d = new Date(a.dateTime);
            return d >= today && d <= nextWeek;
          })
          .sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
          .slice(0,3);
        setUpcomingAppts(appts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  /* ---------------- Render ---------------------- */

  /* 1️⃣  Cuidadores ven su propio tablero */
  if (user?.role === "CAREGIVER") {
    return <CaregiverView />;
  }

  /* 2️⃣  Mientras esperamos data */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <p className="text-muted-foreground">Cargando panel…</p>
      </div>
    );
  }

  /* 3️⃣  Paciente sin perfil -> botón para crearlo */
  if (user?.role === "PATIENT" && !user.profileId) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <p className="text-center text-muted-foreground">
            Todavía no has completado tu información médica.
          </p>
          <Button asChild>
            <Link href="/dashboard/profile">
              <PlusCircle className="h-5 w-5 mr-2" /> Crear Perfil
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* 4️⃣  Panel del paciente */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>

      {/* --- ficha paciente --- */}
      <PatientCard />

      {/* --- tarjetas resumen --- */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* medicamentos */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Medicamentos hoy</h2>
            {upcomingMeds.length ? (
              <ul className="space-y-2">
                {upcomingMeds.map(m => (
                  <li key={m.id} className="rounded-lg border p-3 flex justify-between">
                    <div>
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {m.dosage} – {m.type}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(m.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground">No hay medicamentos pendientes hoy</p>
            )}
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/medications">Ver Todos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* citas */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Próximas Citas</h2>
            {upcomingAppts.length ? (
              <ul className="space-y-2">
                {upcomingAppts.map(a => (
                  <li key={a.id} className="rounded-lg border p-3 flex justify-between">
                    <div className="pr-3">
                      <span className="font-medium">{a.title}</span>
                      {a.location && (
                        <span className="block text-sm text-muted-foreground truncate max-w-[150px]">
                          {a.location}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(a.dateTime).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground">No hay citas programadas esta semana</p>
            )}
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/appointments">Ver Todas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- notas médicas --- */}
      <MedicalNotes />
    </div>
  );
}
