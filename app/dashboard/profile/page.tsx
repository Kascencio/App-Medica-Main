"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import ImageKit from "imagekit-javascript";
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

// Definimos localmente los tipos que el SDK de navegador no exporta
interface AuthParams {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}
interface UploadResponse {
  url: string;
  [key: string]: any;
}

interface PatientProfile {
  id?: number;
  userId: number;
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  allergies?: string;
  reactions?: string;
  dateOfBirth?: string;
  gender?: Gender;
  doctorName?: string;
  doctorContact?: string;
  photoUrl?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<PatientProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estado para ImageKit
  const [ik, setIk] = useState<ImageKit | null>(null);
  const [auth, setAuth] = useState<AuthParams | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Carga credenciales de ImageKit y crea instancia
  useEffect(() => {
    fetch("/api/imagekit-auth")
      .then(res => res.json())
      .then((params: AuthParams) => {
        setAuth(params);
        setIk(new ImageKit({
          publicKey: params.publicKey,
          urlEndpoint: params.urlEndpoint,
        }));
      })
      .catch(err => {
        console.error("Error ImageKit auth:", err);
        toast({ title: "Error ImageKit", variant: "destructive" });
      });
  }, [toast]);

  // Inicializa el formulario para nuevos usuarios
  useEffect(() => {
    if (user?.id && form === null) {
      setForm({ userId: user.id });
    }
  }, [user, form]);

  // Carga perfil existente
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/patients?userId=${user.id}`)
      .then(r => r.ok ? r.json() : r.status === 404 ? null : Promise.reject(new Error("Error cargando perfil")))
      .then((data: PatientProfile | null) => {
        if (data) {
          setProfile(data);
          setForm({ ...data, dateOfBirth: data.dateOfBirth?.split("T")[0] || "" });
        } else {
          setIsEditing(true);
        }
      })
      .catch(e => toast({ title: "Error", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [user, toast]);

  // Manejo de cambios en inputs
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!form) return;
    const { name, value } = e.target;
    setForm(f => ({
      ...f!,
      [name]: ["age", "weight", "height"].includes(name)
        ? (value === '' ? undefined : Number(value))
        : value,
    }));
  };

  // Subida de archivo a ImageKit
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !ik || !auth || !form) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const result: UploadResponse = await new Promise((resolve, reject) => {
        ik.upload(
          {
            file,
            fileName: file.name,
            signature: auth.signature,
            token: auth.token,
            expire: auth.expire,
          },
          (err, res) => err ? reject(err) : resolve(res as UploadResponse)
        );
      });
      setForm(f => ({ ...f!, photoUrl: result.url }));
      toast({ title: "Imagen lista para guardar" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Error al subir imagen", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // Envía datos al back
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !user?.id) return;
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId: user.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      const saved: PatientProfile = await res.json();
      setProfile(saved);
      setIsEditing(false);
      toast({ title: "Perfil guardado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <p className="text-center py-10">Cargando perfil…</p>;
  if (!user) return <p className="text-center py-10">Debe iniciar sesión</p>;

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Perfil del Paciente</h1>
        {!isEditing && <Button size="sm" onClick={() => setIsEditing(true)}>Editar</Button>}
      </div>

      {isEditing && form ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Información</CardTitle>
            <CardDescription>Completa los datos médicos básicos</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Foto de perfil */}
              <div className="space-y-2">
                <Label htmlFor="photo">Foto de perfil</Label>
                {form.photoUrl && (
                  <img src={form.photoUrl} alt="Preview" className="h-24 w-24 rounded-full object-cover" />
                )}
                <Input id="photo" type="file" accept="image/*" onChange={handleFile} disabled={isUploading} />
              </div>

              {/* Campos de texto */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" name="name" value={form.name || ""} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Edad</Label>
                <Input id="age" name="age" type="number" min={0} max={120} value={form.age ?? ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" name="weight" type="number" min={0} max={350} value={form.weight ?? ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input id="height" name="height" type="number" min={0} max={250} value={form.height ?? ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Input id="allergies" name="allergies" value={form.allergies || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reactions">Reacciones</Label>
                <Input id="reactions" name="reactions" value={form.reactions || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Fecha de nacimiento</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" value={form.dateOfBirth || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <select id="gender" name="gender" className="w-full rounded-md border px-3 py-2" value={form.gender || "male"} onChange={handleChange}>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorName">Doctor</Label>
                <Input id="doctorName" name="doctorName" value={form.doctorName || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorContact">Contacto del Doctor</Label>
                <Input id="doctorContact" name="doctorContact" value={form.doctorContact || ""} onChange={handleChange} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button type="submit" disabled={isUploading}>Guardar</Button>
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
            {profile.photoUrl && (
              <img src={profile.photoUrl} alt="Perfil" className="h-24 w-24 rounded-full object-cover mb-4" />
            )}
            <p><strong>Edad:</strong> {profile.age ?? "—"}</p>
            <p><strong>Peso:</strong> {profile.weight ?? "—"} kg</p>
            <p><strong>Altura:</strong> {profile.height ?? "—"} cm</p>
            <p><strong>Alergias:</strong> {profile.allergies || "—"}</p>
            <p><strong>Reacciones:</strong> {profile.reactions || "—"}</p>
            <p><strong>Fecha de nacimiento:</strong> {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "—"}</p>
            <p><strong>Género:</strong> {profile.gender ?? "—"}</p>
            <p><strong>Doctor:</strong> {profile.doctorName || "—"}</p>
            <p><strong>Contacto Doctor:</strong> {profile.doctorContact || "—"}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="mb-4 text-center text-muted-foreground">No hay información del paciente disponible</p>
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
