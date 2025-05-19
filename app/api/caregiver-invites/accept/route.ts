// app/api/caregiver-invites/accept/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma     from '@/lib/prisma'
import { z }      from 'zod'

const schema = z.object({ code: z.string().length(8).toUpperCase() })

export async function POST (req: NextRequest) {
  try {
    const { code }   = schema.parse(await req.json())
    const invite     = await prisma.caregiverInvite.findUnique({ where: { code } })

    if (!invite || invite.used || invite.expiresAt < new Date())
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 })

    /** 1️⃣ usuario autenticado = cuidador */
    const caregiverId = (req as any).user?.id   // ← tu middleware auth (o adapta)

    if (!caregiverId)
      return NextResponse.json({ error: 'Auth requerida' }, { status: 401 })

    /** 2️⃣  crea/actualiza permiso */
    await prisma.permission.upsert({
      where: {
        patientProfileId_caregiverId: {
          patientProfileId: invite.patientProfileId,
          caregiverId
        }
      },
      update: { level: 'WRITE' },        // <- nivel por defecto
      create: {
        patientProfileId: invite.patientProfileId,
        caregiverId,
        level: 'WRITE'
      }
    })

    /** 3️⃣  marca usado */
    await prisma.caregiverInvite.update({
      where: { id: invite.id },
      data:  { used: true }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[INVITE-ACCEPT]', err)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
}
