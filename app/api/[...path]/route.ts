import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_CONFIG } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const apiPath = pathSegments.join('/');
    
    // ✅ SOLUCIÓN: Detección automática del prefijo para evitar duplicación
    const baseUrl = BACKEND_CONFIG.BASE_URL.endsWith('/api') 
      ? BACKEND_CONFIG.BASE_URL 
      : `${BACKEND_CONFIG.BASE_URL}/api`;
    const targetUrl = `${baseUrl}/${apiPath}`;
    
    console.log(`[PROXY] ${method} ${apiPath} -> ${targetUrl}`);
    
    // Headers mejorados
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Copiar headers importantes de la petición original
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      
      // Incluir headers importantes pero excluir los problemáticos
      if (
        !['host', 'origin', 'referer', 'content-length', 'transfer-encoding'].includes(lowerKey) &&
        (lowerKey.startsWith('authorization') || 
         lowerKey.startsWith('x-') ||
         lowerKey === 'user-agent' ||
         lowerKey === 'accept-language')
      ) {
        headers[key] = value;
      }
    });

    // Preparar el body para métodos que lo requieren
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.text();
        console.log(`[PROXY] Body length: ${body.length} chars`);
        
        // 🔍 DEBUG: Agregar logs para el body
        console.log(`[PROXY] Body content:`, body);
        
        // Parsear el body para verificar el patientProfileId
        try {
          const bodyData = JSON.parse(body);
          console.log(`[PROXY] patientProfileId type:`, typeof bodyData.patientProfileId);
          console.log(`[PROXY] patientProfileId value:`, bodyData.patientProfileId);
        } catch (parseError) {
          console.log(`[PROXY] Error parsing body for debug:`, parseError);
        }
        
        // Para métodos PATCH y PUT, permitir body vacío
        if ((method === 'PATCH' || method === 'PUT') && body.length === 0) {
          console.log(`[PROXY] ${method} con body vacío - permitido`);
          body = undefined; // No enviar body vacío
        }
      } catch (error) {
        console.warn('[PROXY] No se pudo leer el body:', error);
        // Para métodos PATCH y PUT, continuar sin body si hay error
        if (method === 'PATCH' || method === 'PUT') {
          body = undefined;
        }
      }
    }

    // Obtener query parameters
    const url = new URL(request.url);
    const queryString = url.searchParams.toString();
    const finalUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    console.log(`[PROXY] Final URL: ${finalUrl}`);
    console.log(`[PROXY] Headers:`, Object.keys(headers));

    // 🔍 DEBUG: Agregar log para el body que se envía
    if (body) {
      console.log(`[PROXY] Sending body:`, body);
    }

    // Hacer la petición al backend con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

    const response = await fetch(finalUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[PROXY] Response status: ${response.status} ${response.statusText}`);

    // Obtener la respuesta del backend
    let responseData;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (error) {
      console.error('[PROXY] Error parsing response:', error);
      responseData = { error: 'Error parsing response from backend' };
    }

    // Crear la respuesta para el cliente
    const nextResponse = NextResponse.json(responseData, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copiar headers relevantes de la respuesta del backend
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !['content-length', 'transfer-encoding', 'connection'].includes(lowerKey) &&
        (lowerKey.startsWith('access-control') ||
         lowerKey.startsWith('cache-control') ||
         lowerKey === 'content-type')
      ) {
        nextResponse.headers.set(key, value);
      }
    });

    // Headers CORS importantes
    nextResponse.headers.set('Access-Control-Allow-Origin', '*');
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    console.log(`[PROXY] Success: ${method} ${apiPath} -> ${response.status}`);
    return nextResponse;

  } catch (error) {
    console.error(`[PROXY] Error en ${method} ${pathSegments.join('/')}:`, error);
    
    // Manejo de errores más específico
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Timeout', message: 'El backend no respondió a tiempo' },
          { status: 504 }
        );
      }
      
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Connection Error', message: 'No se pudo conectar al backend' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Proxy Error', 
        message: 'Error interno del proxy',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}