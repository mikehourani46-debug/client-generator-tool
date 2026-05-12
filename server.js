require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory store for generated website previews (id -> html)
const generatedSites = new Map();

// ─── EXISTING OUTREACH GENERATOR PROMPTS ────────────────────────────────────

const PROMPTS = {
  retell: (businessType, location) => `You are an expert at writing AI receptionist prompts for Retell AI.

Write a Retell AI receptionist system prompt for a ${businessType} business located in ${location}.

The prompt should:
- Define the AI receptionist's name, personality, and role
- Include how to greet callers warmly
- List the key services/offerings to mention
- Explain how to handle common questions (hours, pricing, appointments, directions)
- Include escalation paths (when to transfer to a human or take a message)
- Use a friendly, professional tone appropriate for a local ${location} business
- Be 300-500 words

Format it as a ready-to-paste Retell AI system prompt.`,

  website: (businessType, location) => `You are an expert web designer and copywriter.

Create a detailed website outline for a ${businessType} business located in ${location}.

Include:
1. **Homepage** - hero headline, subheadline, CTA, key value props (3-4 bullet points)
2. **About Page** - story structure, trust signals, team section
3. **Services Page** - list 4-6 core services with brief descriptions
4. **Testimonials/Reviews section** - placeholder structure
5. **Contact/Booking Page** - form fields, map embed note, hours
6. **SEO Meta** - suggested page title and meta description for homepage

Make it specific to ${location} (mention local SEO opportunities). Keep each section concise with placeholder copy examples.`,

  coldcall: (businessType, location) => `You are a top sales trainer specializing in local business outreach.

Write a cold call script for selling services TO a ${businessType} business in ${location}.

Structure:
1. **Opening** (5 sec) - name, company, permission to continue
2. **Hook** (10 sec) - specific pain point for this business type
3. **Value Statement** (15 sec) - what you offer and the outcome
4. **Qualifying Questions** (2-3 questions)
5. **Objection Handlers** - address the top 3 objections:
   - "We're not interested"
   - "We already have someone"
   - "Send me an email"
6. **Close** - ask for appointment or next step
7. **Voicemail Version** - 20-second voicemail script

Keep the tone conversational, not robotic. Include stage directions in [brackets].`,

  sms: (businessType, location) => `You are an expert in SMS marketing and follow-up sequences for local businesses.

Write a 5-message SMS follow-up sequence for a ${businessType} business in ${location} to send to new leads or prospects.

For each message include:
- **When to send** (e.g., immediately, 1 day after, 3 days after)
- **Message text** (under 160 characters each)
- **Purpose/goal** of that message

Messages should cover:
1. Initial welcome/confirmation
2. Value-add or helpful tip
3. Soft offer or check-in
4. Social proof or testimonial nudge
5. Final follow-up / re-engagement

Also write 2 bonus messages:
- Appointment reminder (24 hrs before)
- Review request (after service completion)

Keep language casual, friendly, and local to ${location}.`,

  welcome: (businessType, location) => `You are an expert at client onboarding for AI receptionist services sold to local businesses.

Write a client welcome package message for a ${businessType} business in ${location} that just said YES to an AI receptionist service. This is a copy/paste message the agency owner sends immediately after closing the deal.

Structure it EXACTLY like this:

---
**Subject: Welcome to [Agency Name] — Here's Everything You Need**

Hi [Client First Name],

Welcome aboard! We're excited to get your AI receptionist up and running. Here's a quick overview of everything.

**What You're Getting**
List 4-6 specific deliverables for a ${businessType} business (e.g. custom AI receptionist configured for their industry, call handling for [common call types], appointment booking integration, monthly call review, etc.)

**What Happens Next**
Numbered list of 4-5 onboarding steps with realistic timeframes (e.g. Step 1: Complete your onboarding form — takes ~5 min. Step 2: We build and configure your AI receptionist — 2-3 business days. etc.)

**Your Onboarding Form**
[ONBOARDING FORM LINK]
Please complete this within 24 hours so we can get started right away. It takes about 5 minutes.

**Payment**
[PAYMENT LINK]
Your first invoice is ready. Once payment is received, we'll kick off your build immediately.

**Support**
Email: [SUPPORT EMAIL]
Response time: within 1 business day
For urgent issues: [PHONE/TEXT NUMBER]

**Go-Live Target**
Based on a quick turnaround, your AI receptionist should be live and answering calls within [X business days].

Looking forward to working with you!

[Your Name]
[Agency Name]
[Phone]
[Website]
---

After the message, add a short section called **Customization Notes** with 3-4 tips the agency owner should fill in before sending (what to personalize, what links to add, any industry-specific details to consider for a ${businessType} business).`
};

