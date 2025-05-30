"use client";

import { useEffect } from 'react';

// Clave pública VAPID expuesta al cliente
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

// Convierte Base64 a Uint8Array como requiere PushManager
async function urlBase64ToUint8Array(base64String: string): Promise<Uint8Array> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Hook para manejar suscripción y desuscripción push
 * @param enabled - si true se suscribe, si false se desuscribe
 */
export function usePushSubscription(enabled: boolean) {
  useEffect(() => {
    // Solo corre en browsers que soporten SW y Push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let registration: ServiceWorkerRegistration;

    // Registra el Service Worker
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registrado');
        registration = reg;
        return reg.pushManager.getSubscription();
      })
      .then(async (existing) => {
        if (enabled) {
          // Si ya existe, retorno; si no, suscribo
          const sub = existing || await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: await urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          console.log('Push Subscription:', sub);
          // Envío al backend
          await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
        } else if (existing) {
          // Desuscribir
          await existing.unsubscribe();
          console.log('Push desuscrito');
          // Informar al backend
          await fetch(`/api/subscribe?endpoint=${encodeURIComponent(existing.endpoint)}`, {
            method: 'DELETE',
          });
        }
      })
      .catch((err) => console.error('Error en Push Subscription:', err));

    // No cleanup necesario
  }, [enabled]);
}
