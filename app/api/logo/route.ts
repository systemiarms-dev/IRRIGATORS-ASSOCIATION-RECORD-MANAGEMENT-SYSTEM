import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const candidatePaths = [
    path.join(process.cwd(), 'Iarmslogo.png'),
    path.join(process.cwd(), 'public', 'Iarmslogo.png'),
    path.join(process.cwd(), 'public', 'logo.png'),
    path.join(process.cwd(), 'logo.png'),
  ];

  let logoPath: string | null = null;
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      logoPath = candidate;
      break;
    }
  }

  if (!logoPath) {
    return new NextResponse('Logo not found', { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(logoPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch {
    return new NextResponse('Logo read error', { status: 500 });
  }
}
