const LeadProvider = require('./LeadProvider');
const { scoreLead } = require('../lib/leadScorer');

// ── Deterministic PRNG seeded on city+industry so results are consistent ──────
function seededRng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = (s * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  }
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Street name pool ──────────────────────────────────────────────────────────
const STREETS = [
  'Main St', 'Oak Ave', 'Maple Dr', 'Park Blvd', 'Cedar Rd',
  'Michigan Ave', 'Grand River Ave', 'Telegraph Rd', 'Gratiot Ave',
  'Woodward Ave', 'Jefferson Ave', 'Fort St', 'Mack Ave', 'Van Dyke Ave',
  'Broadway', 'Market St', 'Central Ave', 'Lake Shore Dr', 'Lincoln Hwy',
  'Washington Blvd', 'Commerce Dr', 'Industrial Pkwy', 'Heritage Blvd',
  'Sunrise Blvd', 'Atlantic Ave', 'Pacific Blvd', 'Spring St', 'Elm St',
];

// ── Area-code lookup by city keyword ─────────────────────────────────────────
const AREA_CODES = {
  michigan:    ['313', '248', '586', '734', '517'],
  florida:     ['305', '786', '954', '561', '407', '850'],
  texas:       ['214', '972', '817', '713', '512', '210'],
  california:  ['213', '323', '818', '310', '415', '619', '949'],
  newyork:     ['212', '718', '646', '347', '914', '516'],
  illinois:    ['312', '773', '630', '847'],
  georgia:     ['404', '678', '770', '762'],
  arizona:     ['602', '480', '623', '520'],
  ohio:        ['216', '614', '513', '440'],
  colorado:    ['303', '720', '719'],
  washington:  ['206', '425', '253', '360'],
  nevada:      ['702', '725'],
  tennessee:   ['615', '901', '865'],
  carolina:    ['704', '980', '919', '828'],
};

const CITY_TO_REGION = {
  michigan: ['michigan', 'detroit', 'dearborn', 'ann arbor', 'flint', 'lansing', 'grand rapids'],
  florida:  ['florida', 'miami', 'orlando', 'tampa', 'jacksonville', 'fort lauderdale'],
  texas:    ['texas', 'dallas', 'houston', 'austin', 'san antonio', 'fort worth'],
  california: ['california', 'los angeles', 'san francisco', 'san diego', 'sacramento', 'oakland'],
  newyork:  ['new york', 'brooklyn', 'queens', 'bronx', 'manhattan', 'long island'],
  illinois: ['illinois', 'chicago', 'naperville', 'aurora'],
  georgia:  ['georgia', 'atlanta', 'savannah'],
  arizona:  ['arizona', 'phoenix', 'scottsdale', 'tempe', 'mesa'],
  ohio:     ['ohio', 'cleveland', 'columbus', 'cincinnati'],
  colorado: ['colorado', 'denver', 'boulder', 'colorado springs'],
  washington: ['washington', 'seattle', 'tacoma', 'bellevue', 'spokane'],
  nevada:   ['nevada', 'las vegas', 'henderson', 'reno'],
  tennessee: ['tennessee', 'nashville', 'memphis', 'knoxville'],
  carolina: ['carolina', 'charlotte', 'raleigh', 'greensboro'],
};

function getAreaCode(rng, city) {
  const lower = city.toLowerCase();
  for (const [region, keywords] of Object.entries(CITY_TO_REGION)) {
    if (keywords.some(k => lower.includes(k))) {
      return pick(rng, AREA_CODES[region]);
    }
  }
  // Generic fallback: plausible-looking 3-digit code
  return String(200 + Math.floor(rng() * 600));
}

