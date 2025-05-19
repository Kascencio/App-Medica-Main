// app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

/** ─── Validación del parámetro ───────────────────── */
const idSchema = z.coerce.number().int().positive()

/** ─── Validación del body ────────────────────────── */
const updateSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  dateTime:    z.string().datetime().optional(),  // ISO
  location:    z.string().optional(),
  status:      z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1️⃣ Validar el ID
  let id: number
  try {
    id = idSchema.parse(params.id)
  } catch {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  // 2️⃣ Validar y parsear el payload
  let data: z.infer<typeof updateSchema>
  try {
    data = updateSchema.parse(await req.json())
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', issues: err.issues },
        { status: 400 }
      )
    }
    throw err
  }

  // 3️⃣ Ejecutar la actualización
  try {
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.title       && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.dateTime    && { dateTime: new Date(data.dateTime) }),
        ...(data.location    && { location: data.location }),
        ...(data.status      && { status: data.status }),
      },
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }
    console.error('❌ PATCH /api/appointments/:id →', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1️⃣ Validar el ID
  let id: number
  try {
    id = idSchema.parse(params.id)
  } catch {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  // 2️⃣ Ejecutar la eliminación
  try {
    await prisma.appointment.delete({ where: { id } })
    return NextResponse.json({ message: 'Cita eliminada' }, { status: 200 })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }
    console.error('❌ DELETE /api/appointments/:id →', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}