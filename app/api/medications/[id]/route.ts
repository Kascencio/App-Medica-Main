// app/api/medications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

/* ─── validación de parámetro ─────────────────────── */
const idSchema = z.coerce.number().int().positive();

/* ─── validación del body ─────────────────────────── */
const updateSchema = z.object({
  name:      z.string().min(1).optional(),
  dosage:    z.string().min(1).optional(),
  type:      z.string().min(1).optional(),
  frequency: z.enum(["daily", "weekly", "custom"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate:   z.string().datetime().optional(),
  notes:     z.string().optional(),
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
    const updated = await prisma.medication.update({
      where: { id },
      data: {
        ...(data.name      && { name: data.name }),
        ...(data.dosage    && { dosage: data.dosage }),
        ...(data.type      && { type: data.type }),
        ...(data.frequency && { frequency: data.frequency }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate   && { endDate:   new Date(data.endDate) }),
        ...(data.notes     && { notes:     data.notes }),
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    console.error("❌ PATCH /api/medications/:id →", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
export async function DELETE(
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

  // 2️⃣ Ejecutar la eliminación
  try {
    await prisma.medication.delete({ where: { id } });
    return NextResponse.json({ message: "Eliminado" }, { status: 200 });
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    console.error("❌ DELETE /api/medications/:id →", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}