// ── Per-industry data ─────────────────────────────────────────────────────────
const INDUSTRY_DATA = {
  Barbershop: {
    nameParts: [
      ['Fade', 'Classic', 'Elite', 'Fresh', 'Sharp', 'Ace', 'Gold', 'Premier', 'Royal', 'Legacy', 'Metro', 'Vertex'],
      ['Masters', 'Cuts', 'Studio', 'Blades', 'Edge', 'Works', 'Spot', 'Room', 'Den', 'Lounge'],
      ['Barbershop', 'Barbers', 'Hair Studio', 'Grooming', '& Shave', 'Cuts'],
    ],
    reviews: [
      '★★★★★ Best fade in the city. Consistent every single time I come in.',
      '★★★★★ They always hook me up right. The beard trim is always on point.',
      '★★★★★ Clean shop, good music, even better cuts. Highly recommend.',
      '★★★★★ My son loves coming here. They\'re great with kids and super patient.',
      '★★★★★ Been coming here 3 years and never once been disappointed.',
      '★★★★★ Quick service and excellent quality cuts. The lineup is always sharp.',
      '★★★★★ The staff is friendly and professional. Best barbershop in the area.',
      '★★★★★ This place is the real deal. I always leave looking fresh.',
      '★★★★★ Great atmosphere, great barbers. Won\'t go anywhere else.',
      '★★★★★ Hot shave was amazing — very relaxing and professional.',
      '★★★★ Good cuts, fair prices. Wish they were open Sundays.',
      '★★★★ Great experience overall. Wait can be a bit long but always worth it.',
      '★★★★★ They remembered my exact style from last time. That\'s real service.',
    ],
  },
  Medspa: {
    nameParts: [
      ['Prestige', 'Luxe', 'Elite', 'Glow', 'Radiant', 'Pure', 'Serenity', 'Revive', 'Lumina', 'Aurore', 'Velvet'],
      ['Skin', 'Beauty', 'Wellness', 'Aesthetics', 'Renewal', 'Glow', 'Body'],
      ['Medspa', 'Med Spa', 'Aesthetics', 'Skincare Studio', 'Wellness Center', 'Institute'],
    ],
    reviews: [
      '★★★★★ I\'ve tried several medspas and this one is by far the best.',
      '★★★★★ The provider explained everything perfectly. My skin looks 10 years younger.',
      '★★★★★ The staff made me feel so comfortable. My Botox results are natural and beautiful.',
      '★★★★★ Amazing results from my laser treatment. Very professional and clean.',
      '★★★★★ Had a HydraFacial and my skin has never felt this hydrated.',
      '★★★★★ Very personalized experience. They actually care about long-term results.',
      '★★★★★ My filler results look completely natural. Could not be happier.',
      '★★★★★ Free consultation was very informative. Great team, exceptional results.',
      '★★★★★ Clean, professional, and the results speak for themselves.',
      '★★★★★ Two years of treatments and they are consistently excellent.',
      '★★★★ Great results on my first visit. Already booked my next appointment.',
      '★★★★★ I canceled my old medspa after one visit here. Night and day difference.',
    ],
  },
  Restaurant: {
    nameParts: [
      ['Golden', 'Casa', 'La Bella', 'Authentic', 'Family', 'Original', 'Grand', 'Little', 'Old Town', 'Harbor'],
      ['Kitchen', 'Grill', 'Table', 'Bistro', 'Garden', 'House', 'Corner'],
      ['Restaurant', 'Eatery', 'Kitchen', 'Grill', 'Cafe', 'Diner'],
    ],
    reviews: [
      '★★★★★ The food here is absolutely incredible. Authentic flavors every single time.',
      '★★★★★ Best restaurant in the area. The owner is always there making sure everything is right.',
      '★★★★★ My family comes here every week. The consistency keeps us coming back.',
      '★★★★★ Huge portions and amazing quality. Worth every penny.',
      '★★★★★ The freshest ingredients I\'ve ever tasted. You can tell they care.',
      '★★★★★ Amazing flavors and great service. The staff treats you like family.',
      '★★★★★ The best meal I\'ve had in years. Will be back every chance I get.',
      '★★★★★ Homemade everything and you can absolutely taste the difference.',
      '★★★★★ Perfect for date nights or family dinners. Highly recommend.',
      '★★★★★ Drove 45 minutes for this food and it was 100% worth it.',
      '★★★★ Great food and big portions. Service a bit slow but food makes up for it.',
      '★★★★★ This is what a local restaurant should be. Real food, real people.',
    ],
  },
  'Auto Shop': {
    nameParts: [
      ['Pro', 'Expert', 'Precision', 'Quality', 'Reliable', 'Honest', 'Certified', 'Premier', 'Accurate', 'Fast'],
      ['Auto', 'Motor', 'Engine', 'Car'],
      ['Auto Repair', 'Automotive', 'Car Care', 'Mechanics', 'Auto Service', 'Service Center'],
    ],
    reviews: [
      '★★★★★ Finally found an honest mechanic. Explained everything clearly, no overselling.',
      '★★★★★ Quick turnaround and very fair pricing. Won\'t go anywhere else.',
      '★★★★★ Fixed my brakes same day at a very reasonable price.',
      '★★★★★ Honest and do great work — a rare combination in this industry.',
      '★★★★★ Quoted $800 elsewhere, they fixed it for $200. Extremely honest shop.',
      '★★★★★ The owner personally inspected my car and was completely transparent.',
      '★★★★★ Professional, clean shop, and fast service. Highly recommend.',
      '★★★★★ In and out in 2 hours. Very fair pricing and friendly staff.',
      '★★★★★ No upselling, just honest repairs at a fair price. Old school integrity.',
      '★★★★★ They treat your car like their own. Always satisfied leaving here.',
      '★★★★ Good, reliable shop. Prices are fair and they don\'t cut corners.',
      '★★★★★ Took my car in with a noise I couldn\'t figure out. They found it in 20 minutes.',
    ],
  },
  Dentist: {
    nameParts: [
      ['Bright', 'Premier', 'Family', 'Advanced', 'Gentle', 'Modern', 'Comfort', 'Caring', 'Brilliant', 'Clear'],
      ['Smile', 'Dental', 'Care', 'Health'],
      ['Dental', 'Dentistry', 'Dental Care', 'Family Dental', 'Dental Group', 'Smile Center'],
    ],
    reviews: [
      '★★★★★ Best dental experience of my life. Dr. made me feel completely at ease.',
      '★★★★★ Used to be terrified of the dentist. This office completely changed that.',
      '★★★★★ Very gentle and thorough. My cleaning was painless and staff was wonderful.',
      '★★★★★ Modern clean office and no judgment for my long gap between visits.',
      '★★★★★ They explained every step of my procedure. Felt completely in control.',
      '★★★★★ The hygienist was very thorough and gentle. Best cleaning I\'ve ever had.',
      '★★★★★ Always on time, never rushing. They truly care about your comfort.',
      '★★★★★ My kids love coming here. Staff is so patient and gentle with them.',
      '★★★★★ Top-notch equipment and an extremely skilled team.',
      '★★★★★ Dr. has magic hands. I felt absolutely nothing during my filling.',
      '★★★★ Very good experience overall. The wait room could be a bit bigger.',
    ],
  },
  Landscaping: {
    nameParts: [
      ['Green', 'Fresh', 'Pro', 'Elite', 'Premier', 'Perfect', 'Scenic', 'Natural', 'Emerald', 'Verdant'],
      ['Lawn', 'Garden', 'Yard', 'Landscape', 'Turf'],
      ['Landscaping', 'Lawn Care', 'Garden Services', 'Outdoor Living', 'Property Services'],
    ],
    reviews: [
      '★★★★★ My yard has never looked better. They show up on time every week without fail.',
      '★★★★★ Very professional crew. Cleaned up every last leaf and blade of grass.',
      '★★★★★ Reasonable pricing and exceptional work. Couldn\'t be happier.',
      '★★★★★ Completely transformed my backyard. Neighbors keep asking who did it.',
      '★★★★★ Showed up when they said they would and did exactly what was agreed.',
      '★★★★★ They take pride in their work. You can see and feel the difference.',
      '★★★★★ Best lawn service I\'ve ever used. Always consistent and thorough.',
      '★★★★★ Went above and beyond without charging extra. Class act.',
      '★★★★★ Very reasonable pricing for the quality of work they deliver.',
      '★★★★★ My grass is the best looking on the block now. These guys are great.',
      '★★★★ Very good service. Occasionally they miss a small spot but always fix it.',
    ],
  },
  Roofing: {
    nameParts: [
      ['Pro', 'Premier', 'Reliable', 'Quality', 'Shield', 'Expert', 'Ace', 'Superior', 'Apex', 'Guardian'],
      ['Roof', 'Roofing', 'Top', 'Cover'],
      ['Roofing', 'Roofing & Construction', 'Roofing Contractors', 'Exteriors & Roofing', 'Roofing Co.'],
    ],
    reviews: [
      '★★★★★ Replaced my entire roof in one day. Clean, professional, and fair price.',
      '★★★★★ They worked with my insurance and handled everything. Zero stress.',
      '★★★★★ Very detailed estimate with no surprises at the end. Completely honest.',
      '★★★★★ Crew was respectful, fast, and cleaned up completely afterward.',
      '★★★★★ They spotted issues my insurance adjuster missed and got them covered.',
      '★★★★★ Extremely professional from first quote to final nail.',
      '★★★★★ Fast, clean, high quality work. My roof looks brand new.',
      '★★★★★ Best roofing experience I\'ve had. Took care of absolutely everything.',
      '★★★★★ No pressure, no upselling. Just honest quality work at a fair price.',
      '★★★★★ Showed up on time, finished on time, and the roof looks perfect.',
      '★★★★ Great work overall. Communication could be a bit more proactive.',
    ],
  },
  Gym: {
    nameParts: [
      ['Elite', 'Iron', 'Power', 'Pro', 'Peak', 'Strong', 'Prime', 'Apex', 'Core', 'Drive', 'Forge'],
      ['Fitness', 'Training', 'Performance', 'Strength', 'Athletics', 'Body'],
      ['Gym', 'Fitness Center', 'Training Center', 'Athletic Club', 'Performance Center'],
    ],
    reviews: [
      '★★★★★ Best gym I\'ve ever been to. Clean, well-equipped, and motivating staff.',
      '★★★★★ The trainers are the real deal. More results in 3 months than 2 years elsewhere.',
      '★★★★★ A true community. Everyone is welcoming and the atmosphere is amazing.',
      '★★★★★ State-of-the-art equipment and never too crowded. Worth every penny.',
      '★★★★★ The personal training program here literally changed my life.',
      '★★★★★ Love the group classes. Instructors push you in a genuinely motivating way.',
      '★★★★★ Clean, spacious, great equipment. This is what a gym should be.',
      '★★★★★ The staff goes out of their way to help you reach your goals.',
      '★★★★★ Member for 2 years and the quality of the facility never drops.',
      '★★★★★ Friendly people, clean environment, no egos. Perfect gym culture.',
      '★★★★ Great gym. Parking can be tricky during peak hours but worth it.',
    ],
  },
  Salon: {
    nameParts: [
      ['Luxe', 'Prestige', 'Chic', 'Modern', 'Elite', 'Glamour', 'Vogue', 'Radiant', 'Opulent', 'Bliss'],
      ['Hair', 'Beauty', 'Style', 'Color', 'Curl'],
      ['Salon', 'Hair Studio', 'Beauty Bar', 'Hair & Beauty', 'Hair Lounge'],
    ],
    reviews: [
      '★★★★★ Best hair color I\'ve ever had. She nailed my vision on the first try.',
      '★★★★★ I always leave feeling like a completely new person. Amazing stylists.',
      '★★★★★ My highlights look so natural. I\'ve been complimented constantly.',
      '★★★★★ Very knowledgeable about hair health. Only uses quality products.',
      '★★★★★ The atmosphere is relaxing and results are consistently amazing.',
      '★★★★★ She listened to exactly what I wanted and delivered beyond my expectations.',
      '★★★★★ Most talented colorist in the area. Won\'t go anywhere else.',
      '★★★★★ Clean, stylish salon with incredibly talented and friendly staff.',
      '★★★★★ My hair has never looked better. The care they put in every session shows.',
      '★★★★★ Always on time and always perfect results. My go-to salon for years.',
      '★★★★ Great salon overall. Booking can sometimes be hard to get on short notice.',
    ],
  },
  Clinic: {
    nameParts: [
      ['Premier', 'Advanced', 'Family', 'Urgent', 'Comprehensive', 'Complete', 'Wellness', 'Integrative'],
      ['Medical', 'Health', 'Care', 'Primary'],
      ['Clinic', 'Medical Center', 'Health Center', 'Urgent Care', 'Family Practice', 'Health Group'],
    ],
    reviews: [
      '★★★★★ The doctor actually listens and takes time to explain everything. A rare find.',
      '★★★★★ Best medical experience I\'ve had. They truly care about their patients.',
      '★★★★★ Got in same day for an urgent issue. Very efficient and thorough.',
      '★★★★★ The staff is warm and the wait times are actually reasonable here.',
      '★★★★★ Dr. was very thorough and didn\'t rush me out. Answered all my questions.',
      '★★★★★ Finally a doctor who listens and actually explains what\'s going on.',
      '★★★★★ Extremely professional and caring staff. Felt very well taken care of.',
      '★★★★★ Very clean and modern facility with a knowledgeable and friendly team.',
      '★★★★★ They remembered me from my last visit and asked follow-up questions.',
      '★★★★★ Quick, efficient, and genuinely caring. This is what healthcare should be.',
      '★★★★ Very good clinic. Sometimes a bit of a wait but the quality is always there.',
    ],
  },
};

