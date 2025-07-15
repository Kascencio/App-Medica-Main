// app/api/patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema de validación para creación/actualización
const upsertSchema = z.object({
  userId: z.number().int().positive(),
  photoUrl: z.string().url().optional(),
  name: z.string().min(1).optional(),
  age: z.number().int().nonnegative().optional(),
  weight: z.coerce.number().int().nonnegative().optional(),
  height: z.coerce.number().int().nonnegative().optional(),
  allergies: z.string().optional(),
  reactions: z.string().optional(),
  dateOfBirth: z.string().optional(), // ISO date string
  gender: z.enum(["male", "female", "other"]).optional(),
  doctorName: z.string().optional(),
  doctorContact: z.string().optional(),
});

/**
 * GET /api/patients?userId=#
 * Devuelve el perfil del paciente para el userId indicado.
 */
export async function GET(req: NextRequest) {
  const userIdParam = req.nextUrl.searchParams.get("userId");
  const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;
  if (!userId) {
    return NextResponse.json({ error: "Falta userId" }, { status: 400 });
  }

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });
  if (!profile) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(profile);
}

/**
 * POST /api/patients
 * Crea o actualiza (upsert) el PatientProfile para el userId dado.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = upsertSchema.parse(body);

    const profile = await prisma.patientProfile.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        photoUrl: data.photoUrl,
        name: data.name,
        age: data.age,
        weight: data.weight,
        height: data.height,
        allergies: data.allergies || "",
        reactions: data.reactions || "",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender,
        doctorName: data.doctorName,
        doctorContact: data.doctorContact,
      },
      update: {
        photoUrl: data.photoUrl,
        name: data.name,
        age: data.age,
        weight: data.weight,
        height: data.height,
        allergies: data.allergies || "",
        reactions: data.reactions || "",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender,
        doctorName: data.doctorName,
        doctorContact: data.doctorContact,
      },
    });

    return NextResponse.json(profile, { status: 200 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: err.errors },
        { status: 400 }
      );
    }
    console.error("❌ Error en POST /api/patients:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}