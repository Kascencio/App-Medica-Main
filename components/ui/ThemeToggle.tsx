"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "./button"

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Para evitar mismatches SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // tema activo real
  const currentTheme = theme === "system" ? systemTheme : theme

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        setTheme(currentTheme === "dark" ? "light" : "dark")
      }}
    >
      {currentTheme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
