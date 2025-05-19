import { NextRequest, NextResponse } from "next/server"
import prisma                         from "@/lib/prisma"
import { z }                          from "zod"
import bcrypt                         from "bcryptjs"
import jwt                            from "jsonwebtoken"

const RegisterSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(6),
  role:       z.enum(["PATIENT", "CAREGIVER"]),
  inviteCode: z.string().trim().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { email, password, role, inviteCode } = RegisterSchema.parse(await req.json())

    // No duplicados
    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    let profileId: number | null   = null
    let patientName: string | null = null
    let permissions: Record<string, boolean> = {}

    if (role === "PATIENT") {
      // Creamos usuario + perfil vacío
      const u = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role,
          profile: { create: {} },
        },
        include: { profile: true },
      })
      profileId = u.profile!.id
      // Paciente puede TODO
      permissions = {
        viewMedications:    true,
        manageMedications:  true,
        viewAppointments:   true,
        manageAppointments: true,
        viewTreatments:     true,
        manageTreatments:   true,
        viewNotes:          true,
        manageNotes:        true,
      }
    } else {
      // Cuidador: necesita código
      if (!inviteCode) {
        return NextResponse.json({ error: "Falta código de invitación" }, { status: 400 })
      }
      // Buscamos invite activo (used=false)
      const inv = await prisma.caregiverInvite.findFirst({
        where: {
          code: inviteCode,
          used: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          patientProfile: { select: { id: true, user: { select: { name: true } } } }
        }
      })
      if (!inv) {
        return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 })
      }

      // 1) creamos el usuario cuidador
      const u = await prisma.user.create({
        data: { email, passwordHash, role }
      })

      // 2) damos permiso WRITE (o ADMIN) sobre ese perfil
      await prisma.permission.create({
        data: {
          caregiverId:      u.id,
          patientProfileId: inv.patientProfileId,
          level:            "ADMIN",  // máximo nivel
        }
      })

      // 3) marcamos el invite como usado
      await prisma.caregiverInvite.update({
        where: { id: inv.id },
        data:  { used: true }
      })

      profileId   = inv.patientProfileId
      patientName = inv.patientProfile.user.name
      // Cuidador puede TODO
      permissions = {
        viewMedications:    true,
        manageMedications:  true,
        viewAppointments:   true,
        manageAppointments: true,
        viewTreatments:     true,
        manageTreatments:   true,
        viewNotes:          true,
        manageNotes:        true,
      }
    }

    // Generamos el token
    const token = jwt.sign(
      { sub: email, role, profileId, patientName, permissions },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    )

    return NextResponse.json(
      {
        token,
        user: { id: null, email, role, profileId, patientName, permissions }
      },
      { status: 201 }
    )
  } catch (err) {
    const isZod = err instanceof z.ZodError
    console.error("[REGISTER]", err)
    return NextResponse.json(
      { error: isZod ? "Datos inválidos" : "Error interno" },
      { status: isZod ? 400 : 500 }
    )
  }
}