// ─── GROWTH AGENT PROMPTS ────────────────────────────────────────────────────

const GROWTH_PROMPTS = {

  analyzeReviews: ({ businessName, industry, city, reviews }) => `You are an elite brand strategist and conversion copywriter. Analyze these Google reviews for "${businessName}", a ${industry} in ${city}.

REVIEWS:
${reviews}

Return ONLY a valid JSON object — no markdown fences, no commentary, no explanation. Use this exact structure:

{
  "headline": "A powerful hero headline using the customer's own language (8-12 words max)",
  "subheadline": "A compelling supporting statement (15-22 words max)",
  "topPraises": ["Most mentioned praise 1", "Most mentioned praise 2", "Most mentioned praise 3"],
  "customerKeywords": ["word1", "word2", "word3", "word4", "word5"],
  "emotionalPhrases": ["emotional phrase customers use 1", "emotional phrase 2", "emotional phrase 3"],
  "trustFactors": ["Trust factor 1", "Trust factor 2", "Trust factor 3"],
  "topServices": ["Service 1", "Service 2", "Service 3", "Service 4", "Service 5", "Service 6"],
  "brandTone": "2-sentence description of the brand's voice and personality",
  "seoKeywords": ["seo keyword 1", "seo keyword 2", "seo keyword 3", "seo keyword 4"],
  "testimonials": [
    {"text": "Exact short quote from a review (under 110 chars)", "author": "Reviewer first name or Anonymous"},
    {"text": "Exact short quote from a second review (under 110 chars)", "author": "Reviewer first name or Anonymous"},
    {"text": "Exact short quote from a third review (under 110 chars)", "author": "Reviewer first name or Anonymous"}
  ],
  "usps": ["Unique selling point 1", "Unique selling point 2", "Unique selling point 3", "Unique selling point 4"],
  "websiteWeakness": "1-2 sentences describing what their online presence is missing based on the review quality vs likely website",
  "colorScheme": "#hexcode — a single premium hex color appropriate for the ${industry} industry",
  "aboutSnippet": "3-sentence paragraph for an About section using tone from reviews",
  "faqItems": [
    {"q": "Common question 1?", "a": "Answer based on review insights."},
    {"q": "Common question 2?", "a": "Answer based on review insights."},
    {"q": "Common question 3?", "a": "Answer based on review insights."},
    {"q": "Common question 4?", "a": "Answer based on review insights."},
    {"q": "Common question 5?", "a": "Answer based on review insights."}
  ]
}`,

  generateWebsite: ({ businessName, industry, city, phone, address, rating, reviewCount, analysis }) => {
    const a = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    const services = (a.topServices || ['Service 1','Service 2','Service 3','Service 4','Service 5','Service 6']);
    const usps = (a.usps || ['Quality work','Fast service','Trusted experts','Local business']);
    const testimonials = (a.testimonials || []).slice(0, 3);
    const faqItems = (a.faqItems || []).slice(0, 5);
    const primaryColor = a.colorScheme || '#6366f1';

    return `You are an elite web designer. Build a COMPLETE, single-file premium website for the business below. Output ONLY raw HTML — no markdown, no code fences, no explanation. Start with <!DOCTYPE html> and end with </html>.

BUSINESS DATA:
Name: ${businessName}
Industry: ${industry}
City: ${city}
Phone: ${phone || 'Contact for details'}
Address: ${address || city}
Rating: ${rating}★ (${reviewCount}+ reviews)
Primary Brand Color: ${primaryColor}

COPY:
Hero Headline: "${a.headline || (businessName + ' — Premier ' + industry + ' in ' + city)}"
Hero Subheadline: "${a.subheadline || 'Trusted by hundreds of happy clients in ' + city}"
About: "${a.aboutSnippet || 'We are a trusted ' + industry + ' serving ' + city + ' with pride.'}"
Brand Tone: ${a.brandTone || 'Professional, warm, trustworthy'}
SEO Keywords: ${(a.seoKeywords || [industry, city]).join(', ')}

SERVICES (6 cards):
${services.map((s, i) => `${i+1}. ${s}`).join('\n')}

UNIQUE SELLING POINTS (4 cards):
${usps.map((u, i) => `${i+1}. ${u}`).join('\n')}

TESTIMONIALS (3 real quotes):
${testimonials.map((t, i) => `${i+1}. "${t.text}" — ${t.author}`).join('\n')}

FAQ (5 items):
${faqItems.map((f, i) => `${i+1}. Q: ${f.q}\n   A: ${f.a}`).join('\n')}

TRUST FACTORS: ${(a.trustFactors || []).join(' · ')}

REQUIRED SECTIONS (build every single one):

1. STICKY NAVBAR
   - Left: business name as logo text
   - Center: links → Services | About | Testimonials | FAQ | Contact
   - Right: "Book Now" button (primary color, links to #contact)
   - Hamburger menu for mobile (JS toggle)

2. HERO SECTION
   - Full-viewport height
   - Background: dark overlay gradient on a subtle pattern (CSS only, no images)
   - Large headline (the one above)
   - Subheadline below it
   - Two CTA buttons: "📞 Call Now" (tel:${phone || ''}) and "📅 Book Appointment" (href #contact)
   - Star rating display: "★★★★★ ${rating} · ${reviewCount}+ Happy Clients"
   - Fade-in animation on load

3. SOCIAL PROOF BAR
   - Full-width strip with contrasting background
   - Show: ${rating}★ rating · ${reviewCount}+ Reviews · 3 trust factor badges (icons + text)
   - Inline flex, centered

4. SERVICES SECTION (id="services")
   - Section title: "Our Services"
   - 6-card responsive grid (3 cols desktop, 2 tablet, 1 mobile)
   - Each card: emoji icon, service name bold, 1-sentence description
   - Cards with border, shadow, hover lift effect

5. WHY CHOOSE US (id="about")
   - Section title: "Why ${city} Chooses Us"
   - 4 USP cards in a 2x2 grid
   - Each: large icon, bold title, 1-2 sentence description
   - Light/accent background

6. TESTIMONIALS (id="testimonials")
   - Section title: "What Our Clients Say"
   - 3 review cards in a row (stack on mobile)
   - Each card: quote text in italics, star rating (★★★★★), author name
   - Subtle quote-mark design element

7. ABOUT SECTION
   - 2-column layout: text left, decorative stats right
   - Use the aboutSnippet copy
   - Stats column: 3 impressive numbers (${reviewCount}+ Reviews, ${rating}★ Rating, Years Serving ${city})

8. FAQ SECTION (id="faq")
   - Section title: "Frequently Asked Questions"
   - 5 accordion items (vanilla JS click-to-expand)
   - Smooth CSS max-height transition
   - +/- icon toggles

9. CONTACT SECTION (id="contact")
   - Section title: "Get In Touch"
   - 2 columns: contact info left, form right
   - Left: phone (large, clickable), address, hours note
   - Right: form with name, phone, email, message fields + "Send Message" submit button
   - Google Maps note: "[Map of ${address || city} would appear here]" as a placeholder div

10. FOOTER
    - Dark background
    - Logo text (business name) + tagline
    - 3-column: nav links | contact info | tagline/social placeholders
    - Copyright 2025 ${businessName}

DESIGN SYSTEM:
- @import Google Fonts: Inter (300,400,500,600,700,800)
- CSS custom properties on :root:
  --primary: ${primaryColor}
  --primary-dark: (darken by 15%)
  --primary-light: (lighten/alpha version for backgrounds)
  --bg: #0f0f13
  --bg-card: #1a1a24
  --bg-section: #13131b
  --text: #f1f5f9
  --text-muted: #94a3b8
  --border: #2d2d3d
  --radius: 12px
  --shadow: 0 4px 24px rgba(0,0,0,0.3)
- All sections: padding 96px 0
- Container max-width: 1100px, centered, padding 0 24px
- Smooth scroll: html { scroll-behavior: smooth }
- Scroll-triggered animations: IntersectionObserver adds 'visible' class, CSS transitions opacity + translateY
- Hover effects on cards: translateY(-4px) + shadow deepening
- Transitions: 0.2s ease on interactive elements

OUTPUT: Complete, working, beautiful HTML file. Every section must be present. No placeholders in code. No TODO comments.`;
  },

  generateEmail: ({ businessName, ownerName, industry, city, reviewHighlight, websiteWeakness, demoUrl }) => `You are a world-class cold email copywriter for a premium web design agency.

Write a 3-part cold email sequence for:
- Business: ${businessName}
- Owner: ${ownerName || 'the owner'}
- Industry: ${industry} in ${city}
- Review highlight to mention: "${reviewHighlight}"
- Their web presence weakness: ${websiteWeakness}
- Demo site link: ${demoUrl || '[DEMO LINK]'}

TONE: Human, conversational, confident. Like a message from a real person who noticed something specific. Not salesy. No buzzwords.

LENGTH: Email 1 under 120 words. Follow-ups under 60 words each.

Return in this EXACT format (keep the headers exactly as written):

SUBJECT LINE:
[subject here]

EMAIL 1:
[email body here — 3-4 short paragraphs]

---

SUBJECT LINE 2:
[follow-up subject]

EMAIL 2 (send day 3):
[follow-up body — 2 short paragraphs]

---

SUBJECT LINE 3:
[second follow-up subject]

EMAIL 3 (send day 7):
[second follow-up body — 1-2 sentences, soft close]`
};

