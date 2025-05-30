// app/api/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/subscribe
 * Crea o actualiza la suscripción push en la BD
 */
export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json()
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { keys: subscription.keys },
      create: { endpoint: subscription.endpoint, keys: subscription.keys },
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

/**
 * DELETE /api/subscribe?endpoint=…
 * Elimina una suscripción push de la BD
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }
    await prisma.pushSubscription.delete({ where: { endpoint } })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
