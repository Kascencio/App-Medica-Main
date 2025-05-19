"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-provider";
import {
  Eye,
  EyeOff,
  User,
  Lock,
  UserPlus,
  Download,
  UserX,
  Plus,
} from "lucide-react";

// ------------ Types --------------
interface Caregiver {
  id: number;
  username: string;
  permissions: Permissions;
}

type Permissions = {
  viewMedications: boolean;
  manageMedications: boolean;
  viewAppointments: boolean;
  manageAppointments: boolean;
  viewTreatments: boolean;
  manageTreatments: boolean;
  viewNotes: boolean;
  manageNotes: boolean;
};

export default function SettingsPage() {
  /* ------------------- Auth + helpers ------------------- */
  const { user, logout } = useAuth();
  const pid =
    user?.role === "PATIENT"
      ? (user as any)?.profileId
      : (user as any)?.patientId;
  const { toast } = useToast();

  /* ------------------- UI state ------------------- */
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [caregiverForm, setCaregiverForm] = useState<{
    email: string;
    tempPassword: string;
    permissions: Permissions;
  }>({
    email: "",
    tempPassword: "",
    permissions: {
      viewMedications: true,
      manageMedications: false,
      viewAppointments: true,
      manageAppointments: false,
      viewTreatments: true,
      manageTreatments: false,
      viewNotes: true,
      manageNotes: false,
    },
  });
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [caregiverLoading, setCaregiverLoading] = useState(false);

  const [notif, setNotif] = useState({
    medication: true,
    appointment: true,
    caregiver: true,
  });

  // SettingsPage.tsx (encabezados de estado)
  const [lastInvite, setLastInvite] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);

  /* ------------------- Effects: fetch caregivers and notif ------------------- */
  useEffect(() => {
    if (!pid || user?.role !== "PATIENT") return;
    const controller = new AbortController();
    fetch(`/api/caregivers?patientProfileId=${pid}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCaregivers)
      .catch(console.error);
    return () => controller.abort();
  }, [pid, user?.role]);

  useEffect(() => {
    const local = localStorage.getItem("notifPrefs");
    if (local) setNotif(JSON.parse(local));
  }, []);
  /* ------------------- Password submit ------------------- */
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new.length < 6) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }
    setPasswordLoading(true);
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      }),
    });
    if (res.ok) {
      toast({ title: "Contraseña actualizada" });
      setPasswordData({ current: "", new: "", confirm: "" });
    } else {
      const { message } = await res.json();
      toast({
        title: "Error",
        description: message || "No se pudo actualizar",
        variant: "destructive",
      });
    }
    setPasswordLoading(false);
  };

  /* ------------------- Add caregiver ------------------- */
  const addCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid) return;
    setCaregiverLoading(true);
    /* dentro del onClick del botón “Generar código” */
    const res = await fetch("/api/caregiver-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientProfileId: pid }),
    });

    if (!res.ok) {
      toast({ title: "Error", variant: "destructive" });
      return;
    }

    const invite = await res.json(); // ← { code, expiresAt, … }
    setLastInvite(invite); // ⬅️  guárdalo en estado
    navigator.clipboard.writeText(invite.code);
    toast({
      title: "Código generado",
      description: `${invite.code} copiado al portapapeles`,
    });
    setCaregiverLoading(false);
    setCaregiverLoading(false);
  };

  const removeCaregiver = async (id: number) => {
    await fetch(`/api/caregivers/${id}`, { method: "DELETE" });
    setCaregivers((c) => c.filter((cg) => cg.id !== id));
  };

  const togglePerm = async (
    id: number,
    key: keyof Permissions,
    value: boolean
  ) => {
    const cg = caregivers.find((c) => c.id === id);
    if (!cg) return;
    const newPerm = { ...cg.permissions, [key]: value };
    // sync logic view->manage etc.
    if (key.startsWith("manage") && value) {
      const viewKey = key.replace("manage", "view") as keyof Permissions;
      newPerm[viewKey] = true;
    }
    if (key.startsWith("view") && !value) {
      const manageKey = key.replace("view", "manage") as keyof Permissions;
      newPerm[manageKey] = false;
    }
    await fetch(`/api/caregivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: newPerm }),
    });
    setCaregivers((c) =>
      c.map((cg) => (cg.id === id ? { ...cg, permissions: newPerm } : cg))
    );
  };

  const exportData = async () => {
    const res = await fetch(`/api/export?patientProfileId=${pid}`);
    if (!res.ok) {
      toast({
        title: "Error",
        description: "No se pudo exportar",
        variant: "destructive",
      });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medical_data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveNotif = (k: keyof typeof notif, v: boolean) => {
    const newN = { ...notif, [k]: v };
    setNotif(newN);
    localStorage.setItem("notifPrefs", JSON.stringify(newN));
  };
  /* ------------------- Render ------------------- */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <Tabs defaultValue="account">
        <TabsList className="flex w-full flex-col sm:flex-row">
          <TabsTrigger value="account">Cuenta</TabsTrigger>
          <TabsTrigger value="caregivers">Cuidadores</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
        </TabsList>

        {/* ------------------- ACCOUNT ------------------- */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{user?.email}</p>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
            </CardHeader>
            <form onSubmit={submitPassword}>
              <CardContent className="space-y-4">
                <div>
                  <Label>Actual</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.current}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        current: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Nueva</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.new}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Confirmar</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.confirm}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirm: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" disabled={passwordLoading}>
                  Guardar
                </Button>
              </CardFooter>
            </form>
          </Card>

        </TabsContent>
        {/* ------------------- CAREGIVERS ------------------- */}
        <TabsContent value="caregivers" className="space-y-4">
          {user?.role !== "PATIENT" ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Solo el paciente puede gestionar cuidadores.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Form nuevo cuidador */}
              {/* ---------- INVITE CODE ---------- */}
              <Card>
                <CardHeader>
                  <CardTitle>Invitar con código</CardTitle>
                  <CardDescription>
                    Comparte el código con tu cuidador. Caduca en 48 horas o
                    tras ser usado.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!pid) return;
                      const res = await fetch("/api/caregiver-invites", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ patientProfileId: pid }),
                      });
                      if (!res.ok)
                        return toast({
                          title: "Error",
                          variant: "destructive",
                        });
                      const invite = await res.json();
                      navigator.clipboard.writeText(invite.code);
                      toast({
                        title: "Código generado",
                        description: `${invite.code} copiado al portapapeles`,
                      });
                      setLastInvite(invite);
                      setCaregiverLoading(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Generar código
                  </Button>
                                      {lastInvite && (
                      <div className="rounded-md border p-3 bg-muted/20 mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Código:</span>
                          <span className="font-mono tracking-widest text-lg">
                            {lastInvite.code}
                          </span>

                          {/* Botón copiar */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              navigator.clipboard.writeText(lastInvite.code);
                              toast({
                                title: "Copiado",
                                description: "Código en portapapeles",
                              });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Caduca:{" "}
                          {format(
                            new Date(lastInvite.expiresAt),
                            "d 'de' MMMM yyyy · HH:mm"
                          )}
                        </p>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Lista cuidadores */}
              {caregivers.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Cuidadores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {caregivers.map((cg) => (
                      <div
                        key={cg.id}
                        className="rounded-md border p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span>{cg.username}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCaregiver(cg.id)}
                          >
                            <UserX />
                          </Button>
                        </div>
                        <Separator />
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(
                            [
                              "viewMedications",
                              "manageMedications",
                              "viewAppointments",
                              "manageAppointments",
                              "viewTreatments",
                              "manageTreatments",
                              "viewNotes",
                              "manageNotes",
                            ] as (keyof Permissions)[]
                          ).map((k) => (
                            <div
                              key={k}
                              className="flex items-center justify-between text-xs"
                            >
                              <span>{k}</span>
                              <Switch
                                checked={cg.permissions[k]}
                                onCheckedChange={(v) => togglePerm(cg.id, k, v)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </TabsContent>

        {/* ------------------- NOTIFICATIONS ------------------- */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Medicamentos</span>
                <Switch
                  checked={notif.medication}
                  onCheckedChange={(v) => saveNotif("medication", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Citas</span>
                <Switch
                  checked={notif.appointment}
                  onCheckedChange={(v) => saveNotif("appointment", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Cuidadores</span>
                <Switch
                  checked={notif.caregiver}
                  onCheckedChange={(v) => saveNotif("caregiver", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
