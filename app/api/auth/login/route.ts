// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { email, password } = LoginSchema.parse(await req.json());

    // Buscamos al usuario y, si es cuidador, sólo traemos patientProfile.id y patientProfile.name
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        givenPermissions: {
          where: { level: "WRITE" },
          select: {
            patientProfile: {
              select: {
                id:   true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Preparamos los datos para el token y la respuesta
    let profileId: number | null   = null;
    let patientName: string | null = null;
    let permissions: Record<string, boolean> = {};

    if (user.role === "PATIENT") {
      // Si es paciente, puede ver/gestionar todo
      profileId = user.profile?.id ?? null;
      permissions = {
        viewMedications:    true,
        manageMedications:  true,
        viewAppointments:   true,
        manageAppointments: true,
        viewTreatments:     true,
        manageTreatments:   true,
        viewNotes:          true,
        manageNotes:        true,
      };
    } else {
      // Si es cuidador, tomamos el primer permiso WRITE (si existe)
      const perm = user.givenPermissions[0];
      if (perm) {
        profileId   = perm.patientProfile.id;
        patientName = perm.patientProfile.name;
        // Un cuidador con nivel WRITE puede ver/gestionar todo
        permissions = {
          viewMedications:    true,
          manageMedications:  true,
          viewAppointments:   true,
          manageAppointments: true,
          viewTreatments:     true,
          manageTreatments:   true,
          viewNotes:          true,
          manageNotes:        true,
        };
      }
    }

    // Firmamos el JWT incluyendo los permisos
    const token = jwt.sign(
      { sub: user.id, role: user.role, profileId, patientName, permissions },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        token,
        user: {
          id:          user.id,
          email:       user.email,
          role:        user.role,
          profileId,
          patientName,
          permissions,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const isZod = err instanceof z.ZodError;
    console.error("[LOGIN]", err);
    return NextResponse.json(
      { error: isZod ? "Datos inválidos" : "Error interno" },
      { status: isZod ? 400 : 500 }
    );
  }
}
