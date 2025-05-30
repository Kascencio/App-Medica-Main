import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import prisma from "@/lib/prisma";

// VAPID keys loaded from environment
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
webPush.setVapidDetails(
  // Éste email será enviado en los correos de fallback
  'mailto:tu-email@dominio.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);


export async function POST(req: NextRequest) {
  try {
    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
    }
    const subs = await prisma.pushSubscription.findMany();
    await Promise.all(subs.map(async (s) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth }
          },
          JSON.stringify({ title, body })
        );
      } catch (error) {
        console.error("Failed to send push to", s.endpoint, error);
      }
    }));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/sendPush error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
