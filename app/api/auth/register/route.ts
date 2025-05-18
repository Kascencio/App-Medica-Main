import { NextRequest, NextResponse } from "next/server";
import prisma                         from "@/lib/prisma";
import { z }                          from "zod";
import bcrypt                         from "bcryptjs";
import jwt                            from "jsonwebtoken";

const RegisterSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(["PATIENT", "CAREGIVER"]),
});

export async function POST(req: NextRequest) {
  console.log("[REGISTER] petición recibida");

  try {
    /* ---------- body + validación ---------- */
    const { email, password, role } = RegisterSchema.parse(await req.json());
    console.log("[REGISTER] body válido:", { email, role });

    /* ---------- duplicados ---------- */
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      console.warn("[REGISTER] email duplicado");
      return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
    }

    /* ---------- creación ---------- */
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        // Si prefieres crear el perfil automáticamente:
        // ...(role === "PATIENT" && { profile: { create: {} } }),
      },
      include: { profile: true },
    });
    console.log("[REGISTER] user creado → id:", user.id);

    /* ---------- JWT ---------- */
    const token = jwt.sign(
      { sub: user.id, role: user.role, profileId: user.profile?.id },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return NextResponse.json(
      {
        token,
        user: {
          id:    user.id,
          email: user.email,
          role:  user.role,
          profileId: user.profile?.id ?? null,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const isZod = err instanceof z.ZodError;
    console.error("[REGISTER] error:", err);
    return NextResponse.json(
      { error: isZod ? "Datos inválidos" : "Error interno" },
      { status: isZod ? 400 : 500 },
    );
  }
}
