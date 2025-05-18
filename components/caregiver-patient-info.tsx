"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, User } from 'lucide-react'

interface PatientData {
  id: number
  name: string
  age?: number
  sex?: 'male' | 'female' | 'other'
  bloodType?: string
  conditions?: string
  allergies?: string
  contraindications?: string
  photoUrl?: string | null
}

export function CaregiverPatientInfo() {
  const { user } = useAuth()
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Si el usuario es cuidador y tiene un paciente asignado, cargar datos desde la API
    if (user?.role === 'CAREGIVER' && (user as any).patientId) {
      const controller = new AbortController()

      fetch(`/api/patients/${(user as any).patientId}`, {
        signal: controller.signal
      })
        .then((res) => {
          if (!res.ok) throw new Error('Error al obtener datos del paciente')
          return res.json()
        })
        .then((data: PatientData) => setPatientData(data))
        .catch(console.error)
        .finally(() => setLoading(false))

      return () => controller.abort()
    }

    // Caso sin paciente asignado
    setLoading(false)
  }, [user])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 rounded-lg bg-muted"></div>
      </div>
    )
  }

  if (!(user as any)?.patientId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No tiene acceso a ningún paciente. Por favor, contacte al administrador.
        </AlertDescription>
      </Alert>
    )
  }

  if (!patientData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No hay información del paciente disponible</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Paciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p>{patientData.name}</p>
              </div>
              {patientData.age !== undefined && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Edad</p>
                  <p>{patientData.age} años</p>
                </div>
              )}
              {patientData.sex && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Sexo</p>
                  <p>
                    {patientData.sex === 'male' && 'Masculino'}
                    {patientData.sex === 'female' && 'Femenino'}
                    {patientData.sex === 'other' && 'Otro'}
                  </p>
                </div>
              )}
              {patientData.bloodType && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tipo de Sangre</p>
                  <p>{patientData.bloodType}</p>
                </div>
              )}
            </div>
            {patientData.conditions && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Enfermedades Crónicas/Condiciones</p>
                <p>{patientData.conditions}</p>
              </div>
            )}
            <div className="grid gap-2 md:grid-cols-2">
              {patientData.allergies && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Alergias</p>
                  <p>{patientData.allergies}</p>
                </div>
              )}
              {patientData.contraindications && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Contraindicaciones</p>
                  <p>{patientData.contraindications}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center md:w-1/4">
            {patientData.photoUrl ? (
              <img
                src={patientData.photoUrl}
                alt="Foto del paciente"
                className="h-32 w-32 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                <User className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}