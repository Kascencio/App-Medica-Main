// app/layout.tsx (o wherever RootLayout lives)
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-provider"

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
}: {
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
            <Toaster />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
