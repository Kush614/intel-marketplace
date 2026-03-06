/**
 * Apify actor/dataset configuration.
 *
 * Each data category maps to an Apify actor ID. When the actor is
 * configured, data is read from its latest dataset. When not configured,
 * the system falls back to direct HTTP fetch.
 *
 * To set up:
 * 1. Create/find an Apify actor for each category
 * 2. Schedule it to run periodically (5-15 min)
 * 3. Add the actor ID to your .env.local
 *
 * Recommended Apify actors:
 *   News:        lukaskrivka/google-news-scraper
 *   RSS:         dtrungtin/rss-feed-reader (or apify/rss-feed-reader)
 *   Markets:     jupri/yahoo-finance-scraper
 *   Earthquakes: custom actor wrapping USGS API
 *   Weather:     custom actor wrapping Open-Meteo API
 */

export interface ApifyRouteConfig {
  /** Apify actor ID (e.g., "lukaskrivka/google-news-scraper") */
  actorId: string;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Transform Apify dataset items to the expected response format */
  transform?: (items: unknown[]) => unknown;
}

/** Environment variable names for actor IDs per data category */
export const APIFY_ENV_KEYS: Record<string, string> = {
  news: 'APIFY_ACTOR_NEWS',
  rss: 'APIFY_ACTOR_RSS',
  market: 'APIFY_ACTOR_MARKET',
  seismology: 'APIFY_ACTOR_SEISMOLOGY',
  climate: 'APIFY_ACTOR_CLIMATE',
  conflict: 'APIFY_ACTOR_CONFLICT',
  displacement: 'APIFY_ACTOR_DISPLACEMENT',
  aviation: 'APIFY_ACTOR_AVIATION',
  cyber: 'APIFY_ACTOR_CYBER',
  maritime: 'APIFY_ACTOR_MARITIME',
  economic: 'APIFY_ACTOR_ECONOMIC',
  infrastructure: 'APIFY_ACTOR_INFRASTRUCTURE',
  military: 'APIFY_ACTOR_MILITARY',
  intelligence: 'APIFY_ACTOR_INTELLIGENCE',
  wildfire: 'APIFY_ACTOR_WILDFIRE',
  prediction: 'APIFY_ACTOR_PREDICTION',
  research: 'APIFY_ACTOR_RESEARCH',
  unrest: 'APIFY_ACTOR_UNREST',
  trade: 'APIFY_ACTOR_TRADE',
  'supply-chain': 'APIFY_ACTOR_SUPPLY_CHAIN',
  natural: 'APIFY_ACTOR_NATURAL',
  giving: 'APIFY_ACTOR_GIVING',
  'positive-events': 'APIFY_ACTOR_POSITIVE_EVENTS',
  youtube: 'APIFY_ACTOR_YOUTUBE',
  polymarket: 'APIFY_ACTOR_POLYMARKET',
};

/** Default cache TTLs per category (ms) */
export const CACHE_TTLS: Record<string, number> = {
  news: 5 * 60 * 1000,        // 5 min
  rss: 5 * 60 * 1000,         // 5 min
  market: 2 * 60 * 1000,      // 2 min
  seismology: 5 * 60 * 1000,  // 5 min
  climate: 30 * 60 * 1000,    // 30 min
  conflict: 15 * 60 * 1000,   // 15 min
  displacement: 60 * 60 * 1000, // 1 hr
  aviation: 5 * 60 * 1000,    // 5 min
  cyber: 10 * 60 * 1000,      // 10 min
  maritime: 5 * 60 * 1000,    // 5 min
  economic: 30 * 60 * 1000,   // 30 min
  infrastructure: 30 * 60 * 1000,
  military: 5 * 60 * 1000,
  intelligence: 10 * 60 * 1000,
  wildfire: 10 * 60 * 1000,
  prediction: 10 * 60 * 1000,
  research: 60 * 60 * 1000,
  unrest: 15 * 60 * 1000,
  trade: 30 * 60 * 1000,
  'supply-chain': 30 * 60 * 1000,
  natural: 10 * 60 * 1000,
  giving: 30 * 60 * 1000,
  'positive-events': 15 * 60 * 1000,
  youtube: 5 * 60 * 1000,
  polymarket: 2 * 60 * 1000,
};

