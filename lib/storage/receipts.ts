import { getSupabaseServerClient } from '@/lib/supabase/server';
import { RECEIPTS_BUCKET } from '@/lib/db/localDb';

const RECEIPTS_URL_PREFIX = '/uploads/receipts/';

/**
 * Converts a stored receipt file_path (e.g. /uploads/receipts/ia-x/123-file.png)
 * into its Storage object key (ia-x/123-file.png), or null for external/legacy paths.
 */
export function receiptPathToObjectKey(filePath?: string | null): string | null {
  if (!filePath || !filePath.startsWith(RECEIPTS_URL_PREFIX)) return null;
  const rel = filePath.slice(RECEIPTS_URL_PREFIX.length);
  return rel.length > 0 ? rel : null;
}

/**
 * Best-effort removal of a single receipt file from the Storage bucket.
 * Returns false when there is nothing to remove or the removal failed.
 */
export async function removeReceiptStorageObject(filePath?: string | null): Promise<boolean> {
  const objectKey = receiptPathToObjectKey(filePath);
  if (!objectKey) return false;

  const client = getSupabaseServerClient();
  if (!client) return false;

  const { error } = await client.storage.from(RECEIPTS_BUCKET).remove([objectKey]);
  return !error;
}

/**
 * Recursively removes every object in a receipt association folder
 * (or the entire bucket when associationId is 'all'/null) so no photos are orphaned
 * after bulk record deletions.
 */
export async function purgeReceiptStorage(associationId?: string | null): Promise<void> {
  const client = getSupabaseServerClient();
  if (!client) return;
  const storage = client.storage;

  const filePaths: string[] = [];
  const folderPaths: string[] = [];

  async function walk(prefix: string) {
    const { data, error } = await storage.from(RECEIPTS_BUCKET).list(prefix, { limit: 1000 });
    if (error) return;
    for (const item of data || []) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        folderPaths.push(itemPath);
        await walk(itemPath);
      } else {
        filePaths.push(itemPath);
      }
    }
  }

  await walk(associationId && associationId !== 'all' ? associationId : '');

  if (filePaths.length > 0) {
    await storage.from(RECEIPTS_BUCKET).remove(filePaths);
  }
  // Remove folder placeholders deepest-first so the bucket ends clean.
  for (const folder of folderPaths.slice().reverse()) {
    await storage.from(RECEIPTS_BUCKET).remove([folder]);
  }
}