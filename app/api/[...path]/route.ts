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
    const targetUrl = `${BACKEND_CONFIG.BASE_URL}/${apiPath}`;
    
    // Obtener los headers de la petición original
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Excluir headers que pueden causar problemas
      if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // Preparar el body para métodos que lo requieren
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.text();
      } catch {
        // Si no se puede leer el body, continuar sin él
      }
    }

    // Obtener query parameters
    const url = new URL(request.url);
    const queryString = url.searchParams.toString();
    const finalUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    // Hacer la petición al backend
    const response = await fetch(finalUrl, {
      method,
      headers,
      body,
    });

    // Obtener la respuesta del backend
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Crear la respuesta para el cliente
    const nextResponse = NextResponse.json(responseData, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copiar headers relevantes de la respuesta del backend
    response.headers.forEach((value, key) => {
      if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        nextResponse.headers.set(key, value);
      }
    });

    return nextResponse;

  } catch (error) {
    console.error('Error en proxy:', error);
    return NextResponse.json(
      { error: 'Error conectando al backend', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
