/**
 * Lead scoring — returns an integer 0-100 representing how strong an
 * opportunity a business is for a cold web-design pitch.
 *
 * Higher is better. Rough bands:
 *   90-100  Excellent — likely to convert, reach out immediately
 *   75-89   Strong    — good fit, prioritize
 *   60-74   Good      — worth contacting
 *   45-59   Fair      — lower priority
 *   0-44    Low       — skip unless you have excess capacity
 */

const CHAIN_FRAGMENTS = [
  'great clips', 'supercuts', 'sport clips', 'regis', 'fantastic sams',
  'hair cuttery', 'great clips', 'floyd\'s',
  'mcdonald', 'subway', 'domino', 'pizza hut', 'burger king', 'wendy\'s',
  'taco bell', 'chipotle', 'dunkin', 'starbucks', 'chick-fil-a',
  'jiffy lube', 'pep boys', 'firestone', 'midas', 'valvoline', 'take 5',
  'planet fitness', 'anytime fitness', '24 hour fitness', 'la fitness',
  'ulta beauty', 'great clips',
  'aspen dental', 'western dental', 'bright now', 'gentle dental',
  'h&r block', 'jackson hewitt',
  'snap fitness', 'orange theory', 'f45',
];

function isChain(name) {
  const lower = name.toLowerCase();
  return CHAIN_FRAGMENTS.some(f => lower.includes(f));
}

/**
 * @param {import('../providers/LeadProvider')} lead
 * @returns {number} 0-100
 */
function scoreLead(lead) {
  let score = 50;

  // ── Website status (biggest signal) ──────────────────────────────────────
  switch (lead.websiteStatus) {
    case 'none':   score += 28; break; // No website at all — easiest sell
    case 'weak':   score += 16; break; // Old/broken site — clear upgrade case
    case 'decent': score -= 6;  break; // Has something functional
    case 'strong': score -= 22; break; // Already invested in web presence
    default: break;
  }

  // ── Google rating ─────────────────────────────────────────────────────────
  // High rating = satisfied customers = positive energy for new investment
  if      (lead.rating >= 4.7) score += 12;
  else if (lead.rating >= 4.5) score += 8;
  else if (lead.rating >= 4.3) score += 5;
  else if (lead.rating >= 4.0) score += 0;
  else if (lead.rating >= 3.5) score -= 8;
  else                          score -= 18;

  // ── Review volume ─────────────────────────────────────────────────────────
  // Many reviews = established business, proof customers talk about them
  if      (lead.reviewCount >= 300) score += 14;
  else if (lead.reviewCount >= 150) score += 10;
  else if (lead.reviewCount >= 75)  score += 6;
  else if (lead.reviewCount >= 30)  score += 2;
  else if (lead.reviewCount < 15)   score -= 10;

  // ── Contact reachability ──────────────────────────────────────────────────
  if (lead.email) score += 8;   // Can email them directly
  if (lead.phone) score += 4;   // Can call them

  // ── Social presence ───────────────────────────────────────────────────────
  // Active on social = understands digital marketing value
  if (lead.socialLinks && lead.socialLinks.length > 0) score += 3;

  // ── Chain / franchise penalty ─────────────────────────────────────────────
  if (lead.name && isChain(lead.name)) score -= 25;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Returns a human label and hex color for a score value.
 * @param {number} score
 * @returns {{ label: string, color: string }}
 */
function getScoreLabel(score) {
  if (score >= 90) return { label: 'Excellent', color: '#10b981' };
  if (score >= 75) return { label: 'Strong',    color: '#34d399' };
  if (score >= 60) return { label: 'Good',      color: '#f59e0b' };
  if (score >= 45) return { label: 'Fair',      color: '#fb923c' };
  return                  { label: 'Low',       color: '#ef4444' };
}

module.exports = { scoreLead, getScoreLabel };
