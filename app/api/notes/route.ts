import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const noteCreateSchema = z.object({
  patientProfileId: z.number(),
  authorId: z.number().optional(),
  content: z.string()
})

export async function GET() {
  const list = await prisma.note.findMany()
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = noteCreateSchema.parse(body)
    const created = await prisma.note.create({ data })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
}