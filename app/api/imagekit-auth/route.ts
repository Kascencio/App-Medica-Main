// app/api/imagekit-auth/route.ts
import { NextResponse } from "next/server";
import ImageKit from "imagekit";      // ← no "imagekit-javascript"

const ik = new ImageKit({
  publicKey:  process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint:process.env.IMAGEKIT_URL_ENDPOINT!,
});

export async function GET() {
  // Node SDK SÍ tiene este método:
  const authParams = ik.getAuthenticationParameters();
  return NextResponse.json({
    ...authParams,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
}
