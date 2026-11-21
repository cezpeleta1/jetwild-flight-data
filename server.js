import http from 'node:http';
import { URL } from 'node:url';
import { validateQuote } from './validate.js';

// No live provider is configured. Never return fixtures as real fares.
export function createServer(provider = null) {
  return http.createServer(async (req, res) => {
    const send = (status, payload) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(payload));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET') return send(405, { error: 'method_not_allowed' });
      if (url.pathname === '/health') return send(200, { status: 'ok', liveProviderConnected: Boolean(provider) });
      if (url.pathname !== '/v1/gowild/quotes') return send(404, { error: 'not_found' });
      const origin = url.searchParams.get('origin');
      const date = url.searchParams.get('date');
      if (!/^[A-Z]{3}$/.test(origin ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
        return send(400, { error: 'invalid_query', message: 'Use origin=ONT and date=YYYY-MM-DD' });
      }
      if (!provider) return send(503, { error: 'live_provider_not_configured', live: false, quotes: [] });
      const quotes = await provider.search({ origin, date });
      if (!Array.isArray(quotes) || !quotes.every(validateQuote)) return send(502, { error: 'invalid_provider_response' });
      return send(200, { live: true, origin, date, quotes });
    } catch (err) {
      return send(502, { error: 'provider_error' });
    }
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  createServer().listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
