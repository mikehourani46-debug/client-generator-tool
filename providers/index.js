/**
 * Lead provider factory.
 *
 * Selects the active provider based on the LEAD_PROVIDER env var.
 * Default: 'mock' — works out of the box with no API keys.
 *
 * To switch providers:
 *   LEAD_PROVIDER=google_places  (requires GOOGLE_PLACES_API_KEY)
 *   LEAD_PROVIDER=serpapi        (requires SERPAPI_KEY)
 *   LEAD_PROVIDER=outscraper     (requires OUTSCRAPER_API_KEY)
 *   LEAD_PROVIDER=apify          (requires APIFY_TOKEN)
 *
 * Adding a new provider:
 *   1. Create providers/MyProvider.js extending LeadProvider
 *   2. Add a case below and register the env var in .env.example
 */

const MockLeadProvider = require('./MockLeadProvider');

function createProvider() {
  const name = (process.env.LEAD_PROVIDER || 'mock').toLowerCase().trim();

  switch (name) {
    case 'mock':
      return new MockLeadProvider();

    case 'google_places':
      // Plug in: npm install @googlemaps/google-maps-services-js
      // const GooglePlacesProvider = require('./GooglePlacesProvider');
      // return new GooglePlacesProvider(process.env.GOOGLE_PLACES_API_KEY);
      throw new Error(
        'Google Places provider is not yet implemented.\n' +
        'Create providers/GooglePlacesProvider.js or set LEAD_PROVIDER=mock.'
      );

    case 'serpapi':
      // Plug in: npm install serpapi
      // const SerpApiProvider = require('./SerpApiProvider');
      // return new SerpApiProvider(process.env.SERPAPI_KEY);
      throw new Error(
        'SerpAPI provider is not yet implemented.\n' +
        'Create providers/SerpApiProvider.js or set LEAD_PROVIDER=mock.'
      );

    case 'outscraper':
      // Plug in: npm install outscraper
      // const OutscraperProvider = require('./OutscraperProvider');
      // return new OutscraperProvider(process.env.OUTSCRAPER_API_KEY);
      throw new Error(
        'Outscraper provider is not yet implemented.\n' +
        'Create providers/OutscraperProvider.js or set LEAD_PROVIDER=mock.'
      );

    case 'apify':
      // Plug in: npm install apify-client
      // const ApifyProvider = require('./ApifyProvider');
      // return new ApifyProvider(process.env.APIFY_TOKEN);
      throw new Error(
        'Apify provider is not yet implemented.\n' +
        'Create providers/ApifyProvider.js or set LEAD_PROVIDER=mock.'
      );

    default:
      console.warn(`[leads] Unknown LEAD_PROVIDER="${name}", falling back to mock.`);
      return new MockLeadProvider();
  }
}

module.exports = createProvider();
