"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, Role } from "@/lib/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KeySquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, User, Lock } from "lucide-react";

export default function LoginPage() {
  /* ---------------------------------------------------------- */
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "PATIENT" as Role,
    inviteCode: "",
  });

  const { login, register } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  /* ---------------------------- LOGIN ----------------------------- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginData.email, loginData.password);
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message ?? "Credenciales incorrectas",
        variant: "destructive",
      });
    }
  };

  /* --------------------------- REGISTER --------------------------- */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }

    try {
      await register(
        registerData.email,
        registerData.password,
        registerData.role,
        registerData.role === "CAREGIVER" ? registerData.inviteCode : undefined,
      );
      toast({ title: "Registro exitoso", description: "Sesión iniciada" });
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error de registro",
        description: err.message ?? "No se pudo completar el registro",
        variant: "destructive",
      });
    }
  };

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            Agenda Electrónica Médica
          </CardTitle>
          <CardDescription>Para pacientes y cuidadores</CardDescription>
        </CardHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          {/* ------------------------ LOGIN ------------------------ */}
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-4">
                {/* email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      className="pl-10"
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData({ ...loginData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidó su contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label="Mostrar/ocultar"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Iniciar Sesión
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          {/* ---------------------- REGISTER ---------------------- */}
          <TabsContent value="register">
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4 pt-4">
                {/* email */}
                <div className="space-y-2">
                  <Label htmlFor="register-email">Correo electrónico</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      className="pl-10"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                {/* password */}
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label="Mostrar/ocultar"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* confirm */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={registerData.confirmPassword}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Usuario</Label>
                  <select
                    id="role"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={registerData.role}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        role: e.target.value as Role,
                      })
                    }
                  >
                    <option value="PATIENT">Paciente</option>
                    <option value="CAREGIVER">Cuidador/Familiar</option>
                  </select>
                </div>
                            {registerData.role === "CAREGIVER" && (
              <div className="space-y-2">
                <Label htmlFor="invite">Código de Invitación</Label>
                <div className="relative">
                  <KeySquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite"
                    placeholder="XXXX-XXXX"
                    className="pl-10 uppercase tracking-widest"
                    value={registerData.inviteCode}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        inviteCode: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Registrarse
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
