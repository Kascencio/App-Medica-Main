"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

type Gender = "male" | "female" | "other";

interface PatientProfile {
  id?: number;
  userId: number;
  name?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: Gender;
  doctorName?: string;
  doctorContact?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<PatientProfile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize form after user is loaded
  useEffect(() => {
    if (user?.id && form === null) {
      setForm({
        userId: user.id,
        name: "",
        age: undefined,
        dateOfBirth: "",
        gender: "male",
        doctorName: "",
        doctorContact: "",
      });
    }
  }, [user, form]);

  // Load existing profile
  useEffect(() => {
    if (!user?.id) return;
    
    setLoading(true);
    fetch(`/api/patients?userId=${user.id}`)
      .then((r) => {
        if (r.ok) return r.json();
        if (r.status === 404) return null;
        throw new Error("Error cargando perfil");
      })
      .then((data: PatientProfile | null) => {
        if (data) {
          setProfile(data);
          setForm({
            userId: user.id,
            name: data.name,
            age: data.age,
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
            gender: (data.gender as Gender) ?? "male",
            doctorName: data.doctorName,
            doctorContact: data.doctorContact,
          });
        } else {
          setIsEditing(true);
          if (!form) {
            setForm({
              userId: user.id,
              name: "",
              age: undefined,
              dateOfBirth: "",
              gender: "male",
              doctorName: "",
              doctorContact: "",
            });
          }
        }
      })
      .catch((e) => {
        toast({ title: "Error", description: e.message, variant: "destructive" });
        setIsEditing(true);
      })
      .finally(() => setLoading(false));
  }, [user?.id, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!form) return;
    
    const { name, value } = e.target;
    setForm((f) => {
      if (!f) return null;
      return {
        ...f,
        [name]:
          name === "age" ? (value === "" ? undefined : Number(value)) : value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !form) return;
    
    try {
      console.log("Sending data:", form); // Debugging
      
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          userId: user.id, // Ensure we're using the current user ID
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo guardar");
      }
      
      const saved: PatientProfile = await res.json();
      setProfile(saved);
      setIsEditing(false);
      toast({ title: "Perfil guardado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-center py-10">Cargando perfil…</p>;
  }

  if (!user) {
    return <p className="text-center py-10">Debe iniciar sesión para ver este perfil</p>;
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Perfil del Paciente</h1>
        {!isEditing && (
          <Button size="sm" onClick={() => setIsEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      {isEditing && form ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Información</CardTitle>
            <CardDescription>
              Completa los datos médicos básicos
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name || ""}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Edad</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  min={0}
                  max={120}
                  value={form.age ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Fecha de nacimiento</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <select
                  id="gender"
                  name="gender"
                  className="w-full rounded-md border px-3 py-2"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctorName">Doctor</Label>
                <Input
                  id="doctorName"
                  name="doctorName"
                  value={form.doctorName || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctorContact">Contacto del Doctor</Label>
                <Input
                  id="doctorContact"
                  name="doctorContact"
                  value={form.doctorContact || ""}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </CardFooter>
          </form>
        </Card>
      ) : profile ? (
        <Card>
          <CardHeader>
            <CardTitle>{profile.name || "—"}</CardTitle>
            <CardDescription>Información del paciente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Edad:</strong> {profile.age ?? "—"}
            </p>
            <p>
              <strong>Fecha de nacimiento:</strong>{" "}
              {profile.dateOfBirth
                ? new Date(profile.dateOfBirth).toLocaleDateString()
                : "—"}
            </p>
            <p>
              <strong>Género:</strong> {profile.gender ?? "—"}
            </p>
            <p>
              <strong>Doctor:</strong> {profile.doctorName ?? "—"}
            </p>
            <p>
              <strong>Contacto Doctor:</strong> {profile.doctorContact ?? "—"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="mb-4 text-center text-muted-foreground">
              No hay información del paciente disponible
            </p>
            <Button onClick={() => setIsEditing(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Completar Perfil Médico
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}