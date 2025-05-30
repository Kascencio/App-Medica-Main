import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
  'mailto:you@example.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { title, body } = req.body;
  try {
    const subs = await prisma.pushSubscription.findMany();
    await Promise.all(subs.map(async sub => {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body })
      );
    }));
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Push send error:', err);
    res.status(500).json({ error: 'Push error' });
  }
}