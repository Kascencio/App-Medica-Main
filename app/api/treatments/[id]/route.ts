import { NextRequest, NextResponse } from 'next/server'
import prisma                         from '@/lib/prisma'
import { z }                          from 'zod'

const IdSchema = z.number().int().positive()

/* ───── GET /api/treatments/[id] ───── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = IdSchema.parse(Number(params.id))

    const treatment = await prisma.treatment.findUnique({ where: { id } })
    if (!treatment)
      return NextResponse.json({ error: 'Tratamiento no encontrado' }, { status: 404 })

    return NextResponse.json(treatment)
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    console.error('[TREAT-GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* ───── DELETE /api/treatments/[id] ───── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = IdSchema.parse(Number(params.id))

    await prisma.treatment.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    if (err.code === 'P2025')
      return NextResponse.json({ error: 'Tratamiento no encontrado' }, { status: 404 })

    console.error('[TREAT-DELETE]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