// ─── EXISTING ENDPOINT ───────────────────────────────────────────────────────

app.post('/api/generate', async (req, res) => {
  const { businessType, location } = req.body;

  if (!businessType || !location) {
    return res.status(400).json({ error: 'businessType and location are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sections = ['retell', 'website', 'coldcall', 'sms', 'welcome'];
  const sectionLabels = {
    retell: 'Retell AI Receptionist Prompt',
    website: 'Website Outline',
    coldcall: 'Cold Call Script',
    sms: 'SMS Follow-Up Sequence',
    welcome: 'Client Welcome Package'
  };

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for (const section of sections) {
      sendEvent({ type: 'section_start', section, label: sectionLabels[section] });

      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: PROMPTS[section](businessType, location) }]
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          sendEvent({ type: 'token', section, text: chunk.delta.text });
        }
      }

      sendEvent({ type: 'section_end', section });
    }

    sendEvent({ type: 'done' });
    res.end();
  } catch (err) {
    sendEvent({ type: 'error', message: err.message });
    res.end();
  }
});

// ─── GROWTH AGENT: ANALYZE REVIEWS ──────────────────────────────────────────

app.post('/api/growth/analyze', async (req, res) => {
  const { businessName, industry, city, reviews } = req.body;

  if (!businessName || !industry || !city || !reviews) {
    return res.status(400).json({ error: 'businessName, industry, city, and reviews are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: GROWTH_PROMPTS.analyzeReviews({ businessName, industry, city, reviews })
      }]
    });

    const raw = message.content[0].text.trim();

    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const analysis = JSON.parse(jsonStr);

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GROWTH AGENT: GENERATE WEBSITE ─────────────────────────────────────────

app.post('/api/growth/website', async (req, res) => {
  const { businessName, industry, city, phone, address, rating, reviewCount, analysis } = req.body;

  if (!businessName || !industry || !city || !analysis) {
    return res.status(400).json({ error: 'businessName, industry, city, and analysis are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let fullHtml = '';
  const previewId = crypto.randomUUID();

  try {
    sendEvent({ type: 'start' });

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: GROWTH_PROMPTS.generateWebsite({ businessName, industry, city, phone, address, rating, reviewCount, analysis })
      }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullHtml += chunk.delta.text;
        sendEvent({ type: 'token', text: chunk.delta.text });
      }
    }

    // Store the generated site
    generatedSites.set(previewId, fullHtml);

    // Auto-expire after 2 hours
    setTimeout(() => generatedSites.delete(previewId), 2 * 60 * 60 * 1000);

    sendEvent({ type: 'done', previewId });
    res.end();
  } catch (err) {
    sendEvent({ type: 'error', message: err.message });
    res.end();
  }
});

// ─── GROWTH AGENT: GENERATE COLD EMAIL ──────────────────────────────────────

app.post('/api/growth/email', async (req, res) => {
  const { businessName, ownerName, industry, city, reviewHighlight, websiteWeakness, demoUrl } = req.body;

  if (!businessName || !industry || !city) {
    return res.status(400).json({ error: 'businessName, industry, and city are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    sendEvent({ type: 'start' });

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: GROWTH_PROMPTS.generateEmail({ businessName, ownerName, industry, city, reviewHighlight, websiteWeakness, demoUrl })
      }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        sendEvent({ type: 'token', text: chunk.delta.text });
      }
    }

    sendEvent({ type: 'done' });
    res.end();
  } catch (err) {
    sendEvent({ type: 'error', message: err.message });
    res.end();
  }
});

// ─── PREVIEW ROUTE ────────────────────────────────────────────────────────────

app.get('/preview/:id', (req, res) => {
  const html = generatedSites.get(req.params.id);
  if (!html) {
    return res.status(404).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f0f13;color:#94a3b8"><h2>Preview not found or expired</h2><p>Previews expire after 2 hours. Please regenerate the site.</p></body></html>`);
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// ─── START ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
