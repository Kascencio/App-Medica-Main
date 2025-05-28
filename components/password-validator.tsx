"use client"

import { useState, useEffect } from "react"
import { Check, X, Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PasswordValidatorProps {
  password: string
  onPasswordChange: (password: string) => void
  onValidationChange: (isValid: boolean) => void
  placeholder?: string
  className?: string
}

interface ValidationRule {
  id: string
  label: string
  test: (password: string) => boolean
}

const validationRules: ValidationRule[] = [
  {
    id: "length",
    label: "Mínimo 8 caracteres",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Al menos una letra mayúscula",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Al menos una letra minúscula",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Al menos un número",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "Al menos un carácter especial (!@#$%^&*)",
    test: (password) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  },
]

export function PasswordValidator({
  password,
  onPasswordChange,
  onValidationChange,
  placeholder = "Ingrese su contraseña",
  className,
}: PasswordValidatorProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({})
  const [showValidation, setShowValidation] = useState(false)

  useEffect(() => {
    const results: Record<string, boolean> = {}
    validationRules.forEach((rule) => {
      results[rule.id] = rule.test(password)
    })
    setValidationResults(results)

    const isValid = Object.values(results).every(Boolean) && password.length > 0
    onValidationChange(isValid)

    // Mostrar validación solo si el usuario ha empezado a escribir
    setShowValidation(password.length > 0)
  }, [password, onValidationChange])

  const getStrengthLevel = () => {
    const passedRules = Object.values(validationResults).filter(Boolean).length
    if (passedRules === 0) return { level: 0, label: "", color: "" }
    if (passedRules <= 2) return { level: 1, label: "Débil", color: "bg-red-500" }
    if (passedRules <= 3) return { level: 2, label: "Regular", color: "bg-yellow-500" }
    if (passedRules <= 4) return { level: 3, label: "Buena", color: "bg-blue-500" }
    return { level: 4, label: "Excelente", color: "bg-green-500" }
  }

  const strength = getStrengthLevel()

  return (
    <div className={cn("space-y-3", className)}>
      {/* Campo de contraseña */}
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="pr-10 border-slate-200 focus:border-medical-400 focus:ring-medical-400/20"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 py-2 text-slate-400 hover:text-slate-600"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Indicador de fortaleza */}
      {showValidation && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">Fortaleza de la contraseña:</span>
            <span className={cn("text-xs font-medium", strength.level >= 3 ? "text-green-600" : "text-slate-600")}>
              {strength.label}
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="flex space-x-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-2 flex-1 rounded-full transition-all duration-300",
                  strength.level >= level ? strength.color : "bg-slate-200",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lista de requisitos */}
      {showValidation && (
        <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-3">Requisitos de la contraseña:</p>
          <div className="space-y-2">
            {validationRules.map((rule) => {
              const isValid = validationResults[rule.id]
              return (
                <div key={rule.id} className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200",
                      isValid ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400",
                    )}
                  >
                    {isValid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </div>
                  <span
                    className={cn(
                      "text-sm transition-colors duration-200",
                      isValid ? "text-green-700" : "text-slate-600",
                    )}
                  >
                    {rule.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
