import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  patientProfileId: z.number(),
  caregiverId: z.number(),
  level: z.enum(['READ', 'WRITE', 'ADMIN']).default('READ')
})

export async function GET() {
  const permissions = await prisma.permission.findMany()
  return NextResponse.json(permissions)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const permission = await prisma.permission.create({ data })
    return NextResponse.json(permission, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
}