const DEFAULT_INDUSTRY_DATA = {
  nameParts: [
    ['Premier', 'Elite', 'Pro', 'Expert', 'Quality', 'Reliable', 'Trusted'],
    ['Solutions', 'Services', 'Group', 'Works'],
    ['LLC', 'Co.', 'Inc.', ''],
  ],
  reviews: [
    '★★★★★ Excellent service from start to finish. Highly recommend.',
    '★★★★★ Very professional and reliable. Will definitely use them again.',
    '★★★★★ Great experience. Top-notch team and fair pricing.',
    '★★★★★ Fair pricing and quality work. Could not be happier.',
    '★★★★ Good service. Would recommend to anyone in the area.',
  ],
};

class MockLeadProvider extends LeadProvider {
  async searchBusinesses({ city, industry, minRating = 1, minReviews = 0, websiteStatus = 'any', count = 10 }) {
    const seed = `${city.toLowerCase()}-${industry.toLowerCase()}`;
    const rng = seededRng(seed);
    const data = INDUSTRY_DATA[industry] || DEFAULT_INDUSTRY_DATA;
    const cityName = city.split(',')[0].trim();
    const stateMatch = city.match(/,\s*([A-Z]{2})/i);
    const stateCode = stateMatch ? stateMatch[1].toUpperCase() : 'MI';

    // Generate a large pool, then filter + sort by score
    const pool = [];
    for (let i = 0; i < 35; i++) {
      pool.push(this._generateBusiness(rng, cityName, stateCode, city, industry, data, i));
    }

    let filtered = pool.filter(b => {
      if (b.rating < minRating) return false;
      if (b.reviewCount < minReviews) return false;
      if (websiteStatus === 'none' && b.websiteStatus !== 'none') return false;
      if (websiteStatus === 'weak' && b.websiteStatus !== 'weak') return false;
      if (websiteStatus === 'none_or_weak' && b.websiteStatus !== 'none' && b.websiteStatus !== 'weak') return false;
      return true;
    });

    filtered = filtered
      .map(b => ({ ...b, score: scoreLead(b) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(count, 25));

    return filtered;
  }

  _generateBusiness(rng, cityName, stateCode, fullCity, industry, data, index) {
    const parts = data.nameParts;

    // Three name patterns for variety
    const pattern = Math.floor(rng() * 4);
    let name;
    const p0 = pick(rng, parts[0]);
    const p1 = pick(rng, parts[1]);
    const p2 = parts[2] ? pick(rng, parts[2]) : '';
    if (pattern === 0) name = [p0, p1, p2].filter(Boolean).join(' ');
    else if (pattern === 1) name = [p0, p2].filter(Boolean).join(' ');
    else if (pattern === 2) name = [cityName, p0, p2].filter(Boolean).join(' ');
    else                    name = [p0, p1].filter(Boolean).join(' ');

    // Trim double-spaces
    name = name.replace(/\s+/g, ' ').trim();

    // Rating: skewed toward 4.2-4.9 to represent active businesses
    const rating = Math.round((3.8 + rng() * 1.2) * 10) / 10;

    // Review count: log-ish distribution
    const reviewCount = Math.floor(8 + Math.pow(rng(), 1.5) * 380);

    // Website status (weighted)
    const ws = rng();
    let websiteStatus;
    if      (ws < 0.33) websiteStatus = 'none';
    else if (ws < 0.65) websiteStatus = 'weak';
    else if (ws < 0.88) websiteStatus = 'decent';
    else                websiteStatus = 'strong';

    // Address
    const streetNum = 100 + Math.floor(rng() * 9800);
    const street = pick(rng, STREETS);
    const zip = String(10000 + Math.floor(rng() * 89000));
    const address = `${streetNum} ${street}, ${cityName}, ${stateCode} ${zip}`;

    // Phone
    const areaCode = getAreaCode(rng, fullCity);
    const phone = `(${areaCode}) ${Math.floor(200 + rng() * 799)}-${String(Math.floor(rng() * 9999)).padStart(4, '0')}`;

    // Website URL
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let websiteUrl = null;
    if (websiteStatus === 'weak')   websiteUrl = `http://${slug}.com`;
    if (websiteStatus === 'decent') websiteUrl = `https://${slug}.com`;
    if (websiteStatus === 'strong') websiteUrl = `https://www.${slug}.com`;

    // Email: ~20% chance when they have a website
    let email = null;
    if (websiteUrl && rng() < 0.22) {
      const prefix = pick(rng, ['info', 'contact', 'hello', 'office']);
      email = `${prefix}@${slug.replace(/-/g, '').slice(0, 20)}.com`;
    }

    // Social links
    const socialLinks = [];
    if (rng() < 0.62) socialLinks.push({ platform: 'Facebook',  url: `https://www.facebook.com/${slug}` });
    if (rng() < 0.44) socialLinks.push({ platform: 'Instagram', url: `https://www.instagram.com/${slug}` });

    // Reviews: shuffle template pool and pick 6-10
    const reviewPool = [...data.reviews].sort(() => rng() - 0.5);
    const numReviews = 6 + Math.floor(rng() * 4);
    const reviews = reviewPool.slice(0, Math.min(numReviews, reviewPool.length));

    // Google Maps deep-link
    const mapsQuery = encodeURIComponent(`${name} ${cityName} ${stateCode}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    return {
      placeId: `mock_${index}_${seed(name)}`,
      name,
      industry,
      city: fullCity,
      address,
      phone,
      rating,
      reviewCount,
      websiteStatus,
      websiteUrl,
      email,
      socialLinks,
      reviews,
      mapsUrl,
    };
  }

  async getBusinessDetails(placeId) {
    return null; // Mock: detailed fetch not needed — all data returned in searchBusinesses
  }

  async getReviews(placeId) {
    return [];
  }

  async findEmail(websiteUrl) {
    return null; // Real implementation would crawl /contact page
  }
}

function seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h).toString(16).slice(0, 8);
}

module.exports = MockLeadProvider;
