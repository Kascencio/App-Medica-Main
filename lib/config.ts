// Configuración del backend
export const BACKEND_CONFIG = {
  // URL del backend VPS
  BASE_URL: process.env.BACKEND_URL || 'http://72.60.30.129:3001',
  
  // Timeout para las peticiones (en milisegundos)
  TIMEOUT: 30000,
  
  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;

// Configuración de la aplicación
export const APP_CONFIG = {
  // URL base de la aplicación
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://www.recuerdamed.org',
  
  // Nombre de la aplicación
  NAME: 'RecuerdaMed',
  
  // Versión
  VERSION: '1.0.0',
} as const;
