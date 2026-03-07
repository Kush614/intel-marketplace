/**
 * Vercel serverless function — proxy to the World Monitor intelligence agent.
 *
 * The chatbot sends queries here; this function forwards them to the
 * intel-marketplace-2 agent on Trinity and streams the response back.
 *
 * Using nodejs runtime (not edge) for the longer timeout needed by AI responses.
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

const AGENT_URL = 'https://us14.abilityai.dev/api/agents/intel-marketplace-2/chat';
const AGENT_AUTH = 'Bearer trinity_mcp_sa-ZnRklsQGjN4LZyO6ylxIts9p5ODH82CQwcRREFdo';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Set CORS headers
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { message, query } = req.body || {};
  const text = (message || query || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Missing message' });
    return;
  }

  try {
    const upstream = await fetch(AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: AGENT_AUTH,
      },
      body: JSON.stringify({ message: text }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      res.status(upstream.status).json({ error: `Agent returned ${upstream.status}`, detail: errText });
      return;
    }

    const data = await upstream.json();
    res.status(200).json({ response: data.response || data.message || JSON.stringify(data) });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal error' });
  }
}
