// app/api/treatments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const treatmentCreateSchema = z.object({
  patientProfileId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  progress: z.string().optional()
})

export async function GET() {
  try {
    const list = await prisma.treatment.findMany()
    return NextResponse.json(list)
  } catch (error) {
    console.error('Error fetching treatments:', error)
    return NextResponse.json({ error: 'Error al cargar tratamientos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = treatmentCreateSchema.parse(body)
    const created = await prisma.treatment.create({ data })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating treatment:', error)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
}