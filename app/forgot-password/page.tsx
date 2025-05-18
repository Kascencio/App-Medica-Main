"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, User } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Llamar al endpoint de recuperación (a implementar)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
      .catch(() => {}) // ignorar error para no revelar si existe o no la cuenta

    toast({
      title: 'Instrucciones enviadas',
      description: 'Si existe una cuenta con este correo, recibirá instrucciones para restablecer su contraseña.'
    })
    setSubmitted(true)
  }

  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center">
            <Link href="/login" className="mr-2">
              <Button variant="ghost" size="icon" aria-label="Volver al login">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold">Recuperar Contraseña</CardTitle>
          </div>
          <CardDescription>Ingrese su correo para recibir instrucciones de recuperación</CardDescription>
        </CardHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Enviar Instrucciones
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <p className="text-center">
                Si existe una cuenta con este correo, recibirá instrucciones para restablecer su contraseña.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Volver al Inicio de Sesión</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}