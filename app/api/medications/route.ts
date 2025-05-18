import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

/* ---------- Validaciones ---------- */
const createSchema = z.object({
  patientProfileId: z.number().int().positive(),
  name:      z.string().min(1),
  dosage:    z.string().min(1),
  type:      z.string().min(1),
  frequency: z.enum(["daily", "weekly", "custom"]),
  startDate: z.string().datetime(),        // ISO -> Date
  notes:     z.string().optional(),
});

/* ---------- GET /api/medications ---------- *
 * ?patientProfileId=123                       *
 * ------------------------------------------ */
export async function GET(req: NextRequest) {
  const pid = Number(req.nextUrl.searchParams.get("patientProfileId"));

  if (!pid) {
    return NextResponse.json(
      { error: "Falta patientProfileId" },
      { status: 400 },
    );
  }

  const meds = await prisma.medication.findMany({
    where: { patientProfileId: pid },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(meds);
}

/* ---------- POST /api/medications ---------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    //  ➜ crea el registro
    const med = await prisma.medication.create({
      data: {
        patientProfileId: data.patientProfileId,
        name:      data.name,
        dosage:    data.dosage,
        type:      data.type,
        frequency: data.frequency,
        startDate: new Date(data.startDate),
        notes:     data.notes,
      },
    });

    return NextResponse.json(med, { status: 201 });
  } catch (err: unknown) {
    /* --- Errores de validación --- */
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: err.issues },
        { status: 400 },
      );
    }

    /* --- Otros errores --- */
    console.error("❌  POST /api/medications →", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 },
    );
  }
}
