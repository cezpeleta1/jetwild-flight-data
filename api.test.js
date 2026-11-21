import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { validateQuote } from '../src/validate.js';

test('no provider cannot masquerade as live data', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/gowild/quotes?origin=ONT&date=2026-11-22`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {error:'live_provider_not_configured',live:false,quotes:[]});
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('invalid price or non-GoWild fare is rejected', () => {
  assert.equal(validateQuote({fareType:'STANDARD'}), false);
  assert.equal(validateQuote({fareType:'GOWILD',totalPriceCents:-5}), false);
});
