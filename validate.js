export function validateQuote(q) {
  return Boolean(q && typeof q === 'object' &&
    typeof q.quoteId === 'string' && q.quoteId.length > 0 &&
    q.fareType === 'GOWILD' &&
    Number.isInteger(q.totalPriceCents) && q.totalPriceCents >= 0 &&
    q.currency === 'USD' &&
    typeof q.observedAt === 'string' && !Number.isNaN(Date.parse(q.observedAt)) &&
    typeof q.expiresAt === 'string' && !Number.isNaN(Date.parse(q.expiresAt)) &&
    Date.parse(q.expiresAt) > Date.parse(q.observedAt) &&
    Array.isArray(q.segments) && q.segments.length > 0 &&
    q.segments.every(s => /^[A-Z]{3}$/.test(s.from ?? '') && /^[A-Z]{3}$/.test(s.to ?? '') &&
      typeof s.departureAt === 'string' && !Number.isNaN(Date.parse(s.departureAt)) &&
      typeof s.arrivalAt === 'string' && !Number.isNaN(Date.parse(s.arrivalAt)) &&
      Date.parse(s.arrivalAt) > Date.parse(s.departureAt)));
}
