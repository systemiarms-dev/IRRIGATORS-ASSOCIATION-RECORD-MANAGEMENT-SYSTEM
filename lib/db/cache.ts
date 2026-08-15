type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
const DEFAULT_TTL = 30_000;

export function cached<T>(key: string, loader: () => Promise<T>, ttlMs: number = DEFAULT_TTL): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return Promise.resolve(hit.value as T);
  return loader()
    .then((value) => {
      store.set(key, { value, expires: now + ttlMs });
      return value;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });
}

export function invalidateCache(prefix: string) {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function clearCache() {
  store.clear();
}