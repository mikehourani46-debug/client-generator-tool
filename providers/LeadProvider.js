/**
 * Abstract Lead Provider interface.
 *
 * To add a real data source, extend this class and implement all four methods,
 * then register it in providers/index.js and set LEAD_PROVIDER in your .env.
 *
 * Supported / planned providers:
 *   mock          — Deterministic demo data, no API key required (default)
 *   google_places — Google Places API  (GOOGLE_PLACES_API_KEY)
 *   serpapi       — SerpAPI Google Maps  (SERPAPI_KEY)
 *   outscraper    — Outscraper Maps API  (OUTSCRAPER_API_KEY)
 *   apify         — Apify Google Maps scraper  (APIFY_TOKEN)
 *
 * @typedef {Object} Lead
 * @property {string}   placeId        — Provider-specific unique ID
 * @property {string}   name
 * @property {string}   industry
 * @property {string}   city
 * @property {string}   address
 * @property {string}   phone
 * @property {number}   rating         — 1.0 – 5.0
 * @property {number}   reviewCount
 * @property {string}   websiteStatus  — 'none' | 'weak' | 'decent' | 'strong'
 * @property {string|null} websiteUrl
 * @property {string|null} email
 * @property {Array<{platform:string,url:string}>} socialLinks
 * @property {string[]} reviews        — 5-10 short review snippets
 * @property {string}   mapsUrl        — Deep-link to Google Maps listing
 * @property {number}   [score]        — Populated by leadScorer after fetch
 */

class LeadProvider {
  /**
   * Search for businesses matching the given criteria.
   *
   * @param {Object}  params
   * @param {string}  params.city
   * @param {string}  params.industry
   * @param {number}  params.minRating      — Minimum Google rating (default 1)
   * @param {number}  params.minReviews     — Minimum review count (default 0)
   * @param {string}  params.websiteStatus  — 'any' | 'none' | 'weak' | 'none_or_weak'
   * @param {number}  params.count          — Max leads to return (max 25)
   * @returns {Promise<Lead[]>}
   */
  async searchBusinesses(params) {
    throw new Error('searchBusinesses() must be implemented by the provider');
  }

  /**
   * Fetch full details for a single listing.
   * @param {string} placeId
   * @returns {Promise<Lead|null>}
   */
  async getBusinessDetails(placeId) {
    throw new Error('getBusinessDetails() must be implemented by the provider');
  }

  /**
   * Fetch review text snippets for a listing.
   * @param {string} placeId
   * @returns {Promise<string[]>}
   */
  async getReviews(placeId) {
    throw new Error('getReviews() must be implemented by the provider');
  }

  /**
   * Attempt to find a public contact email by crawling the business website.
   * Should never require authentication or violate ToS.
   * @param {string} websiteUrl
   * @returns {Promise<string|null>}
   */
  async findEmail(websiteUrl) {
    throw new Error('findEmail() must be implemented by the provider');
  }
}

module.exports = LeadProvider;
