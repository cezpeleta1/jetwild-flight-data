
import http from 'node:http';
import { URL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateQuote } from './validate.js';

const OBSERVATIONS_FILE = resolve(
  'data/extracted-gowild-fares.json'
);

function validAirport(value) {
  return /^[A-Z]{3}$/.test(value ?? '');
}

function validDate(value) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

async function readObservations() {
  try {
    const content = await readFile(
      OBSERVATIONS_FILE,
      'utf8'
    );

    const data = JSON.parse(content);

    if (!Array.isArray(data.fares)) {
      throw new Error('Invalid extraction format');
    }

    return data;

  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

// Existing live-provider support remains intact.
export function createServer(provider = null) {
  return http.createServer(async (req, res) => {

    const send = (status, payload) => {
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      });

      res.end(JSON.stringify(payload));
    };

    try {
      const url = new URL(
        req.url,
        'http://localhost'
      );

      if (req.method !== 'GET') {
        return send(405, {
          error: 'method_not_allowed'
        });
      }

      // -----------------------------------
      // HEALTH
      // -----------------------------------

      if (url.pathname === '/health') {
        return send(200, {
          status: 'ok',
          liveProviderConnected: Boolean(provider),
          savedObservationsSupported: true
        });
      }

      // -----------------------------------
      // SAVED GOWILD OBSERVATIONS
      // -----------------------------------

      if (
        url.pathname ===
        '/v1/gowild/observations'
      ) {
        const data = await readObservations();

        if (!data) {
          return send(200, {
            live: false,
            status: 'no_saved_scans',
            count: 0,
            fares: []
          });
        }

        const origin = url.searchParams
          .get('origin')?.toUpperCase();

        const destination = url.searchParams
          .get('destination')?.toUpperCase();

        const date = url.searchParams
          .get('date');

        if (
          (origin && !validAirport(origin)) ||
          (destination && !validAirport(destination)) ||
          (date && !validDate(date))
        ) {
          return send(400, {
            error: 'invalid_query'
          });
        }

        const fares = data.fares.filter(fare => {
          if (
            origin &&
            fare.origin !== origin
          ) return false;

          if (
            destination &&
            fare.destination !== destination
          ) return false;

          if (
            date &&
            !String(fare.departureTime ?? '')
              .startsWith(date)
          ) return false;

          return true;
        }).map(fare => ({
          ...fare,
          sourceVerified: false,
          canonicalQuoteReady: false
        }));

        return send(200, {
          live: false,
          status: 'historical_observations',
          source: data.source,
          extractedAt: data.extractedAt,
          count: fares.length,
          fares
        });
      }

      // -----------------------------------
      // EXISTING LIVE QUOTES ENDPOINT
      // -----------------------------------

      if (
        url.pathname !==
        '/v1/gowild/quotes'
      ) {
        return send(404, {
          error: 'not_found'
        });
      }

      const origin = url.searchParams
        .get('origin');

      const date = url.searchParams
        .get('date');

      if (
        !validAirport(origin) ||
        !validDate(date)
      ) {
        return send(400, {
          error: 'invalid_query',
          message:
            'Use origin=ONT and date=YYYY-MM-DD'
        });
      }

      if (!provider) {
        return send(503, {
          error: 'live_provider_not_configured',
          live: false,
          quotes: []
        });
      }

      const quotes = await provider.search({
        origin,
        date
      });

      if (
        !Array.isArray(quotes) ||
        !quotes.every(validateQuote)
      ) {
        return send(502, {
          error: 'invalid_provider_response'
        });
      }

      return send(200, {
        live: true,
        origin,
        date,
        quotes
      });

    } catch (error) {
      console.error(
        'JetWild server error:',
        error.message
      );

      return send(502, {
        error: 'server_error'
      });
    }
  });
}

// Start HTTP server when run directly.
if (
  process.argv[1] &&
  import.meta.url ===
    new URL(
      `file://${resolve(process.argv[1])}`
    ).href
) {
  createServer().listen(
    Number(process.env.PORT || 3000),
    '0.0.0.0'
  );
}
