import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const idSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) })
const patchSchema = z.object({
  level: z.enum(['READ', 'WRITE', 'ADMIN']).optional()
})

export async function GET(_req: NextRequest, { params }: { params: Record<string, string> }) {
  const { id } = idSchema.parse(params)
  const permission = await prisma.permission.findUnique({ where: { id } })
  if (!permission) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(permission)
}

export async function PATCH(req: NextRequest, { params }: { params: Record<string, string> }) {
  const { id } = idSchema.parse(params)
  const body = await req.json()
  const data = patchSchema.parse(body)
  const updated = await prisma.permission.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Record<string, string> }) {
  const { id } = idSchema.parse(params)
  await prisma.permission.delete({ where: { id } })
  return NextResponse.json({ success: true })
}