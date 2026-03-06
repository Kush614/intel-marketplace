export interface ZeroClickOffer {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  cta: string;
  clickUrl: string;
  imageUrl: string;
  brand: { name: string; url: string; iconUrl?: string };
  price?: { amount: string; currency: string; originalPrice?: string; discount?: string | null } | null;
}

export interface ZeroClickSignal {
  category: 'interest' | 'evaluation' | 'problem' | 'purchase_intent' | 'price_sensitivity' | 'brand_affinity' | 'user_context' | 'business_context' | 'recommendation_request';
  confidence: number;
  subject: string;
  sentiment?: string;
}

const API_URL = 'https://zeroclick.dev/api/v2/offers';
const SIGNALS_URL = 'https://zeroclick.dev/api/v2/signals';
const IMPRESSIONS_URL = 'https://zeroclick.dev/api/v2/impressions';

function getApiKey(): string {
  return import.meta.env.VITE_ZEROCLICK_API_KEY ?? '';
}

export async function fetchZeroClickOffers(query: string, limit = 5): Promise<ZeroClickOffer[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[ZeroClick] No VITE_ZEROCLICK_API_KEY set — skipping offers fetch.');
    return [];
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-zc-api-key': apiKey,
    },
    body: JSON.stringify({
      method: 'client',
      query,
      limit,
    }),
  });

  if (!res.ok) {
    console.error(`[ZeroClick] Offers fetch failed: ${res.status}`);
    return [];
  }

  return res.json();
}

/** Broadcast contextual signals to ZeroClick for better offer relevance */
export async function broadcastSignals(signals: ZeroClickSignal[]): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey || signals.length === 0) return;

  try {
    await fetch(SIGNALS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-zc-api-key': apiKey,
      },
      body: JSON.stringify({ signals }),
    });
  } catch {
    // Silent — signals are non-critical
  }
}

export async function trackZeroClickImpressions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await fetch(IMPRESSIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  } catch {
    console.warn('[ZeroClick] Impression tracking failed');
  }
}
