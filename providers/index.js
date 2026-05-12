/**
 * Lead provider factory.
 *
 * Reads LEAD_PROVIDER from the environment and returns the matching provider.
 * Default: 'mock' — works out of the box with no API keys.
 *
 * Supported providers:
 *   mock        — Deterministic demo data, no API key needed  (default)
 *   outscraper  — Real Google Maps data via Outscraper API    (OUTSCRAPER_API_KEY)
 *
 * Stub cases (not yet implemented — see comments below):
 *   google_places, serpapi, apify
 *
 * Adding a new provider:
 *   1. Create providers/MyProvider.js extending LeadProvider
 *   2. Add a case below
 *   3. Add the API key var to .env.example
 */

'use strict';

const MockLeadProvider       = require('./MockLeadProvider');
const OutscraperProvider     = require('./OutscraperProvider');

function createProvider() {
  const name = (process.env.LEAD_PROVIDER || 'mock').toLowerCase().trim();

  switch (name) {
    // ── Active providers ────────────────────────────────────────────────────

    case 'mock':
      return new MockLeadProvider();

    case 'outscraper': {
      const key = process.env.OUTSCRAPER_API_KEY;
      if (!key || !key.trim()) {
        throw new Error(
          '[OutscraperProvider] OUTSCRAPER_API_KEY is not set.\n' +
          'Add it to your .env: OUTSCRAPER_API_KEY=your_key_here\n' +
          'Get a key at https://outscraper.com/\n' +
          'Or use LEAD_PROVIDER=mock for demo data.'
        );
      }
      return new OutscraperProvider(key);
    }

    // ── Stub providers (not yet implemented) ───────────────────────────────

    case 'google_places':
      throw new Error(
        'Google Places provider is not yet implemented.\n' +
        'Use LEAD_PROVIDER=outscraper or LEAD_PROVIDER=mock.'
      );

    case 'serpapi':
      throw new Error(
        'SerpAPI provider is not yet implemented.\n' +
        'Use LEAD_PROVIDER=outscraper or LEAD_PROVIDER=mock.'
      );

    case 'apify':
      throw new Error(
        'Apify provider is not yet implemented.\n' +
        'Use LEAD_PROVIDER=outscraper or LEAD_PROVIDER=mock.'
      );

    // ── Unknown ─────────────────────────────────────────────────────────────

    default:
      console.warn(`[leads] Unknown LEAD_PROVIDER="${name}" — falling back to mock.`);
      return new MockLeadProvider();
  }
}

module.exports = createProvider();
