// app/api/caregivers/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { z } from "zod";

const bodySchema = z.object({
  inviteCode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    if (decoded.role !== "CAREGIVER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const caregiverId = Number(decoded.sub);
    if (isNaN(caregiverId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = bodySchema.parse(body);

    // Buscar invite
    const invite = await prisma.caregiverInvite.findUnique({
      where: { code: inviteCode },
    });
    if (!invite) {
      return NextResponse.json({ error: "Código no existe" }, { status: 404 });
    }
    if (invite.used) {
      return NextResponse.json({ error: "Código ya usado" }, { status: 400 });
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Código expirado" }, { status: 400 });
    }

    const patientProfileId = invite.patientProfileId;

    // Crear permiso READ por defecto
    await prisma.permission.upsert({
      where: {
        patientProfileId_caregiverId: {
          patientProfileId,
          caregiverId,
        },
      },
      update: {},
      create: {
        patientProfileId,
        caregiverId,
        level: "READ",
      },
    });

    // Marcar invite como usado
    await prisma.caregiverInvite.update({
      where: { id: invite.id },
      data: { used: true },
    });

    return NextResponse.json({ success: true, patientProfileId });
  } catch (err: any) {
    console.error("[POST /api/caregivers/join] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
