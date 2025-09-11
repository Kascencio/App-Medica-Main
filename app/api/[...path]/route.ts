// app/api/proxy/[...path]/route.ts
import type { NextRequest } from 'next/server';
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

function backendTarget(apiPath: string, search: string) {
  const base = BACKEND_CONFIG.BASE_URL.endsWith('/api')
    ? BACKEND_CONFIG.BASE_URL
    : `${BACKEND_CONFIG.BASE_URL}/api`;
  return `${joinUrl(base, apiPath)}${search ?? ''}`;
}

function filterReqHeaders(req: NextRequest) {
  const h = new Headers(req.headers);
  for (const k of HOP_BY_HOP) h.delete(k);
  // No forces 'origin'/'referer' unless you need them
  return h;
}

function filterRespHeaders(h: Headers) {
  const out = new Headers();
  h.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out.append(k, v);
  });
  return out;
}

async function handle(request: NextRequest, method: string, path: string[]) {
  const apiPath = path.join('/');
  const url = new URL(request.url);
  const target = backendTarget(apiPath, url.search);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);

  const init: RequestInit = {
    method,
    headers: filterReqHeaders(request),
    body: (method === 'GET' || method === 'HEAD') ? undefined : (request.body as any),
    signal: controller.signal,
    // Necesario en algunos runtimes al reenviar streams:
    ...(request.body ? ({ duplex: 'half' } as any) : {})
  };

  const resp = await fetch(target, init).finally(() => clearTimeout(t));

  // Passthrough: no toques la carga ni el tipo
  const headers = filterRespHeaders(resp.headers);
  // Si necesitas CORS para llamadas cross-origin, descomenta:
  // headers.set('Access-Control-Allow-Origin', '*');
  // headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  // headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, 'GET', params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, 'POST', params.path);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, 'PUT', params.path);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, 'DELETE', params.path);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, 'PATCH', params.path);
}
export async function OPTIONS() {
  // Útil si tu frontend llama desde otro origen y hay preflight
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
