# Configuración del Proxy para Backend VPS

## Descripción
Este proyecto ahora incluye un proxy que permite que la aplicación web Next.js se comunique con el backend VPS a través de su propio dominio.

## Archivos Creados/Modificados

### 1. `app/api/[...path]/route.ts`
- **Nuevo archivo** que actúa como proxy hacia el backend VPS
- Maneja todas las rutas de API dinámicamente
- Soporta métodos HTTP: GET, POST, PUT, DELETE, PATCH
- Redirige peticiones de `/api/*` hacia `http://72.60.30.129:3001/*`

### 2. `lib/config.ts`
- **Nuevo archivo** de configuración centralizada
- Define URLs del backend y aplicación
- Permite configuración mediante variables de entorno

## Configuración

### Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto con:

```bash
# URL del backend VPS
BACKEND_URL=http://72.60.30.129:3001

# URL de la aplicación (opcional, por defecto usa recuerdamed.org)
NEXT_PUBLIC_APP_URL=https://www.recuerdamed.org
```

### Para Vercel
En el dashboard de Vercel, agrega estas variables de entorno:
- `BACKEND_URL`: `http://72.60.30.129:3001`

## Cómo Funciona

### Antes (Sin Proxy)
```
Frontend → http://72.60.30.129:3001/medications
```

### Después (Con Proxy)
```
Frontend → https://www.recuerdamed.org/api/medications → http://72.60.30.129:3001/medications
```

## Rutas Soportadas
El proxy maneja automáticamente todas las rutas de API:

- `/api/medications` → `http://72.60.30.129:3001/medications`
- `/api/patients` → `http://72.60.30.129:3001/patients`
- `/api/appointments` → `http://72.60.30.129:3001/appointments`
- `/api/treatments` → `http://72.60.30.129:3001/treatments`
- `/api/notes` → `http://72.60.30.129:3001/notes`
- `/api/auth/*` → `http://72.60.30.129:3001/auth/*`
- Y cualquier otra ruta que agregues en el futuro

## Beneficios

1. **Mismo Dominio**: La app web y las API están en el mismo dominio
2. **Sin CORS**: No hay problemas de CORS entre dominios
3. **Seguridad**: Las peticiones salen desde el servidor de Vercel, no desde el cliente
4. **Flexibilidad**: Fácil de cambiar la URL del backend sin modificar el frontend
5. **Mantenimiento**: Configuración centralizada

## Notas Importantes

- **No es necesario cambiar el código del frontend**: Ya usa rutas relativas como `/api/*`
- **El proxy maneja automáticamente**: Headers, métodos HTTP, query parameters y body
- **Logs de errores**: Los errores se registran en la consola del servidor de Vercel
- **Timeout**: Las peticiones tienen un timeout de 30 segundos por defecto

## Pruebas

Para probar que el proxy funciona:

1. Despliega la aplicación en Vercel
2. Verifica que las rutas `/api/*` respondan correctamente
3. Revisa los logs de Vercel para confirmar que las peticiones llegan al backend

## Solución de Problemas

### Error 500 "Error conectando al backend"
- Verifica que el backend esté funcionando en `http://72.60.30.129:3001`
- Revisa los logs de Vercel para más detalles
- Confirma que la variable `BACKEND_URL` esté configurada correctamente

### Timeout en las peticiones
- Aumenta el valor de `TIMEOUT` en `lib/config.ts` si es necesario
- Verifica la latencia de red entre Vercel y tu VPS
