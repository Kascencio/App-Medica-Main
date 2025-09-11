import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Proxy funcionando correctamente',
    timestamp: new Date().toISOString(),
    status: 'success'
  });
}

