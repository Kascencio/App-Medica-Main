import { NextRequest, NextResponse } from "next/server";
import prisma                         from "@/lib/prisma";
import { z }                          from "zod";
import bcrypt                         from "bcryptjs";
import jwt                            from "jsonwebtoken";

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  console.log("[LOGIN] petición recibida");

  try {
    /* ---------- body + validación ---------- */
    const { email, password } = LoginSchema.parse(await req.json());
    console.log("[LOGIN] body válido:", email);

    /* ---------- búsqueda de usuario ---------- */
    const user = await prisma.user.findUnique({
      where:   { email },
      include: { profile: true },
    });
    if (!user) {
      console.warn("[LOGIN] usuario no existe");
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    /* ---------- verificación de contraseña ---------- */
    const isPassOk = await bcrypt.compare(password, user.passwordHash);
    if (!isPassOk) {
      console.warn("[LOGIN] password incorrecto");
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    /* ---------- JWT ---------- */
    const token = jwt.sign(
      { sub: user.id, role: user.role, profileId: user.profile?.id },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    console.log("[LOGIN] login OK → id:", user.id, " profileId:", user.profile?.id ?? "—");

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
      { status: 200 },
    );
  } catch (err) {
    const isZod = err instanceof z.ZodError;
    console.error("[LOGIN] error:", err);
    return NextResponse.json(
      { error: isZod ? "Datos inválidos" : "Error interno" },
      { status: isZod ? 400 : 500 },
    );
  }
}
