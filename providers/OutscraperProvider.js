/**
 * OutscraperProvider — real Google Maps leads via the Outscraper API.
 *
 * Setup:
 *   1. npm install outscraper   (already in package.json)
 *   2. Set LEAD_PROVIDER=outscraper  in .env
 *   3. Set OUTSCRAPER_API_KEY=<key>  in .env
 *
 * Outscraper pricing (May 2025):
 *   Google Maps Search — ~$3 / 1 000 places
 *   Google Maps Reviews — ~$3 / 1 000 reviews
 *   Emails & Contacts   — ~$3 / 1 000 domains
 *
 * Docs: https://outscraper.com/google-maps-api/
 * SDK:  https://github.com/outscraper/outscraper-node
 */

'use strict';

const LeadProvider = require('./LeadProvider');

// Free / generic-platform hostnames that indicate a weak web presence.
const WEAK_PLATFORM_FRAGMENTS = [
  'blogspot.com', 'blogger.com',
  'tumblr.com',
  'wordpress.com',     // note: self-hosted WordPress (own domain) is NOT in this list
  'wixsite.com',       // wix.com on a custom domain is fine; wixsite.com subdomains = free tier
  'weebly.com',
  'yolasite.com',
  'site123.me',
  'godaddysites.com',
  'business.site',     // Google's free one-pager builder
  'jimdosite.com',
  'mystrikingly.com',
  'webnode.com',
];

/**
 * Classify a website URL into one of: 'none' | 'weak' | 'decent'
 * We never return 'strong' here — that would require rendering/auditing
 * the page, which is outside the scope of a lead search.
 *
 * @param {string|null|undefined} url
 * @returns {'none'|'weak'|'decent'}
 */
function detectWebsiteStatus(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return 'none';

  const lower = url.toLowerCase().trim();

  // Free-platform subdomains — business hasn't invested in a real domain
  if (WEAK_PLATFORM_FRAGMENTS.some(f => lower.includes(f))) return 'weak';

  // No HTTPS — outdated or quickly thrown-up site
  if (!lower.startsWith('https://')) return 'weak';

  // HTTPS custom domain — at minimum "decent"
  return 'decent';
}

/**
 * Build a star-prefixed review string from a raw Outscraper review object.
 * Handles variations in field names across SDK versions.
 */
function formatReview(r) {
  if (!r) return null;
  const text = r.review_text || r.text || r.snippet || '';
  if (!text.trim()) return null;
  const rating = r.review_rating ?? r.rating ?? 5;
  const stars = '★'.repeat(Math.max(1, Math.min(5, Math.round(rating))));
  return `${stars} ${text.trim()}`;
}

/**
 * Safely extract a flat array of place objects from whatever shape
 * the Outscraper SDK returns (nested array, flat array, or single object).
 */
function extractPlaces(raw) {
  if (!raw) return [];
  // [[place, place, ...]] — most common shape for single-query calls
  if (Array.isArray(raw) && Array.isArray(raw[0])) return raw[0];
  // [place, place, ...] — flat array
  if (Array.isArray(raw)) return raw;
  // Single object
  return [raw];
}

