import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * formatea una fecha (ISO string o Date) a `dd MMM yyyy, HH:mm` en español
 */
export const formatDate = (date: string | Date) =>
  format(typeof date === 'string' ? new Date(date) : date, 'dd MMM yyyy, HH:mm', { locale: es })

/**
 * Helper para concatenar clases Tailwind de forma condicional
 */
export const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ')

/**
 * Capitaliza la primera letra
 */
export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
