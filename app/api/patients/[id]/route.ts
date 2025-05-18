import { NextRequest, NextResponse } from "next/server";
import prisma                         from "@/lib/prisma";
import { z }                          from "zod";

/* ─── validación ─────────────────────────────────────── */
const idSchema    = z.coerce.number().int().positive();   // “1” → 1
const updateSchema = z.object({
  name:              z.string().min(1).optional(),
  age:               z.coerce.number().int().nonnegative().optional(),
  gender:            z.enum(["male", "female", "other"]).optional(),
  bloodType:         z.string().optional(),
  conditions:        z.string().optional(),
  allergies:         z.string().optional(),
  contraindications: z.string().optional(),
  photoUrl:          z.string().url().optional(),
});

/* ─── GET /api/patients/[id] ─────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = idSchema.parse(params.id);

    const profile = await prisma.patientProfile.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!profile) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("❌ GET /patients/[id]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/* ─── PATCH /api/patients/[id] ───────────────────────── */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id   = idSchema.parse(params.id);
    const body = updateSchema.parse(await req.json());

    const updated = await prisma.patientProfile.update({
      where: { id },
      data : {
        ...body,
        ...(body.name && { name: body.name }), // si hay campo name en el modelo
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", issues: err.errors }, { status: 400 });
    }
    if ((err as any)?.code === "P2025") {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }
    console.error("❌ PATCH /patients/[id]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