class OutscraperProvider extends LeadProvider {
  /**
   * @param {string} apiKey — OUTSCRAPER_API_KEY value
   */
  constructor(apiKey) {
    super();
    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        'OUTSCRAPER_API_KEY is missing.\n' +
        'Add it to your .env file: OUTSCRAPER_API_KEY=your_key_here\n' +
        'Get a key at: https://outscraper.com/'
      );
    }
    this.apiKey = apiKey.trim();
    this._client = null;
  }

  /** Lazy-load the SDK so the server still starts if it's not installed. */
  get client() {
    if (!this._client) {
      let Outscraper;
      try {
        Outscraper = require('outscraper');
      } catch {
        throw new Error(
          'The "outscraper" package is not installed.\n' +
          'Run: npm install outscraper'
        );
      }
      this._client = new Outscraper(this.apiKey);
    }
    return this._client;
  }

  // ── searchBusinesses ───────────────────────────────────────────────────────

  async searchBusinesses({ city, industry, minRating = 1, minReviews = 0, websiteStatus = 'any', count = 10 }) {
    // Build the Google Maps query string exactly as a user would type it
    const query = `${industry} in ${city}`;

    // Fetch more than needed so we have buffer after client-side filtering
    const fetchLimit = Math.min(count * 3, 60);

    let raw;
    try {
      // asyncRequest=false → synchronous response (no polling required)
      raw = await this.client.googleMapsSearch(
        [query],   // queries array
        fetchLimit, // organizationsPerQueryLimit
        'en',      // language
        null,      // region
        0,         // skip
        false,     // dropDuplicates
        null,      // enrichment
        false      // asyncRequest — MUST be false for direct response
      );
    } catch (err) {
      throw new Error(`Outscraper search failed: ${err.message}`);
    }

    const places = extractPlaces(raw);

    if (!places.length) return [];

    const leads = places
      .map(p => this._normalize(p, industry, city))
      .filter(Boolean)
      .filter(l => l.rating >= minRating)
      .filter(l => l.reviewCount >= minReviews)
      .filter(l => {
        switch (websiteStatus) {
          case 'none':         return l.websiteStatus === 'none';
          case 'weak':         return l.websiteStatus === 'weak';
          case 'none_or_weak': return l.websiteStatus === 'none' || l.websiteStatus === 'weak';
          default:             return true;
        }
      });

    return leads.slice(0, count);
  }

  // ── getBusinessDetails ─────────────────────────────────────────────────────

  async getBusinessDetails(placeId) {
    if (!placeId) return null;

    let raw;
    try {
      // Outscraper accepts place_id directly as a query
      raw = await this.client.googleMapsSearch([placeId], 1, 'en', null, 0, false, null, false);
    } catch (err) {
      throw new Error(`Outscraper getBusinessDetails failed: ${err.message}`);
    }

    const places = extractPlaces(raw);
    const place = places[0];
    return place ? this._normalize(place, '', '') : null;
  }

  // ── getReviews ─────────────────────────────────────────────────────────────

  async getReviews(placeId) {
    if (!placeId) return [];

    let raw;
    try {
      // reviewsLimit=10, limit=1 (one place), asyncRequest defaults to false
      raw = await this.client.googleMapsReviews(
        [placeId], // query
        10,        // reviewsLimit — reviews per place
        null,      // reviewsQuery (keyword filter)
        1,         // limit — places per query
        'most_relevant', // sort
        null, null, null, null, // pagination + cutoff params
        false,     // ignoreEmpty
        'google',  // source
        'en'       // language
        // asyncRequest defaults to false — no need to pass
      );
    } catch (err) {
      throw new Error(`Outscraper getReviews failed: ${err.message}`);
    }

    // Reviews response: [[{ name, reviews_data: [{review_text, ...}] }]]
    const places = extractPlaces(raw);
    const placeData = places[0];

    if (!placeData) return [];

    const reviewsData = placeData.reviews_data || placeData.reviews || [];

    return reviewsData
      .map(formatReview)
      .filter(Boolean)
      .slice(0, 10);
  }

  // ── findEmail ──────────────────────────────────────────────────────────────

  async findEmail(websiteUrl) {
    if (!websiteUrl) return null;

    let raw;
    try {
      // emailsAndContacts is synchronous by default (asyncRequest=false)
      raw = await this.client.emailsAndContacts([websiteUrl]);
    } catch {
      return null; // Email finding is best-effort; never throw to caller
    }

    if (!raw) return null;

    // Flatten nested array if needed
    const data = Array.isArray(raw[0]) ? raw[0][0] : (Array.isArray(raw) ? raw[0] : raw);
    if (!data) return null;

    // Field names vary slightly by SDK version
    const emails = data.emails ?? data.email ?? data.contacts ?? [];
    if (Array.isArray(emails) && emails.length > 0) {
      const first = emails[0];
      return typeof first === 'string' ? first : (first.email ?? first.value ?? null);
    }
    if (typeof emails === 'string' && emails.includes('@')) return emails;

    return null;
  }

  // ── Internal normalizer ────────────────────────────────────────────────────

  /**
   * Map a raw Outscraper place object to the standard Lead shape.
   * Returns null for clearly invalid records (no name, closed, etc.).
   *
   * @param {Object} raw          — Raw place from Outscraper
   * @param {string} reqIndustry  — Industry from the search params
   * @param {string} reqCity      — City from the search params
   * @returns {import('./LeadProvider').Lead|null}
   */
  _normalize(raw, reqIndustry, reqCity) {
    if (!raw || !raw.name) return null;

    // Skip permanently closed listings
    if (raw.business_status && raw.business_status.toLowerCase().includes('closed')) return null;

    const websiteUrl    = raw.site || null;
    const websiteStatus = detectWebsiteStatus(websiteUrl);

    // Derive city: prefer Outscraper's own city field, fall back to requested
    const city = raw.city || raw.state || reqCity;

    // Build a reliable Maps deep-link
    const mapsUrl = raw.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${raw.place_id}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${raw.name} ${city}`)}`;

    // Social links: Outscraper doesn't include these in basic search;
    // the emailsAndContacts endpoint returns them but we don't call it here.
    const socialLinks = [];

    // rating and reviews are numeric in the API; guard against strings/nulls
    const rating      = typeof raw.rating === 'number' ? raw.rating : parseFloat(raw.rating) || 0;
    const reviewCount = typeof raw.reviews === 'number' ? raw.reviews : parseInt(raw.reviews) || 0;

    return {
      placeId:       raw.place_id || raw.google_id || '',
      name:          raw.name.trim(),
      industry:      reqIndustry || raw.category || raw.type || '',
      city,
      address:       raw.full_address || raw.street || '',
      phone:         raw.phone || '',
      email:         raw.email || null,
      websiteUrl,
      websiteStatus,
      rating,
      reviewCount,
      socialLinks,
      reviews:       [], // Fetched on-demand via getReviews() to control API cost
      mapsUrl,
      source:        'outscraper',
    };
  }
}

module.exports = OutscraperProvider;
