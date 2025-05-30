// app/layout.tsx (o wherever RootLayout lives)
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-provider"
import { ToastProvider } from "@/components/ui/toast"
import dynamic from "next/dynamic";
import { ClientToaster } from "@/components/ui/ClientToaster";
import { NotificationProvider } from "@/components/NotificationProvider";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RecuerdaMed",
  description: "Aplicación para gestionar tratamientos médicos en el hogar",
  generator: 'Next.js',
  applicationName: "RecuerdaMed",
  keywords: [
    "agenda médica",
    "tratamientos médicos",
    "cuidado en el hogar",
    "recordatorios de medicación",
    "gestión de salud"
  ]
}

export default function RootLayout({
  children,
}
: {
  children: React.ReactNode
}) {
  
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" >
          <AuthProvider>
            <ToastProvider>
              <NotificationProvider>
              {children}
              <ClientToaster />
              </NotificationProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
