import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const rootLogo = path.join(process.cwd(), 'logo.png');
  const publicLogo = path.join(process.cwd(), 'public', 'logo.png');
  
  let logoPath = rootLogo;
  if (fs.existsSync(publicLogo)) {
    const rootStat = fs.existsSync(rootLogo) ? fs.statSync(rootLogo).mtimeMs : 0;
    const publicStat = fs.statSync(publicLogo).mtimeMs;
    if (publicStat > rootStat) {
      logoPath = publicLogo;
    }
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
    return new NextResponse('Logo not found', { status: 404 });
  }
}
