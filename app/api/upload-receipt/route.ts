import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getSessionUser } from '@/lib/auth/session';
import { localDb, RECEIPTS_BUCKET } from '@/lib/db/localDb';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Receipt } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for receipt images
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB for PDF documents
const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Detect the real file type from leading magic bytes.
 */
function sniffMimeType(buffer: Buffer): string {
  if (buffer.length < 8) return '';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';
  return '';
}

function isImageVariant(declared: string, sniffed: string): boolean {
  const d = (declared || '').toLowerCase();
  const s = (sniffed || '').toLowerCase();
  if (d === s) return true;
  const dFamily = d.split('/')[0];
  const sFamily = s.split('/')[0];
  return d.startsWith('image/') && s.startsWith('image/') && dFamily === sFamily;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. You must be logged in to upload receipts.' },
        { status: 401 }
      );
    }

    if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'bookkeeper' && user.role !== 'treasurer') {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to upload receipts.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const customFileName = formData.get('fileName') as string | null;
    const requestedAssocId = formData.get('associationId') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file data was provided.' },
        { status: 400 }
      );
    }

    // Determine the receiving association
    let effectiveAssocId = requestedAssocId || undefined;
    if (user.role !== 'super_admin') {
      effectiveAssocId = user.association_id || effectiveAssocId || undefined;
    }

    if (!effectiveAssocId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please choose the target Irrigators Association. It cannot be blank when the scope is All Associations.',
        },
        { status: 400 }
      );
    }

    if (user.role !== 'super_admin' && user.role === 'admin' && !user.association_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account is not linked to an association. Please ask the head admin to link your account, then retry.',
        },
        { status: 403 }
      );
    }

    const fileMime = (file.type || '').toLowerCase();
    const extFromMime = ALLOWED_RECEIPT_TYPES[fileMime];
    const extFromName = (file.name.split('.').pop() || '').toLowerCase();
    const ext = extFromMime || extFromName;

    if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          message: `File type ${fileMime || extFromName} is not supported. Use JPG, PNG, WEBP, or PDF.`,
        },
        { status: 400 }
      );
    }

    const isImage = fileMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    const allowedLimit = isImage ? MAX_IMAGE_SIZE_BYTES : MAX_PDF_SIZE_BYTES;
    const limitLabel = isImage ? '5MB' : '10MB';

    if (file.size > allowedLimit) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          success: false,
          message: `The selected ${isImage ? 'image' : 'document'} is too large (${sizeMB}MB). Maximum allowed size is ${limitLabel}. Please compress or resize the file.`,
        },
        { status: 400 }
      );
    }

    // Convert file to Buffer in memory without stack overhead
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes
    const sniffedMime = sniffMimeType(buffer);
    if (!sniffedMime || (fileMime && fileMime !== sniffedMime && !isImageVariant(fileMime, sniffedMime))) {
      return NextResponse.json(
        {
          success: false,
          message: `File type mismatch. Detected ${sniffedMime || 'unknown'}, expected ${fileMime || ext}. Use a valid JPG, PNG, WEBP, or PDF file.`,
        },
        { status: 400 }
      );
    }

    const chosenName = (customFileName && customFileName.trim()) ? customFileName.trim() : file.name;
    const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
    const safeName = `${Date.now()}-${path.basename(chosenName).replace(/[^a-zA-Z0-9._-]/g, '_')}.${normalizedExt}`;

    let storedFilePath = '';
    let uploadedToStorage = false;

    // Persist to Supabase Storage
    const storageClient = getSupabaseServerClient();
    if (storageClient) {
      try {
        const { data: buckets } = await storageClient.storage.listBuckets();
        if (!buckets?.some((b) => b.name === RECEIPTS_BUCKET)) {
          await storageClient.storage.createBucket(RECEIPTS_BUCKET, { public: false });
        }
      } catch {
        // bucket might already exist
      }

      const objectKey = `${effectiveAssocId}/${safeName}`;
      const { error: uploadError } = await storageClient.storage
        .from(RECEIPTS_BUCKET)
        .upload(objectKey, buffer, {
          contentType: sniffedMime || fileMime || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (!uploadError) {
        storedFilePath = `/uploads/receipts/${objectKey}`;
        uploadedToStorage = true;
      } else {
        console.error('Supabase storage upload error:', uploadError);
      }
    }

    if (!uploadedToStorage) {
      return NextResponse.json(
        {
          success: false,
          message: 'Receipt storage is unavailable. Please configure Supabase Storage and try again.',
        },
        { status: 503 }
      );
    }

    const newReceipt: Receipt = {
      id: `rcpt-${Date.now()}`,
      file_path: storedFilePath,
      file_name: chosenName,
      file_size: file.size,
      content_type: sniffedMime || fileMime || 'image/jpeg',
      uploader_id: user.id,
      association_id: effectiveAssocId,
      status: 'pending',
      auditor_id: null,
      auditor_notes: null,
      verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await localDb.addReceipt(newReceipt);

    return NextResponse.json({
      success: true,
      message: 'Receipt uploaded to audit queue.',
      data: newReceipt,
    });
  } catch (err: any) {
    console.error('Error handling receipt upload:', err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || 'Unexpected server error while processing upload.',
      },
      { status: 500 }
    );
  }
}
