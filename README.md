# JetWild Flight Data

Standalone Node.js 20+ backend scaffold for the existing JetWild Expo iPhone app. No dependencies beyond Node.js.

## Run

```bash
npm test
npm start
```

- `GET /health` — service health and whether a provider is connected.
- `GET /v1/gowild/quotes?origin=ONT&date=2026-11-22` — GoWild-specific quote data.
- With no provider configured, the endpoint deliberately returns HTTP 503 with `live:false` and an empty `quotes` array. **No live fare collection is implemented.**

## Provider interface

Supply a provider object with `async search({origin,date})` returning an array of verified GoWild quotes from an authorized source. Each quote must have:

```json
{
  "quoteId": "provider-unique-id",
  "fareType": "GOWILD",
  "totalPriceCents": 4062,
  "currency": "USD",
  "observedAt": "2026-11-21T20:00:00Z",
  "expiresAt": "2026-11-21T20:05:00Z",
  "segments": [{
    "from": "ONT", "to": "SFO",
    "departureAt": "2026-11-22T16:00:00Z",
    "arrivalAt": "2026-11-22T17:30:00Z"
  }]
}
```

Example is **schema documentation only**, not a real fare. UTC timestamps must be offset-aware ISO strings in production; ensure provider includes mandatory fees, GoWild availability, complete flight segments, and an availability recheck before booking. Implement source provenance, currency, booking handoff and stale-fare rules before production. Keep secrets on the server. Do not bypass access controls or scrape websites in violation of applicable restrictions.

## Integration plan

1. Connect an authorized GoWild quote provider to this service.
2. Verify actual ONT/LAX results and price/fee semantics.
3. Map the response to JetWild's existing day-trip engine without changing the Expo design.
4. Host the service and point the app's backend integration at its authenticated URL.
