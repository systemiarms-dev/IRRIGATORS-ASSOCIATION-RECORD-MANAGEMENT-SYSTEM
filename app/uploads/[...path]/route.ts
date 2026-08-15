import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getSessionUser } from '@/lib/auth/session';
import { RECEIPTS_BUCKET } from '@/lib/db/localDb';
import { receiptPathToObjectKey } from '@/lib/storage/receipts';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Only authenticated users may view uploaded receipts
    const user = await getSessionUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const decoded = decodeURIComponent(params.path.join('/')).replace(/\\/g, '/');
    if (
      !decoded ||
      params.path.some((seg) => seg === '..' || seg.includes('..')) ||
      decoded.includes('../') ||
      !decoded.startsWith('receipts/')
    ) {
      return new NextResponse('File not found', { status: 404 });
    }

    const urlPath = `/uploads/${decoded}`;
    const objectKey = receiptPathToObjectKey(urlPath);
    if (!objectKey) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Cross-association read protection: super admins may open any file;
    // officers may only open files that are physically stored under their own
    // association folder. The folder segment is authoritative, so a caller
    // cannot smuggle a foreign file into their own association's audit queue.
    if (user.role !== 'super_admin') {
      const pathAssoc = decoded.split('/')[1];
      if (!pathAssoc || pathAssoc !== user.association_id) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const storageClient = getSupabaseServerClient();
    if (!storageClient) {
      return new NextResponse('Storage unavailable', { status: 503 });
    }

    const { data, error } = await storageClient.storage.from(RECEIPTS_BUCKET).download(objectKey);
    if (error || !data) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = Buffer.from(await data.arrayBuffer());
    const ext = path.extname(decoded).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Error serving upload file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}