/**
 * Proxy route mapping: request prefix → target base URL + rewrite rule.
 * These are used as fallback when no Apify actor is configured for a route.
 */
export interface ProxyRoute {
  prefix: string;
  target: string;
  rewrite: (path: string) => string;
  category: string;
  contentType?: string;
}

export const PROXY_ROUTES: ProxyRoute[] = [
  // Data APIs
  { prefix: '/api/yahoo', target: 'https://query1.finance.yahoo.com', rewrite: p => p.replace(/^\/api\/yahoo/, ''), category: 'market' },
  { prefix: '/api/earthquake', target: 'https://earthquake.usgs.gov', rewrite: p => p.replace(/^\/api\/earthquake/, ''), category: 'seismology' },
  { prefix: '/api/pizzint', target: 'https://www.pizzint.watch', rewrite: p => p.replace(/^\/api\/pizzint/, '/api'), category: 'intelligence' },
  { prefix: '/api/cloudflare-radar', target: 'https://api.cloudflare.com', rewrite: p => p.replace(/^\/api\/cloudflare-radar/, ''), category: 'infrastructure' },
  { prefix: '/api/nga-msi', target: 'https://msi.nga.mil', rewrite: p => p.replace(/^\/api\/nga-msi/, ''), category: 'maritime' },
  { prefix: '/api/gdelt', target: 'https://api.gdeltproject.org', rewrite: p => p.replace(/^\/api\/gdelt/, ''), category: 'intelligence' },
  { prefix: '/api/faa', target: 'https://nasstatus.faa.gov', rewrite: p => p.replace(/^\/api\/faa/, ''), category: 'aviation' },
  { prefix: '/api/opensky', target: 'https://opensky-network.org/api', rewrite: p => p.replace(/^\/api\/opensky/, ''), category: 'military' },
  { prefix: '/api/adsb-exchange', target: 'https://adsbexchange.com/api', rewrite: p => p.replace(/^\/api\/adsb-exchange/, ''), category: 'military' },

  // RSS feeds
  { prefix: '/rss/bbc', target: 'https://feeds.bbci.co.uk', rewrite: p => p.replace(/^\/rss\/bbc/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/guardian', target: 'https://www.theguardian.com', rewrite: p => p.replace(/^\/rss\/guardian/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/npr', target: 'https://feeds.npr.org', rewrite: p => p.replace(/^\/rss\/npr/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/aljazeera', target: 'https://www.aljazeera.com', rewrite: p => p.replace(/^\/rss\/aljazeera/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/cnn', target: 'http://rss.cnn.com', rewrite: p => p.replace(/^\/rss\/cnn/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/hn', target: 'https://hnrss.org', rewrite: p => p.replace(/^\/rss\/hn/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/arstechnica', target: 'https://feeds.arstechnica.com', rewrite: p => p.replace(/^\/rss\/arstechnica/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/verge', target: 'https://www.theverge.com', rewrite: p => p.replace(/^\/rss\/verge/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/cnbc', target: 'https://www.cnbc.com', rewrite: p => p.replace(/^\/rss\/cnbc/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/marketwatch', target: 'https://feeds.marketwatch.com', rewrite: p => p.replace(/^\/rss\/marketwatch/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/defenseone', target: 'https://www.defenseone.com', rewrite: p => p.replace(/^\/rss\/defenseone/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/warontherocks', target: 'https://warontherocks.com', rewrite: p => p.replace(/^\/rss\/warontherocks/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/breakingdefense', target: 'https://breakingdefense.com', rewrite: p => p.replace(/^\/rss\/breakingdefense/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/bellingcat', target: 'https://www.bellingcat.com', rewrite: p => p.replace(/^\/rss\/bellingcat/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/techcrunch', target: 'https://techcrunch.com', rewrite: p => p.replace(/^\/rss\/techcrunch/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/googlenews', target: 'https://news.google.com', rewrite: p => p.replace(/^\/rss\/googlenews/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/openai', target: 'https://openai.com', rewrite: p => p.replace(/^\/rss\/openai/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/anthropic', target: 'https://www.anthropic.com', rewrite: p => p.replace(/^\/rss\/anthropic/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/googleai', target: 'https://blog.google', rewrite: p => p.replace(/^\/rss\/googleai/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/deepmind', target: 'https://deepmind.google', rewrite: p => p.replace(/^\/rss\/deepmind/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/huggingface', target: 'https://huggingface.co', rewrite: p => p.replace(/^\/rss\/huggingface/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/techreview', target: 'https://www.technologyreview.com', rewrite: p => p.replace(/^\/rss\/techreview/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/arxiv', target: 'https://rss.arxiv.org', rewrite: p => p.replace(/^\/rss\/arxiv/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/whitehouse', target: 'https://www.whitehouse.gov', rewrite: p => p.replace(/^\/rss\/whitehouse/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/statedept', target: 'https://www.state.gov', rewrite: p => p.replace(/^\/rss\/statedept/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/state', target: 'https://www.state.gov', rewrite: p => p.replace(/^\/rss\/state/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/defense', target: 'https://www.defense.gov', rewrite: p => p.replace(/^\/rss\/defense/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/justice', target: 'https://www.justice.gov', rewrite: p => p.replace(/^\/rss\/justice/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/cdc', target: 'https://tools.cdc.gov', rewrite: p => p.replace(/^\/rss\/cdc/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/fema', target: 'https://www.fema.gov', rewrite: p => p.replace(/^\/rss\/fema/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/dhs', target: 'https://www.dhs.gov', rewrite: p => p.replace(/^\/rss\/dhs/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/fedreserve', target: 'https://www.federalreserve.gov', rewrite: p => p.replace(/^\/rss\/fedreserve/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/sec', target: 'https://www.sec.gov', rewrite: p => p.replace(/^\/rss\/sec/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/treasury', target: 'https://home.treasury.gov', rewrite: p => p.replace(/^\/rss\/treasury/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/cisa', target: 'https://www.cisa.gov', rewrite: p => p.replace(/^\/rss\/cisa/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/brookings', target: 'https://www.brookings.edu', rewrite: p => p.replace(/^\/rss\/brookings/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/cfr', target: 'https://www.cfr.org', rewrite: p => p.replace(/^\/rss\/cfr/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/csis', target: 'https://www.csis.org', rewrite: p => p.replace(/^\/rss\/csis/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/warzone', target: 'https://www.thedrive.com', rewrite: p => p.replace(/^\/rss\/warzone/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/defensegov', target: 'https://www.defense.gov', rewrite: p => p.replace(/^\/rss\/defensegov/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/krebs', target: 'https://krebsonsecurity.com', rewrite: p => p.replace(/^\/rss\/krebs/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/yahoonews', target: 'https://finance.yahoo.com', rewrite: p => p.replace(/^\/rss\/yahoonews/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/diplomat', target: 'https://thediplomat.com', rewrite: p => p.replace(/^\/rss\/diplomat/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/venturebeat', target: 'https://venturebeat.com', rewrite: p => p.replace(/^\/rss\/venturebeat/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/foreignpolicy', target: 'https://foreignpolicy.com', rewrite: p => p.replace(/^\/rss\/foreignpolicy/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/ft', target: 'https://www.ft.com', rewrite: p => p.replace(/^\/rss\/ft/, ''), category: 'rss', contentType: 'application/xml' },
  { prefix: '/rss/reuters', target: 'https://www.reutersagency.com', rewrite: p => p.replace(/^\/rss\/reuters/, ''), category: 'rss', contentType: 'application/xml' },
];
