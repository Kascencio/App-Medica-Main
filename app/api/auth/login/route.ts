import { NextRequest, NextResponse } from "next/server"
import prisma                         from "@/lib/prisma"
import { z }                          from "zod"
import bcrypt                         from "bcryptjs"
import jwt                            from "jsonwebtoken"

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const { email, password } = LoginSchema.parse(await req.json())

    // Traemos al usuario y, si es cuidador, sus permisos
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        givenPermissions: {
          where: { level: "WRITE" },
          include: {
            patientProfile: {
              select: { id: true, user: { select: { name: true } } }
            }
          }
        }
      }
    })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    // Preparamos los datos del token y la respuesta
    let profileId: number | null   = null
    let patientName: string | null = null
    let permissions: Record<string, boolean> = {}

    if (user.role === "PATIENT") {
      profileId = user.profile?.id ?? null
      // Paciente = puede ver y gestionar TODO
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
      // Cuidador: tomamos el primer permiso WRITE
      const perm = user.givenPermissions[0]
      if (perm) {
        profileId   = perm.patientProfileId
        patientName = perm.patientProfile.user.name
        // Cuidador WRITE = puede ver y gestionar TODO
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
    }

    // Firmamos el JWT incluyendo permissions
    const token = jwt.sign(
      { sub: user.id, role: user.role, profileId, patientName, permissions },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    )

    return NextResponse.json(
      {
        token,
        user: {
          id:          user.id,
          email,
          role:        user.role,
          profileId,
          patientName,
          permissions,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    const isZod = err instanceof z.ZodError
    console.error("[LOGIN]", err)
    return NextResponse.json(
      { error: isZod ? "Datos inválidos" : "Error interno" },
      { status: isZod ? 400 : 500 }
    )
  }
}
