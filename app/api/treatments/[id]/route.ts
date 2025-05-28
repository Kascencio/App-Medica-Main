import { NextRequest, NextResponse } from 'next/server'
import prisma                         from '@/lib/prisma'
import { z }                          from 'zod'

const idSchema = z.coerce.number().int().positive();

/* ─── validación del body ─────────────────────────── */
const updateSchema = z.object({
  title:      z.string().min(1).optional(),
  description:    z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate:   z.string().datetime().optional(),
  progress:     z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1️⃣ Validación del ID
  let id: number;
  try {
    id = idSchema.parse(params.id);
  } catch {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // 2️⃣ Parseo y validación del payload
  let data: z.infer<typeof updateSchema>;
  try {
    data = updateSchema.parse(await req.json());
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: err.issues },
        { status: 400 }
      );
    }
    throw err;
  }

  // 3️⃣ Ejecutar la actualización
  try {
    const updated = await prisma.treatment.update({
      where: { id },
      data: {
        ...(data.title      && { title: data.title }),
        ...(data.description      && { description: data.description }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate   && { endDate:   new Date(data.endDate) }),
        ...(data.progress     && { progress:     data.progress }),
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    console.error("❌ PATCH /api/treatments/:id →", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/* ─── GET /api/treatments/[id] ────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = idSchema.parse(Number(params.id))

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

/* ─── DELETE /api/treatments/[id] ─────────────────────── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = idSchema.parse(Number(params.id))

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
