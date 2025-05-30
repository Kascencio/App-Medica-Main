// components/NotificationProvider.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Este hook registrará el SW y la suscripción push
  usePushSubscription();
  return <>{children}</>;
}
