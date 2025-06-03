// app/api/caregivers/patients/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    // 1) Leer la cookie "jwt"
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "No autorizado (falta token)" },
        { status: 401 }
      );
    }

    // 2) Verificar y decodificar el JWT
    let decoded: { sub: string | number; role: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        sub: string | number;
        role: string;
      };
    } catch {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }

    // 3) Verificar que el rol sea CAREGIVER
    if (decoded.role !== "CAREGIVER") {
      return NextResponse.json(
        { error: "No autorizado (no eres cuidador)" },
        { status: 401 }
      );
    }

    // 4) Convertir `sub` a número
    const caregiverId = Number(decoded.sub);
    if (isNaN(caregiverId)) {
      return NextResponse.json(
        { error: "ID de cuidador inválido" },
        { status: 401 }
      );
    }

    // 5) Recuperar todas las filas de `permission` para este caregiverId
    //    y extraer la lista de pacientes asociados (id + name)
    const permisos = await prisma.permission.findMany({
      where: { caregiverId: caregiverId },
      select: {
        patientProfile: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 6) Mapear a [{ id, name }, ...]
    const pacientes = permisos.map((p) => ({
      id: p.patientProfile.id,
      name: p.patientProfile.name,
    }));

    return NextResponse.json(pacientes);
  } catch (err) {
    console.error("[GET /api/caregivers/patients] Error interno:", err);
    return NextResponse.json(
      { error: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}
