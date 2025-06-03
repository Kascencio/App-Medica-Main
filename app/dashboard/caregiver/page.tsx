"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addDays,
  isSameDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import {
  User,
  ClipboardList,
  Pill,
  Stethoscope,
  CalendarIcon,
  Plus,
  Edit3,
  Trash2,
  Clock,
  MapPin,
  FileText,
  Calendar as CalendarIconLarge,
} from "lucide-react";

/* ───────────────────────────────────────────────────────────────────────── */
/*                               Tipos de datos                              */
/* ───────────────────────────────────────────────────────────────────────── */

interface PatientSummary {
  id: number;
  name: string | null;
}

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
  patientProfileId: number;
  name: string;
  dosage: string;
  type: string;
  frequency: "daily" | "weekly" | "custom";
  startDate: string; // ISO
  notes?: string | null;
}

interface Treatment {
  id: number;
  patientProfileId: number;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress?: string | null;
}

interface Appointment {
  id: number;
  patientProfileId: number;
  title: string;        // doctorName
  description?: string; // specialty + "\n" + notes
  dateTime: string;     // ISO
  location: string;
}

interface Note {
  id: number;
  patientProfileId: number;
  title: string;
  content: string;
  date: string; // ISO
}

/* Para el calendario */
type CalMed = { id: number; name: string; time: string; dose: string; type: string };
type CalAppt = { id: number; title: string; time: string; location?: string; status: string };
type DayBucket = { medications: CalMed[]; appointments: CalAppt[] };

/* ───────────────────────────────────────────────────────────────────────── */
/*                           Componente principal                            */
/* ───────────────────────────────────────────────────────────────────────── */

