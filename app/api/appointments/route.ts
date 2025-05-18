import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  patientProfileId: z.number(),
  caregiverId: z.number().optional(),
  title: z.string(),
  description: z.string().optional(),
  dateTime: z.date(), // Cambiamos a tipo date
  location: z.string().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).default('SCHEDULED')
})

// GET con filtros opcionales por patientProfileId
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const patientProfileId = searchParams.get('patientProfileId')
  
  const where = patientProfileId ? { patientProfileId: Number(patientProfileId) } : {}
  
  const list = await prisma.appointment.findMany({
    where,
    orderBy: { dateTime: 'asc' }
  })
  
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Adaptamos los campos del frontend al modelo
    const appointmentData = {
      patientProfileId: body.patientProfileId,
      caregiverId: body.caregiverId,
      title: body.doctorName, // Usamos doctorName como título
      description: `${body.specialty ? `Especialidad: ${body.specialty}\n` : ''}${body.notes || ''}`.trim(),
      dateTime: new Date(body.dateTime),
      location: body.location,
      status: 'SCHEDULED'
    }
    
    const data = createSchema.parse(appointmentData)
    const created = await prisma.appointment.create({ data })
    
    // Adaptamos la respuesta al formato esperado por el frontend
    const adaptedResponse = {
      id: created.id,
      patientProfileId: created.patientProfileId,
      doctorName: created.title,
      specialty: body.specialty || '',
      location: created.location || '',
      date: created.dateTime.toISOString(),
      time: body.time,
      notes: body.notes || ''
    }
    
    return NextResponse.json(adaptedResponse, { status: 201 })
  } catch (error) {
    console.error('Error al crear cita:', error)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
}