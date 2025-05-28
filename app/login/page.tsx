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
import { Heart, Zap } from "lucide-react"
import { PasswordValidator } from "@/components/password-validator"
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, User, Lock, Activity, Shield, X} from "lucide-react";

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

  const [isPasswordValid, setIsPasswordValid] = useState(false)
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
    <div className="min-h-screen bg-gradient-to-br from-medical-50 via-blue-50 to-health-50 flex items-center justify-center p-4">
       <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-medical-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-health-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header con logo y título */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-24 h-24 bg-gradient-medical rounded-full shadow-sm">
            <img src="/img/logo-cur.webp" alt="Logo-curabyte" className="rounded-full w-full" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">CuraByte</h1>
          <p className="text-slate-600 mt-2">Tu salud, inteligentemente gestionada</p>
        </div>
      <Card className="mx-auto w-full max-w-md">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl font-bold text-slate-800">Bienvenido a CuraByte</CardTitle>
            <CardDescription className="text-slate-600">Accede a tu agenda médica inteligente</CardDescription>
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
                    <PasswordValidator
                      password={registerData.password}
                      onPasswordChange={(password) => setRegisterData({ ...registerData, password })}
                      onValidationChange={setIsPasswordValid}
                      placeholder="Crea una contraseña segura"
                    />
                  </div>
                </div>

                {/* confirm */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-slate-700 font-medium">
                      Confirmar Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirma tu contraseña"
                        className="pl-10 border-slate-200 focus:border-health-400 focus:ring-health-400/20"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                      <p className="text-xs text-red-600 flex items-center mt-1">
                        <X className="h-3 w-3 mr-1" />
                        Las contraseñas no coinciden
                      </p>
                    )}
                    {registerData.confirmPassword &&
                      registerData.password === registerData.confirmPassword &&
                      registerData.password.length > 0 && (
                        <p className="text-xs text-green-600 flex items-center mt-1">
                          <Shield className="h-3 w-3 mr-1" />
                          Las contraseñas coinciden
                        </p>
                      )}
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
              <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in">
          <div className="text-center">
            <div className="medical-icon mx-auto mb-2">
              <Heart className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-600">Seguro</p>
          </div>
          <div className="text-center">
            <div className="health-icon mx-auto mb-2">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-600">Inteligente</p>
          </div>
          <div className="text-center">
            <div className="warning-icon mx-auto mb-2">
              <Shield className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-600">Confiable</p>
          </div>
        </div>
    </div>
    </div>
  );
}
