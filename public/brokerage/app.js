/* ─── LISTINGS DATA ──────────────────────────────────────────────────────── */
// Sample MLS data. Replace with a live IDX feed from your MLS provider.
const listings = [
  {
    id: 1,
    address: '124 Lakeview Drive',
    city: 'Lakewood',
    price: 487500,
    beds: 4,
    baths: 3,
    sqft: 2340,
    type: 'Single Family',
    status: 'Active',
    mls: 'MLS#25-10521',
    gradient: 'linear-gradient(135deg, #1a2a3a 0%, #0f1e2d 100%)',
    accentIcon: '🌊'
  },
  {
    id: 2,
    address: '56 Maple Ridge Road',
    city: 'Lakewood',
    price: 329000,
    beds: 3,
    baths: 2,
    sqft: 1680,
    type: 'Single Family',
    status: 'Active',
    mls: 'MLS#25-10854',
    gradient: 'linear-gradient(135deg, #2a1a10 0%, #1e1008 100%)',
    accentIcon: '🍁'
  },
  {
    id: 3,
    address: '890 Harbor View Court',
    city: 'Lakewood',
    price: 672000,
    beds: 5,
    baths: 4,
    sqft: 3100,
    type: 'Single Family',
    status: 'Active',
    mls: 'MLS#25-11002',
    gradient: 'linear-gradient(135deg, #1a2a1a 0%, #0f1e0f 100%)',
    accentIcon: '⚓'
  },
  {
    id: 4,
    address: '101 Pine Hollow Court #4B',
    city: 'Lakewood',
    price: 259000,
    beds: 2,
    baths: 2,
    sqft: 1120,
    type: 'Condo',
    status: 'Active',
    mls: 'MLS#25-10765',
    gradient: 'linear-gradient(135deg, #1a1a2a 0%, #0f0f1e 100%)',
    accentIcon: '🏙️'
  },
  {
    id: 5,
    address: '215 Sunset Boulevard',
    city: 'Lakewood',
    price: 195000,
    beds: 2,
    baths: 1,
    sqft: 950,
    type: 'Condo',
    status: 'Active',
    mls: 'MLS#25-10432',
    gradient: 'linear-gradient(135deg, #2a2010 0%, #1a1408 100%)',
    accentIcon: '🌅'
  },
  {
    id: 6,
    address: '33 Birchwood Lane',
    city: 'Lakewood',
    price: 415000,
    beds: 4,
    baths: 3,
    sqft: 2050,
    type: 'Townhome',
    status: 'Active',
    mls: 'MLS#25-10988',
    gradient: 'linear-gradient(135deg, #1a2a20 0%, #0f1e14 100%)',
    accentIcon: '🌲'
  },
  {
    id: 7,
    address: '77 Shoreline Way',
    city: 'Lakewood',
    price: 549000,
    beds: 3,
    baths: 2,
    sqft: 1920,
    type: 'Single Family',
    status: 'Active',
    mls: 'MLS#25-11145',
    gradient: 'linear-gradient(135deg, #0f1e2a 0%, #081418 100%)',
    accentIcon: '🌊'
  },
  {
    id: 8,
    address: '400 Country Club Drive',
    city: 'Lakewood',
    price: 875000,
    beds: 5,
    baths: 5,
    sqft: 4200,
    type: 'Single Family',
    status: 'Active',
    mls: 'MLS#25-11200',
    gradient: 'linear-gradient(135deg, #1e1a0a 0%, #14120a 100%)',
    accentIcon: '⛳'
  },
  {
    id: 9,
    address: '18 Aspen Court',
    city: 'Lakewood',
    price: 285000,
    beds: 3,
    baths: 2,
    sqft: 1450,
    type: 'Townhome',
    status: 'Active',
    mls: 'MLS#25-11050',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #111111 100%)',
    accentIcon: '🌿'
  }
];

/* ─── FORMAT HELPERS ─────────────────────────────────────────────────────── */
function formatPrice(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2) + 'M';
  if (n >= 1000)    return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

function formatPriceFull(n) {
  return '$' + n.toLocaleString();
}

function formatSqft(n) {
  return n.toLocaleString() + ' sqft';
}

/* ─── RENDER LISTING CARD ────────────────────────────────────────────────── */
function renderCard(listing) {
  return `
    <div class="listing-card">
      <div class="listing-img">
        <div class="listing-img-inner" style="background: ${listing.gradient}; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size: 2.5rem;">
          ${listing.accentIcon}
        </div>
        <div class="listing-badge">${listing.status}</div>
      </div>
      <div class="listing-body">
        <div class="listing-price">${formatPriceFull(listing.price)}</div>
        <div class="listing-address">${listing.address}</div>
        <div class="listing-city">${listing.city} &nbsp;|&nbsp; <span style="font-size:10px;opacity:.6;">${listing.mls}</span></div>
        <div class="listing-type">${listing.type}</div>
        <div class="listing-details">
          <div class="listing-detail">
            <span>${listing.beds}</span>
            <span>Beds</span>
          </div>
          <div class="listing-detail">
            <span>${listing.baths}</span>
            <span>Baths</span>
          </div>
          <div class="listing-detail">
            <span>${listing.sqft.toLocaleString()}</span>
            <span>Sq Ft</span>
          </div>
        </div>
        <a href="#contact" class="listing-cta">Schedule a Showing</a>
      </div>
    </div>
  `;
}

/* ─── FILTER + RENDER LISTINGS ───────────────────────────────────────────── */
function filterListings() {
  const query   = document.getElementById('searchInput').value.toLowerCase().trim();
  const minP    = parseInt(document.getElementById('minPrice').value) || 0;
  const maxP    = parseInt(document.getElementById('maxPrice').value) || Infinity;
  const minBeds = parseInt(document.getElementById('beds').value)     || 0;
  const typeVal = document.getElementById('propType').value;

  const filtered = listings.filter(l => {
    const matchSearch = !query ||
      l.address.toLowerCase().includes(query) ||
      l.city.toLowerCase().includes(query)    ||
      l.type.toLowerCase().includes(query);
    const matchPrice = l.price >= minP && l.price <= maxP;
    const matchBeds  = l.beds >= minBeds;
    const matchType  = !typeVal || l.type === typeVal;
    return matchSearch && matchPrice && matchBeds && matchType;
  });

  const grid = document.getElementById('listingsGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <h3>No listings match your search</h3>
        <p>Try adjusting your filters or <a href="#contact" style="color:var(--gold)">contact Lilly</a> for personalized options.</p>
      </div>`;
  } else {
    grid.innerHTML = filtered.map(renderCard).join('');
  }
}

/* ─── NAVBAR SCROLL EFFECT ───────────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

/* ─── MOBILE MENU ────────────────────────────────────────────────────────── */
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}

/* ─── SCROLL FADE-IN ANIMATION ───────────────────────────────────────────── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        // Stagger cards in a grid
        const delay = entry.target.closest('.videos-grid, .listings-grid, .buy-sell-grid, .blog-grid, .staging-steps')
          ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 80
          : 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

/* ─── CONTACT FORM ───────────────────────────────────────────────────────── */
function submitForm(e) {
  e.preventDefault();
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  form.style.display    = 'none';
  success.style.display = 'block';
  // In production, send form data to your email/CRM endpoint here.
}

/* ─── SMOOTH SCROLL FOR NAV LINKS ────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80; // navbar height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ─── INIT ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  filterListings();
  initScrollAnimations();
});
