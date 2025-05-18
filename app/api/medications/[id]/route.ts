import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

/* ---------- validación de parámetro ---------- */
const idSchema = z.coerce.number().int().positive();

/* ---------- DELETE /api/medications/:id ---------- */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  let id: number;
  try {
    id = idSchema.parse(params.id);
  } catch {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.medication.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      // registro no existe
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    console.error("❌  DELETE /api/medications/:id →", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
