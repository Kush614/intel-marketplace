/**
 * Unified Apify data service.
 *
 * ALL external data fetching routes through this module.
 * Uses Apify REST API as the single data provider.
 *
 * The user configures actor IDs and/or dataset IDs in .env.local
 * for each data category. Actors should be scheduled to run
 * periodically on Apify's platform so dataset reads are instant.
 */

const APIFY_BASE = 'https://api.apify.com/v2';

export function getApifyToken(): string {
  // Server-side (Vite plugin context)
  if (typeof process !== 'undefined' && process.env?.VITE_APIFY_TOKEN) {
    return process.env.VITE_APIFY_TOKEN;
  }
  // Client-side (Vite injects import.meta.env)
  try {
    return (import.meta as any).env?.VITE_APIFY_TOKEN ?? '';
  } catch {
    return '';
  }
}

/** Read items from the last run of an actor's default dataset. */
export async function getActorLastRunData<T = unknown>(
  actorId: string,
  opts?: { limit?: number; format?: string },
): Promise<T[]> {
  const token = getApifyToken();
  if (!token) throw new Error('VITE_APIFY_TOKEN not configured');

  const params = new URLSearchParams({ token });
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.format) params.set('format', opts.format);

  const url = `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs/last/dataset/items?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Apify actor ${actorId}: HTTP ${res.status}`);
  return res.json();
}

/** Read items from a known dataset by ID. */
export async function getDatasetItems<T = unknown>(
  datasetId: string,
  opts?: { limit?: number; offset?: number },
): Promise<T[]> {
  const token = getApifyToken();
  if (!token) throw new Error('VITE_APIFY_TOKEN not configured');

  const params = new URLSearchParams({ token });
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));

  const url = `${APIFY_BASE}/datasets/${datasetId}/items?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Apify dataset ${datasetId}: HTTP ${res.status}`);
  return res.json();
}

/** Run an actor synchronously and return dataset items (slower — use for on-demand data). */
export async function runActorSync<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 60,
): Promise<T[]> {
  const token = getApifyToken();
  if (!token) throw new Error('VITE_APIFY_TOKEN not configured');

  const params = new URLSearchParams({ token, timeout: String(timeoutSecs) });
  const url = `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?${params}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 10) * 1000),
  });
  if (!res.ok) throw new Error(`Apify run ${actorId}: HTTP ${res.status}`);
  return res.json();
}

/** Read a record from an actor's default key-value store. */
export async function getKeyValueRecord<T = unknown>(
  storeId: string,
  key: string,
): Promise<T> {
  const token = getApifyToken();
  if (!token) throw new Error('VITE_APIFY_TOKEN not configured');

  const url = `${APIFY_BASE}/key-value-stores/${storeId}/records/${encodeURIComponent(key)}?token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Apify KV ${storeId}/${key}: HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Server-side cache for the Vite plugin (prevents excessive Apify calls)
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: unknown;
  timestamp: number;
  contentType: string;
}

const serverCache = new Map<string, CacheEntry>();

export function getCached(key: string, ttlMs: number): CacheEntry | null {
  const entry = serverCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    serverCache.delete(key);
    return null;
  }
  return entry;
}

export function setCache(key: string, data: unknown, contentType = 'application/json'): void {
  // Cap cache size
  if (serverCache.size > 500) {
    const oldest = [...serverCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 100 && i < oldest.length; i++) serverCache.delete(oldest[i]![0]);
  }
  serverCache.set(key, { data, timestamp: Date.now(), contentType });
}
