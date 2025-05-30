import webpush from 'web-push';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Lee las claves en tiempo de petición
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error('Faltan VAPID keys en ENV');
    return res.status(500).json({ error: 'Push configuration error' });
  }

  // Configura aquí, ya dentro del handler
  webpush.setVapidDetails(
    'mailto:soporte@tu-dominio.com',
    publicKey,
    privateKey
  );

  const { title, body } = req.body;
  try {
    const subs = await prisma.pushSubscription.findMany();
    await Promise.all(subs.map((sub: { endpoint: any; keys: any; }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body })
      )
    ));
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Push send error:', err);
    res.status(500).json({ error: 'Push error' });
  }
}
