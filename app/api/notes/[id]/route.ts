import { NextRequest, NextResponse } from 'next/server'
import prisma                         from '@/lib/prisma'
import { z }                          from 'zod'

/* ─── Validación simple con Zod ─── */
const IdSchema = z.number().int().positive()

/* ───── GET /api/notes/[id] ───── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = IdSchema.parse(Number(params.id))

    const note = await prisma.note.findUnique({ where: { id } })
    if (!note)
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

    return NextResponse.json(note)
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    console.error('[NOTE-GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* ───── DELETE /api/notes/[id] ───── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = IdSchema.parse(Number(params.id))

    await prisma.note.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    if (err.code === 'P2025')
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

    console.error('[NOTE-DELETE]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
