import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const bgPath = path.join(process.cwd(), 'bg.png');

  try {
    const fileBuffer = fs.readFileSync(bgPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Background not found', { status: 404 });
  }
}
