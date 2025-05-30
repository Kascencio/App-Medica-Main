"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * NotificationProvider lee la preferencia de notificaciones de localStorage
 * y suscribe o desuscribe la PWA a Push según esa configuración.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const [enabled, setEnabled] = useState<boolean>(false);

  // Al montar, leemos la preferencia guardada
  useEffect(() => {
    try {
      const raw = localStorage.getItem("notifPrefs");
      if (raw) {
        const prefs = JSON.parse(raw) as { medication?: boolean };
        setEnabled(!!prefs.medication);
      }
    } catch (_) {
      setEnabled(false);
    }
  }, []);

  // Usamos el hook para suscribir o desuscribir
  usePushSubscription(enabled);

  return <>{children}</>;
}
