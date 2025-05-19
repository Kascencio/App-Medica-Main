// app/api/caregiver-invites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z }           from 'zod'
import prisma          from '@/lib/prisma'
import { nanoid }      from 'nanoid'          

const bodySchema = z.object({
  patientProfileId: z.number().int().positive()
})

export async function POST (req: NextRequest) {
  try {
    const { patientProfileId } = bodySchema.parse(await req.json())

    // 8-caracteres, alfanumérico
    const code = nanoid(8).toUpperCase()

    const invite = await prisma.caregiverInvite.create({
      data: {
        code,
        patientProfileId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48) // 48 h
      }
    })

    return NextResponse.json(invite, { status: 201 })
  } catch (err) {
    console.error('[INVITE-CREATE]', err)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
}

// app/api/caregiver-invites/route.ts (mismo archivo donde creaste el POST)
export async function GET(req: NextRequest) {
  const pid = Number(req.nextUrl.searchParams.get('patientProfileId'))
  if (!pid) return NextResponse.json({ error:'Falta patientProfileId' }, { status:400 })

  const list = await prisma.caregiverInvite.findMany({
    where: { patientProfileId: pid, used:false, expiresAt:{ gt: new Date() } },
    orderBy:{ createdAt:'desc' }
  })
  return NextResponse.json(list)
}

