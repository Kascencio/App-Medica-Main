// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_CONFIG } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HOP_BY_HOP = new Set([
  'connection','keep-alive','proxy-authenticate','proxy-authorization',
  'te','trailers','transfer-encoding','upgrade','content-length'
]);

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/,'');
  const p = path.replace(/^\/+/,'');
  return `${b}/${p}`;
}

function backendTarget(apiPath: string, search?: string) {
  const base = BACKEND_CONFIG.BASE_URL.endsWith('/api')
    ? BACKEND_CONFIG.BASE_URL
    : `${BACKEND_CONFIG.BASE_URL}/api`;
  return `${joinUrl(base, apiPath)}${search ?? ''}`;
}

function filterReqHeaders(req: NextRequest) {
  const h = new Headers(req.headers);
  for (const k of HOP_BY_HOP) h.delete(k);
  // Headers de "forwarded" útiles para el backend:
  const url = (req as any).nextUrl ?? new URL(req.url);
  const proto = url.protocol.replace(':','') || 'https';
  const host = req.headers.get('host') ?? '';
  if (!h.has('x-forwarded-proto')) h.set('x-forwarded-proto', proto);
  if (!h.has('x-forwarded-host'))  h.set('x-forwarded-host', host);
  // Nota: x-forwarded-for puede no estar disponible; sólo reenvíalo si existe
  const xff = req.headers.get('x-forwarded-for');
  if (xff) h.set('x-forwarded-for', xff);
  return h;
}

function filterRespHeaders(h: Headers) {
  const out = new Headers();
  h.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out.append(k, v);
  });
  return out;
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const apiPath = pathSegments.join('/');

    // Usa el search EXACTO (con '?') para no normalizar ni perder duplicados
    const search = (request as any).nextUrl?.search ?? new URL(request.url).search;
    const finalUrl = backendTarget(apiPath, search);

    const fwdHeaders = filterReqHeaders(request);

    // Timeout
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10_000);

    // Passthrough real del body (sin leer/convertir ni forzar content-type)
    const init: RequestInit = {
      method,
      headers: fwdHeaders,
      body: (method === 'GET' || method === 'HEAD') ? undefined : (request.body as any),
      signal: controller.signal,
      // Necesario para streaming en Node (Next/Node 18+):
      ...(request.body ? ({ duplex: 'half' } as any) : {})
    };

    const resp = await fetch(finalUrl, init).finally(() => clearTimeout(to));

    // Log no intrusivo del error upstream
    if (!resp.ok) {
      try {
        const clone = resp.clone();
        const ct = clone.headers.get('content-type') || '';
        const errBody = ct.includes('application/json')
          ? JSON.stringify(await clone.json())
          : await clone.text();
        console.error('[PROXY] Upstream error', resp.status, resp.statusText, errBody);
      } catch {}
    }

    // Devuelve tal cual (sin NextResponse.json)
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: filterRespHeaders(resp.headers),
    });

  } catch (error) {
    console.error('[PROXY] Error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout', message: 'El backend no respondió a tiempo' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Proxy Error', details: String(error) }, { status: 500 });
  }
}

// Handlers por método (necesarios)
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'GET');
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'POST');
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'PUT');
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'DELETE');
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'PATCH');
}
export async function HEAD(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(req, params.path, 'HEAD');
}

export async function OPTIONS() {
  // Útil si tu frontend llama desde otro origen y hay preflight
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
