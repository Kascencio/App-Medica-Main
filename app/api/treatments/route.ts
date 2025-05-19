import { NextRequest, NextResponse } from 'next/server'
import prisma                         from '@/lib/prisma'
import { z }                          from 'zod'

/** ─── Validación del body ────────────────────────────── */
const TreatmentCreate = z.object({
  patientProfileId: z.number().int().positive(),

  title:       z.string().min(1),
  description: z.string().optional(),

  startDate:   z.string().datetime(), // ISO
  endDate:     z.string().datetime().optional(),
  progress:    z.string().optional(),
})

/** ─── GET /api/treatments?patientProfileId=123 ───────── */
export async function GET(req: NextRequest) {
  const pid = Number(req.nextUrl.searchParams.get('patientProfileId'))

  if (!pid)
    return NextResponse.json(
      { error: 'Falta patientProfileId' },
      { status: 400 },
    )

  const list = await prisma.treatment.findMany({
    where:   { patientProfileId: pid },
    orderBy: { startDate: 'asc' },
  })

  return NextResponse.json(list)
}

/** ─── POST /api/treatments ───────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const raw  = await req.json()
    const data = TreatmentCreate.parse(raw)

    const created = await prisma.treatment.create({
      data: {
        patientProfileId: data.patientProfileId,
        title:       data.title,
        description: data.description,
        startDate:   new Date(data.startDate),
        endDate:     data.endDate ? new Date(data.endDate) : undefined,
        progress:    data.progress,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', issues: err.issues },
        { status: 400 },
      )
    }

    console.error('[TREAT-POST]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