export default function CaregiverDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast().toast;

  /* ─────────────────────────────────────────── */
  /* 1) LISTA DE PACIENTES ASIGNADOS AL CUIDADOR */
  /* ─────────────────────────────────────────── */

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState<string>("");
  const [joining, setJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "CAREGIVER") return;

    fetch("/api/caregivers/patients", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Error al cargar pacientes");
        }
        return res.json();
      })
      .then((lista: PatientSummary[]) => {
        setPatients(lista);
        if (lista.length > 0) {
          setSelectedPatientId(lista[0].id);
        }
      })
      .catch((err) => {
        console.error("Error al cargar pacientes:", err);
        toast({ title: "Error", description: err.message || "Error al cargar pacientes", variant: "destructive" });
      });
  }, [authLoading, user, toast]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch("/api/caregivers/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Código inválido");
      }
      // Refrescar lista
      const updatedList = await fetch("/api/caregivers/patients", { credentials: "include" }).then((r) => r.json());
      setPatients(updatedList);
      // Seleccionar el último agregado
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        const ultimo = updatedList[updatedList.length - 1];
        setSelectedPatientId(ultimo.id);
      }
      setJoinCode("");
      toast({ title: "Paciente agregado" });
    } catch (err: any) {
      console.error("Error al unirse a paciente:", err);
      setJoinError(err.message || "Error al unirse");
    } finally {
      setJoining(false);
    }
  };

  /* ─────────────────────────────────────────── */
  /* 2) DATOS DEL PACIENTE SELECCIONADO Y SECCIONES */
  /* ─────────────────────────────────────────── */

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [loadingSection, setLoadingSection] = useState<boolean>(false);
  const [errorSection, setErrorSection] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPatientId === null) return;

    setLoadingSection(true);
    setErrorSection(null);

    async function fetchAllForPatient() {
      try {
        // 2.1) Perfil paciente
        const patientRes = await fetch(`/api/patients/${selectedPatientId}`, { credentials: "include" });
        if (!patientRes.ok) throw new Error("Error cargando paciente");
        setPatient(await patientRes.json());

        // 2.2) Medicamentos
        const medsRes = await fetch(`/api/medications?patientProfileId=${selectedPatientId}`, { credentials: "include" });
        if (!medsRes.ok) throw new Error("Error cargando medicamentos");
        setMedications(await medsRes.json());

        // 2.3) Tratamientos
        const treatRes = await fetch(`/api/treatments?patientProfileId=${selectedPatientId}`, { credentials: "include" });
        if (!treatRes.ok) throw new Error("Error cargando tratamientos");
        setTreatments(await treatRes.json());

        // 2.4) Citas
        const apptRes = await fetch(`/api/appointments?patientProfileId=${selectedPatientId}`, { credentials: "include" });
        if (!apptRes.ok) throw new Error("Error cargando citas");
        setAppointments(await apptRes.json());

        // 2.5) Notas
        const notesRes = await fetch(`/api/notes?patientProfileId=${selectedPatientId}`, { credentials: "include" });
        if (!notesRes.ok) throw new Error("Error cargando notas");
        setNotes(await notesRes.json());
      } catch (e: any) {
        console.error("[CG Dashboard] fetch error:", e);
        setErrorSection(e.message || "Error al cargar datos");
      } finally {
        setLoadingSection(false);
      }
    }

    fetchAllForPatient();
  }, [selectedPatientId, toast]);

  /* ─────────────────────────────────────────── */
  /* 3) CALENDAR DATA (para paciente) */
  /* ─────────────────────────────────────────── */

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDayCal, setSelectedDayCal] = useState<Date | null>(new Date());

  // Convertir medicamentos y citas a buckets por día
  const medBuckets = useMemo<Record<string, DayBucket>>(() => {
    const b: Record<string, DayBucket> = {};
    const key = (d: Date) => format(d, "yyyy-MM-dd");
    const ensure = (d: Date) => {
      const k = key(d);
      if (!b[k]) b[k] = { medications: [], appointments: [] };
      return b[k];
    };
    medications.forEach((m) => {
      const d = parseISO(m.startDate);
      ensure(d).medications.push({
        id: m.id,
        name: m.name,
        time: format(d, "HH:mm"),
        dose: m.dosage,
        type: m.type,
      });
    });
    appointments.forEach((a) => {
      const d = parseISO(a.dateTime);
      ensure(d).appointments.push({
        id: a.id,
        title: a.title,
        time: format(d, "HH:mm"),
        location: a.location,
        status: a.description ?? "",
      });
    });
    return b;
  }, [medications, appointments]);

  const calendarDays = useMemo<Date[]>(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    let days = eachDayOfInterval({ start, end });
    const padStart = getDay(start);
    if (padStart > 0) {
      days = [
        ...Array.from({ length: padStart }, (_, i) => addDays(start, i - padStart)),
        ...days,
      ];
    }
    const padEnd = 6 - getDay(end);
    if (padEnd > 0) {
      days = [...days, ...Array.from({ length: padEnd }, (_, i) => addDays(end, i + 1))];
    }
    return days;
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    setCurrentMonth(t);
    setSelectedDayCal(t);
  };

  /* ─────────────────────────────────────────── */
  /* 4) MEDICACIONES: CREATE / EDIT / DELETE      */
  /* ─────────────────────────────────────────── */

  const pidForAPI = selectedPatientId; // para usar en fetch
  const [medLoading, setMedLoading] = useState<boolean>(false);
  const [createMedOpen, setCreateMedOpen] = useState<boolean>(false);
  const [createMedForm, setCreateMedForm] = useState({
    name: "",
    dosage: "",
    type: "",
    frequency: "daily" as "daily" | "weekly" | "custom",
    notes: "",
  });
  const [createMedStart, setCreateMedStart] = useState<Date | undefined>();
  const [createMedTime, setCreateMedTime] = useState<string>("");

  const [editMedOpen, setEditMedOpen] = useState<boolean>(false);
  const [medToEdit, setMedToEdit] = useState<Medication | null>(null);
  const [editMedForm, setEditMedForm] = useState({
    name: "",
    dosage: "",
    type: "",
    frequency: "daily" as "daily" | "weekly" | "custom",
    notes: "",
  });
  const [editMedStart, setEditMedStart] = useState<Date | undefined>();
  const [editMedTime, setEditMedTime] = useState<string>("");

  // Fetch de medicamentos
  const fetchMedications = async () => {
    if (!pidForAPI) return;
    setMedLoading(true);
    try {
      const res = await fetch(`/api/medications?patientProfileId=${pidForAPI}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      setMedications(await res.json());
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudieron cargar los medicamentos", variant: "destructive" });
    } finally {
      setMedLoading(false);
    }
  };

  useEffect(() => {
    if (pidForAPI !== null) fetchMedications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pidForAPI]);

  // Crear medicamento
  const resetCreateMed = () => {
    setCreateMedForm({ name: "", dosage: "", type: "", frequency: "daily", notes: "" });
    setCreateMedStart(undefined);
    setCreateMedTime("");
  };
  const handleCreateMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pidForAPI || !createMedStart || !createMedTime) {
      toast({ title: "Error", description: "Complete todos los campos", variant: "destructive" });
      return;
    }
    const [h, m] = createMedTime.split(":").map(Number);
    const dt = new Date(createMedStart);
    dt.setHours(h, m);

    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientProfileId: pidForAPI, ...createMedForm, startDate: dt.toISOString() }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      await fetchMedications();
      resetCreateMed();
      setCreateMedOpen(false);
      toast({ title: "Medicamento creado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Editar medicamento
  const openEditMed = (med: Medication) => {
    setMedToEdit(med);
    setEditMedForm({
      name: med.name,
      dosage: med.dosage,
      type: med.type,
      frequency: med.frequency,
      notes: med.notes || "",
    });
    const dt = new Date(med.startDate);
    setEditMedStart(dt);
    setEditMedTime(dt.toTimeString().slice(0, 5));
    setEditMedOpen(true);
  };
  const handleEditMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medToEdit || !editMedStart || !editMedTime) return;
    const [h, m] = editMedTime.split(":").map(Number);
    const dt = new Date(editMedStart);
    dt.setHours(h, m);

    try {
      const res = await fetch(`/api/medications/${medToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...editMedForm, startDate: dt.toISOString() }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      await fetchMedications();
      setEditMedOpen(false);
      toast({ title: "Medicamento actualizado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Eliminar medicamento
  const deleteMed = async (id: number) => {
    try {
      const res = await fetch(`/api/medications/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      setMedications((ms) => ms.filter((m) => m.id !== id));
      toast({ title: "Medicamento eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  /* ─────────────────────────────────────────── */
  /* 5) TRATAMIENTOS: CREATE / EDIT / DELETE      */
  /* ─────────────────────────────────────────── */

  const [treatLoading, setTreatLoading] = useState<boolean>(false);
  const [createTreatOpen, setCreateTreatOpen] = useState<boolean>(false);
  const [createTreatForm, setCreateTreatForm] = useState({ title: "", description: "", progress: "" });
  const [createTreatStart, setCreateTreatStart] = useState<Date | undefined>();
  const [createTreatEnd, setCreateTreatEnd] = useState<Date | undefined>();

  const [editTreatOpen, setEditTreatOpen] = useState<boolean>(false);
  const [treatToEdit, setTreatToEdit] = useState<Treatment | null>(null);
  const [editTreatForm, setEditTreatForm] = useState({ title: "", description: "", progress: "" });
  const [editTreatStart, setEditTreatStart] = useState<Date | undefined>();
  const [editTreatEnd, setEditTreatEnd] = useState<Date | undefined>();

  // Fetch tratamientos
  const fetchTreatments = async () => {
    if (!pidForAPI) return;
    setTreatLoading(true);
    try {
      const res = await fetch(`/api/treatments?patientProfileId=${pidForAPI}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      setTreatments(await res.json());
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudieron cargar los tratamientos", variant: "destructive" });
    } finally {
      setTreatLoading(false);
    }
  };

  useEffect(() => {
    if (pidForAPI !== null) fetchTreatments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pidForAPI]);

  // Crear tratamiento
  const resetCreateTreat = () => {
    setCreateTreatForm({ title: "", description: "", progress: "" });
    setCreateTreatStart(undefined);
    setCreateTreatEnd(undefined);
  };
  const handleCreateTreat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pidForAPI) {
      toast({ title: "Sin perfil", variant: "destructive" });
      return;
    }
    const body: any = {
      patientProfileId: pidForAPI,
      title: createTreatForm.title,
      description: createTreatForm.description || undefined,
      progress: createTreatForm.progress || undefined,
      startDate: createTreatStart ? createTreatStart.toISOString() : undefined,
      endDate: createTreatEnd ? createTreatEnd.toISOString() : undefined,
    };

    try {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo guardar");
      }
      const created: Treatment = await res.json();
      setTreatments((l) => [...l, created]);
      resetCreateTreat();
      setCreateTreatOpen(false);
      toast({ title: "Tratamiento agregado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Editar tratamiento
  const openEditTreat = (t: Treatment) => {
    setTreatToEdit(t);
    setEditTreatForm({
      title: t.title,
      description: t.description || "",
      progress: t.progress || "",
    });
    setEditTreatStart(t.startDate ? new Date(t.startDate) : undefined);
    setEditTreatEnd(t.endDate ? new Date(t.endDate) : undefined);
    setEditTreatOpen(true);
  };
  const handleEditTreat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatToEdit) return;

    const body: any = {
      title: editTreatForm.title,
      description: editTreatForm.description || undefined,
      progress: editTreatForm.progress || undefined,
      startDate: editTreatStart ? editTreatStart.toISOString() : null,
      endDate: editTreatEnd ? editTreatEnd.toISOString() : null,
    };

    try {
      const res = await fetch(`/api/treatments/${treatToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al actualizar");
      }
      const updated: Treatment = await res.json();
      setTreatments((lst) => lst.map((x) => (x.id === updated.id ? updated : x)));
      setEditTreatOpen(false);
      toast({ title: "Tratamiento actualizado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Eliminar tratamiento
  const deleteTreat = async (id: number) => {
    try {
      const res = await fetch(`/api/treatments/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      setTreatments((l) => l.filter((t) => t.id !== id));
      toast({ title: "Tratamiento eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  /* ─────────────────────────────────────────── */
  /* 6) CITAS: CREATE / EDIT / DELETE             */
  /* ─────────────────────────────────────────── */

  const [apptLoading, setApptLoading] = useState<boolean>(false);
  const [createApptOpen, setCreateApptOpen] = useState<boolean>(false);
  const [createApptForm, setCreateApptForm] = useState({
    doctorName: "",
    specialty: "",
    location: "",
    time: "",
    notes: "",
  });
  const [createApptDate, setCreateApptDate] = useState<Date | undefined>();

  const [editApptOpen, setEditApptOpen] = useState<boolean>(false);
  const [apptToEdit, setApptToEdit] = useState<Appointment | null>(null);

  // Fetch citas
  const fetchAppointments = async () => {
    if (!pidForAPI) return;
    setApptLoading(true);
    try {
      const res = await fetch(`/api/appointments?patientProfileId=${pidForAPI}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      setAppointments(await res.json());
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudieron cargar citas", variant: "destructive" });
    } finally {
      setApptLoading(false);
    }
  };

  useEffect(() => {
    if (pidForAPI !== null) fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pidForAPI]);

  // Crear cita
  const resetCreateAppt = () => {
    setCreateApptForm({ doctorName: "", specialty: "", location: "", time: "", notes: "" });
    setCreateApptDate(undefined);
  };
  const handleCreateAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pidForAPI || !createApptDate || !createApptForm.time || !createApptForm.doctorName || !createApptForm.location) {
      toast({ title: "Error", description: "Complete todos los campos obligatorios", variant: "destructive" });
      return;
    }
    const dt = new Date(createApptDate);
    const [h, m] = createApptForm.time.split(":").map(Number);
    dt.setHours(h, m);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientProfileId: pidForAPI,
          title: createApptForm.doctorName,
          description: `Especialidad: ${createApptForm.specialty}\n${createApptForm.notes}`.trim(),
          dateTime: dt.toISOString(),
          location: createApptForm.location,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al crear");
      }
      await fetchAppointments();
      resetCreateAppt();
      setCreateApptOpen(false);
      toast({ title: "Cita creada" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Editar cita
  const openEditAppt = (app: Appointment) => {
    setApptToEdit(app);
    const [specLine, ...noteLines] = (app.description || "").split("\n");
    setCreateApptForm({
      doctorName: app.title,
      specialty: specLine.replace(/^Especialidad: */, ""),
      location: app.location,
      time: format(new Date(app.dateTime), "HH:mm"),
      notes: noteLines.join("\n"),
    });
    setEditApptOpen(true);
    setCreateApptDate(new Date(app.dateTime));
  };
  const handleEditAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptToEdit || !createApptDate || !createApptForm.time) return;
    const dt = new Date(createApptDate);
    const [h, m] = createApptForm.time.split(":").map(Number);
    dt.setHours(h, m);

    try {
      const res = await fetch(`/api/appointments/${apptToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: createApptForm.doctorName,
          description: `Especialidad: ${createApptForm.specialty}\n${createApptForm.notes}`.trim(),
          dateTime: dt.toISOString(),
          location: createApptForm.location,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al actualizar");
      }
      await fetchAppointments();
      setEditApptOpen(false);
      toast({ title: "Cita actualizada" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Eliminar cita
  const deleteAppointment = async (id: number) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      setAppointments((a) => a.filter((x) => x.id !== id));
      toast({ title: "Cita eliminada" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar cita", variant: "destructive" });
    }
  };

  /* ─────────────────────────────────────────── */
  /* 7) NOTAS: LISTAR y “Ver Todas” (solo lectura) */
  /* ─────────────────────────────────────────── */

  const [notesLoading, setNotesLoading] = useState<boolean>(false);

  const fetchNotes = async () => {
    if (!pidForAPI) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/notes?patientProfileId=${pidForAPI}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      setNotes(await res.json());
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudieron cargar las notas", variant: "destructive" });
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    if (pidForAPI !== null) fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pidForAPI]);

  /* ─────────────────────────────────────────── */
  /* 8) FILTRAR PRÓXIMOS PARA CARDS de “Próximos” */
  /* ─────────────────────────────────────────── */

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const upcomingMeds = medications
    .filter((m) => {
      const d = new Date(m.startDate);
      return d >= today && d < tomorrow;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const upcomingAppts = appointments
    .filter((a) => {
      const d = new Date(a.dateTime);
      return d >= today && d <= nextWeek;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 3);

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2);

  /* ─────────────────────────────────────────── */
  /* RENDER PRINCIPAL                               */
  /* ─────────────────────────────────────────── */

  if (authLoading || loadingSection) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (!user || user.role !== "CAREGIVER") {
    return (
      <Card className="max-w-lg mx-auto my-8">
        <CardHeader>
          <CardTitle>Acceso denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No tienes permisos para acceder a este panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      {/* ================= SELECTOR DE PACIENTE ================= */}
      <Card>
        <CardHeader className="bg-primary/5 pb-2">
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Paciente asignado:
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          {patients.length > 0 ? (
            <select
              className="w-full sm:w-auto rounded border px-2 py-1"
              value={selectedPatientId ?? ""}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? `#${p.id}`}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no tienes pacientes asignados.
            </p>
          )}

          <form
            onSubmit={handleJoin}
            className="w-full flex flex-col sm:flex-row sm:items-center gap-2"
          >
            <Label className="whitespace-nowrap">Código invitación:</Label>
            <Input
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full sm:w-36"
            />
            <Button type="submit" disabled={joining} className="w-full sm:w-auto">
              {joining ? "Uniendo..." : "Unirse"}
            </Button>
          </form>
        </CardContent>
        {joinError && (
          <p className="px-4 pb-2 text-sm text-destructive">{joinError}</p>
        )}
      </Card>

      {/* ================= INFORMACIÓN DEL PACIENTE ================= */}
      {selectedPatientId && patient ? (
        <Card>
          <CardHeader className="bg-primary/5 pb-2">
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              {patient.name ?? `Paciente #${patient.id}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <dl className="space-y-2 sm:col-span-1 md:col-span-2">
                <Item label="Nombre" value={patient.name} />
                <Item label="Edad" value={patient.age !== null ? `${patient.age} años` : "—"} />
                <Item
                  label="Sexo"
                  value={
                    patient.sex === "male"
                      ? "Masculino"
                      : patient.sex === "female"
                      ? "Femenino"
                      : patient.sex === "other"
                      ? "Otro"
                      : "—"
                  }
                />
                <Item label="Tipo de sangre" value={patient.bloodType} />
                <Item label="Condiciones" value={patient.conditions || "Ninguna"} />
                <Item label="Alergias" value={patient.allergies || "Ninguna"} />
                <Item
                  label="Contraindicaciones"
                  value={patient.contraindications || "Ninguna"}
                />
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
          </CardContent>
        </Card>
      ) : null}

      {/* ================= PRÓXIMOS MEDICAMENTOS / CITAS ================= */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Medicamentos próximos */}
        {upcomingMeds.length > 0 && (
          <Card>
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="flex items-center">
                <Pill className="mr-2 h-5 w-5" />
                Medicamentos Próximos (Hoy)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-2">
              {upcomingMeds.map((m) => (
                <div key={m.id} className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{m.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {m.dosage} – {m.type}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(m.startDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/caregiver/medications?patient=${selectedPatientId}`}>
                    Ver Todos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Citas próximas */}
        {upcomingAppts.length > 0 && (
          <Card>
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="flex items-center">
                <Stethoscope className="mr-2 h-5 w-5" />
                Citas Próximas (Próxima Semana)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-2">
              {upcomingAppts.map((a) => (
                <div key={a.id} className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{a.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {a.location}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(a.dateTime).toLocaleDateString()}
                  </span>
                </div>
              ))}
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/caregiver/appointments?patient=${selectedPatientId}`}>
                    Ver Todos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ================= CALENDARIO DEL PACIENTE ================= */}
      <Card className="overflow-x-auto">
        <CardHeader className="bg-primary/10 py-3 flex justify-between">
          <CardTitle className="flex items-center text-lg">
            <CalendarIconLarge className="mr-2 h-5 w-5" />
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </CardTitle>
          <div className="space-x-2">
            <Button size="sm" variant="outline" onClick={prevMonth}>
              Anterior
            </Button>
            <Button size="sm" variant="outline" onClick={goToday}>
              Hoy
            </Button>
            <Button size="sm" variant="outline" onClick={nextMonth}>
              Siguiente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 bg-muted/20 text-center text-xs sm:text-sm font-medium">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                <div key={d} className="p-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const bucket = medBuckets[key];
                const inMonth = day.getMonth() === currentMonth.getMonth();
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDayCal(day)}
                    className={cn(
                      "h-20 sm:h-24 border-r border-b p-1.5 relative cursor-pointer hover:bg-muted/30",
                      !inMonth && "bg-muted/10 text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute right-1 top-1 h-6 w-6 flex items-center justify-center rounded-full text-xs",
                        isToday(day) && "bg-primary text-primary-foreground font-semibold",
                        selectedDayCal && isSameDay(day, selectedDayCal) && "ring-2 ring-primary"
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {!!bucket && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                            {!!bucket.appointments.length && (
                              <div className="w-full flex items-center p-1 rounded-md text-xxs justify-start bg-blue-500/10 text-blue-600 border-blue-600/20">
                                <Stethoscope className="h-3 w-3 mr-1" />
                                {bucket.appointments.length} cita
                              </div>
                            )}
                            {!!bucket.medications.length && (
                              <div className="w-full flex items-center p-1 rounded-md text-xxs justify-start bg-green-500/10 text-green-600 border-green-600/20">
                                <Pill className="h-3 w-3 mr-1" />
                                {bucket.medications.length} med.
                              </div>
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-60 sm:w-72 p-0">
                          <div className="border-b p-3 font-medium">
                            {format(day, "PPP", { locale: es })}
                          </div>
                          <ScrollArea className="h-[200px]">
                            <div className="p-3 space-y-3">
                              {bucket.appointments.map((a) => (
                                <div key={`a-${a.id}`} className="border rounded-md p-2 text-xs">
                                  <div className="font-medium text-blue-700 flex items-center">
                                    <Stethoscope className="h-3 w-3 mr-1" />
                                    {a.title}
                                  </div>
                                  <div className="text-muted-foreground ml-4">
                                    {a.time}
                                    {a.location && ` – ${a.location}`}
                                  </div>
                                </div>
                              ))}
                              {bucket.medications.map((m) => (
                                <div key={`m-${m.id}`} className="border rounded-md p-2 text-xs">
                                  <div className="font-medium text-green-700 flex items-center">
                                    <Pill className="h-3 w-3 mr-1" />
                                    {m.name}
                                  </div>
                                  <div className="text-muted-foreground ml-4">
                                    {m.dose} – {m.time}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= MEDICAMENTOS (CRUD) ================= */}
      <section id="medicamentos" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-2xl font-bold flex items-center">
            <Pill className="mr-2 h-5 w-5" />
            Medicamentos
          </h2>
          <Dialog open={createMedOpen} onOpenChange={setCreateMedOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="-mt-36 max-h-[54vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agregar Medicamento</DialogTitle>
                <DialogDescription>Completa la información para crear un medicamento</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateMed}>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={createMedForm.name}
                      onChange={(e) => setCreateMedForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Dosis</Label>
                    <Input
                      value={createMedForm.dosage}
                      onChange={(e) => setCreateMedForm((f) => ({ ...f, dosage: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Input
                      value={createMedForm.type}
                      onChange={(e) => setCreateMedForm((f) => ({ ...f, type: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Frecuencia</Label>
                    <Select
                      value={createMedForm.frequency}
                      onValueChange={(v) => setCreateMedForm((f) => ({ ...f, frequency: v as any }))}
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
                          className={cn("w-full justify-start", !createMedStart && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {createMedStart
                            ? format(createMedStart, "PPP", { locale: es })
                            : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarPicker
                          mode="single"
                          selected={createMedStart}
                          onSelect={setCreateMedStart}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={createMedTime}
                      onChange={(e) => setCreateMedTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={createMedForm.notes}
                      onChange={(e) => setCreateMedForm((f) => ({ ...f, notes: e.target.value }))}
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

        {/* Edit Med Dialog */}
        <Dialog open={editMedOpen} onOpenChange={setEditMedOpen}>
          <DialogTrigger asChild>
            {/* Se abre programáticamente */}
            <span />
          </DialogTrigger>
          <DialogContent className="-mt-36 max-h-[54vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Medicamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditMed}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={editMedForm.name}
                    onChange={(e) => setEditMedForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Dosis</Label>
                  <Input
                    value={editMedForm.dosage}
                    onChange={(e) => setEditMedForm((f) => ({ ...f, dosage: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Input
                    value={editMedForm.type}
                    onChange={(e) => setEditMedForm((f) => ({ ...f, type: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Frecuencia</Label>
                  <Select
                    value={editMedForm.frequency}
                    onValueChange={(v) => setEditMedForm((f) => ({ ...f, frequency: v as any }))}
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
                        className={cn("w-full justify-start", !editMedStart && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editMedStart
                          ? format(editMedStart, "PPP", { locale: es })
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={editMedStart}
                        onSelect={setEditMedStart}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={editMedTime}
                    onChange={(e) => setEditMedTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={editMedForm.notes}
                    onChange={(e) => setEditMedForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Actualizar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lista de Medicamentos */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {medications.map((med) => (
            <Card key={med.id}>
              <CardHeader className="bg-primary/5 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-base">
                    <Pill className="mr-2 h-4 w-4" />
                    {med.name}
                  </div>
                  <div className="flex space-x-2">
                    <Button size="icon" variant="outline" onClick={() => openEditMed(med)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMed(med.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-4 sm:p-6">
                <div className="flex justify-between">
                  <span className="text-sm">Dosis:</span>
                  <span className="text-sm">{med.dosage}</span>
                  <span className="text-sm">Hora:</span>
                  <span className="text-sm">{format(new Date(med.startDate), "HH:mm")}</span>
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
                  <div className="mt-2 rounded-md bg-muted p-2 text-sm">{med.notes}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ================= TRATAMIENTOS (CRUD) ================= */}
      <section id="tratamientos" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-2xl font-bold flex items-center">
            <ClipboardList className="mr-2 h-5 w-5" />
            Tratamientos
          </h2>
          <Dialog open={createTreatOpen} onOpenChange={setCreateTreatOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Agregar Tratamiento
              </Button>
            </DialogTrigger>
            <DialogContent className="-mt-28 max-h-[50vh] overflow-y-auto">
              <form onSubmit={handleCreateTreat}>
                <DialogHeader>
                  <DialogTitle>Nuevo Tratamiento</DialogTitle>
                  <DialogDescription>Complete la información</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <Input
                    name="title"
                    placeholder="Título"
                    value={createTreatForm.title}
                    onChange={(e) => setCreateTreatForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                  <Textarea
                    name="description"
                    placeholder="Descripción"
                    value={createTreatForm.description}
                    onChange={(e) => setCreateTreatForm((f) => ({ ...f, description: e.target.value }))}
                  />

                  <div className="grid grid-cols-1 gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("justify-start", !createTreatStart && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {createTreatStart
                            ? format(createTreatStart, "PPP", { locale: es })
                            : "Fecha de inicio"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarPicker
                          mode="single"
                          selected={createTreatStart}
                          onSelect={setCreateTreatStart}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("justify-start", !createTreatEnd && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {createTreatEnd
                            ? format(createTreatEnd, "PPP", { locale: es })
                            : "Fecha de fin (opcional)"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarPicker
                          mode="single"
                          selected={createTreatEnd}
                          onSelect={setCreateTreatEnd}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Textarea
                    name="progress"
                    placeholder="Progreso"
                    value={createTreatForm.progress}
                    onChange={(e) => setCreateTreatForm((f) => ({ ...f, progress: e.target.value }))}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Trat Dialog */}
        <Dialog open={editTreatOpen} onOpenChange={setEditTreatOpen}>
          <DialogTrigger asChild>
            {/* Se abre programáticamente */}
            <span />
          </DialogTrigger>
          <DialogContent className="-mt-36 max-h-[54vh] overflow-y-auto">
            <form onSubmit={handleEditTreat}>
              <DialogHeader>
                <DialogTitle>Editar Tratamiento</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editTreatForm.title}
                  onChange={(e) => setEditTreatForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />

                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={editTreatForm.description}
                  onChange={(e) => setEditTreatForm((f) => ({ ...f, description: e.target.value }))}
                />

                <div className="grid grid-cols-1 gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("justify-start", !editTreatStart && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editTreatStart
                          ? format(editTreatStart, "PPP", { locale: es })
                          : "Fecha de inicio"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker mode="single" selected={editTreatStart} onSelect={setEditTreatStart} locale={es} />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("justify-start", !editTreatEnd && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editTreatEnd
                          ? format(editTreatEnd, "PPP", { locale: es })
                          : "Fecha de fin (opcional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker mode="single" selected={editTreatEnd} onSelect={setEditTreatEnd} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>

                <Label htmlFor="edit-progress">Progreso</Label>
                <Textarea
                  id="edit-progress"
                  value={editTreatForm.progress}
                  onChange={(e) => setEditTreatForm((f) => ({ ...f, progress: e.target.value }))}
                />
              </div>

              <DialogFooter>
                <Button type="submit">Actualizar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lista de Tratamientos */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {treatments.length ? (
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
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditTreat(t)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteTreat(t.id)}
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
      </section>

      {/* ================= CITAS (CRUD) ================= */}
      <section id="citas" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-2xl font-bold flex items-center">
            <Stethoscope className="mr-2 h-5 w-5" />
            Citas
          </h2>
          <Dialog open={createApptOpen} onOpenChange={setCreateApptOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Nueva cita
              </Button>
            </DialogTrigger>
            <DialogContent className="-mt-28 max-h-[54vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agregar Cita Médica</DialogTitle>
                <DialogDescription>Complete los datos de la cita</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAppt}>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Doctor</Label>
                    <Input
                      value={createApptForm.doctorName}
                      onChange={(e) => setCreateApptForm((f) => ({ ...f, doctorName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Especialidad</Label>
                    <Input
                      value={createApptForm.specialty}
                      onChange={(e) => setCreateApptForm((f) => ({ ...f, specialty: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Ubicación</Label>
                    <Input
                      value={createApptForm.location}
                      onChange={(e) => setCreateApptForm((f) => ({ ...f, location: e.target.value }))}
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
                            className={cn("w-full justify-start", !createApptDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {createApptDate
                              ? format(createApptDate, "PPP", { locale: es })
                              : "Seleccionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarPicker
                            mode="single"
                            selected={createApptDate}
                            onSelect={setCreateApptDate}
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Hora</Label>
                      <Input
                        type="time"
                        value={createApptForm.time}
                        onChange={(e) => setCreateApptForm((f) => ({ ...f, time: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={createApptForm.notes}
                      onChange={(e) => setCreateApptForm((f) => ({ ...f, notes: e.target.value }))}
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

        {/* Edit Appt Dialog */}
        <Dialog open={editApptOpen} onOpenChange={setEditApptOpen}>
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <DialogContent className="-mt-32 max-h-[54vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Cita</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditAppt}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Doctor</Label>
                  <Input
                    value={createApptForm.doctorName}
                    onChange={(e) => setCreateApptForm((f) => ({ ...f, doctorName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Especialidad</Label>
                  <Input
                    value={createApptForm.specialty}
                    onChange={(e) => setCreateApptForm((f) => ({ ...f, specialty: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Ubicación</Label>
                  <Input
                    value={createApptForm.location}
                    onChange={(e) => setCreateApptForm((f) => ({ ...f, location: e.target.value }))}
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
                          className={cn("w-full justify-start", !createApptDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {createApptDate
                            ? format(createApptDate, "PPP", { locale: es })
                            : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarPicker
                          mode="single"
                          selected={createApptDate}
                          onSelect={setCreateApptDate}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={createApptForm.time}
                      onChange={(e) => setCreateApptForm((f) => ({ ...f, time: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={createApptForm.notes}
                    onChange={(e) => setCreateApptForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Actualizar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lista de Citas */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                    <Button size="icon" variant="outline" onClick={() => openEditAppt(app)}>
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
                  {app.description && <p className="text-sm whitespace-pre-wrap">{app.description}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ================= NOTAS ================= */}
      <section id="notas" className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Notas Médicas Recientes
        </h2>
        <div className="grid gap-4">
          {recentNotes.length > 0 ? (
            recentNotes.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{n.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 whitespace-pre-wrap">{n.content}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No hay notas disponibles</p>
          )}
        </div>
        <div className="mt-2 text-center">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/caregiver/notes?patient=${selectedPatientId}`}>
              Ver Todas
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/*                                Subcomponentes                              */
/* ───────────────────────────────────────────────────────────────────────── */

function Item({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid grid-cols-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value ?? "—"}</dd>
    </div>
  );
}
