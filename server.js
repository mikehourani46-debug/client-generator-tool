require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse API response')); }
      });
    }).on('error', reject);
  });
}

function buildBizContext(biz) {
  const lines = [
    `Business Name: ${biz.name}`,
    `Business Type: ${biz.type}`,
    `Location: ${biz.location}`,
  ];
  if (biz.address)     lines.push(`Address: ${biz.address}`);
  if (biz.phone)       lines.push(`Phone: ${biz.phone}`);
  if (biz.website)     lines.push(`Website: ${biz.website}`);
  else                 lines.push(`Website: NONE — they have no website`);
  if (biz.rating)      lines.push(`Google Rating: ${biz.rating}/5 (${biz.reviewCount} reviews)`);
  if (biz.hours && biz.hours.length)
    lines.push(`Hours:\n${biz.hours.map(h => `  ${h}`).join('\n')}`);
  if (biz.category)    lines.push(`Google Category: ${biz.category}`);
  return lines.join('\n');
}

// Per-section token budgets
const SECTION_TOKENS = {
  painpoints: 1200,
  outreach:   2200,
  offer:      1400,
  demo:       1600,
  objections: 1600,
  retell:     1200,
  website:    1400,
  coldcall:   1200,
  sms:        1200,
  welcome:    1200,
  leadgen:    1600,
};

const PROMPTS = {

  // ── Sales Pack ────────────────────────────────────────────────────

  painpoints: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are an expert at identifying pain points for local businesses that AI receptionist and website services can solve.

Business:
${ctx}

Identify the most likely pain points for ${biz.name} based on the data above. Be specific to their situation — not generic.

## Most Likely Pain Points for ${biz.name}

For each pain point use this format:
**[Pain Point Name]**
Situation: [why this is a real problem for a ${biz.type}]
Signal: [what in the available data hints at this]
Fix: [exactly how AI receptionist or website solves it]

Address the most relevant of:
- Missed calls (especially after-hours or during peak times)
- No 24/7 availability
- After-hours call handling${biz.hours ? ' (reference their hours above)' : ''}
- No online booking or appointment scheduling
- Slow lead follow-up
- Repetitive FAQ calls eating up staff time
- No website / weak web presence${!biz.website ? ' — CONFIRMED: no website found' : ''}
- Reviews mentioning phone, wait time, or communication${biz.rating && biz.rating < 4.2 ? ` (${biz.rating}★ suggests possible friction)` : ''}

## Top 3 Quick Wins
Specific fast fixes for ${biz.name} that would show results within the first 30 days.

## Best First Pitch Angle
One punchy sentence — the single strongest hook for ${biz.name} specifically.`;
  },

  outreach: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are a top sales copywriter specializing in AI services for local businesses.

Prospect:
${ctx}

Write a complete personalized outreach bundle for selling AI receptionist${!biz.website ? ' and website' : ''} services to ${biz.name}. Every piece must reference ${biz.name} by name and feel genuinely written for them — not a template.

## 1. Cold DM (Instagram / Facebook)
Under 3 sentences. Casual, no fluff. Reference something specific about ${biz.name} or their situation.

## 2. Cold Email
**Subject:** [write a compelling subject line — not generic]

[4-5 sentence body. Open with something specific to ${biz.name}. Explain the benefit in their terms. End with a soft CTA.]

## 3. 30-Second Cold Call Script
[Stage directions in brackets. Include opening, hook, value, and ask. Say ${biz.name} by name.]

## 4. Voicemail Script (20 seconds)
[For when they don't pick up. Clear, specific, leaves curiosity. Under 40 words.]

## 5. Follow-Up 1 — Day 2
[Short SMS or email. New angle — not just "checking in." Under 3 sentences.]

## 6. Follow-Up 2 — Day 5
[Final attempt. Add urgency or a strong value statement. Under 3 sentences.]

## 7. "I Made This For You" Message
[Send this after building a sample demo or mock-up for ${biz.name}. Excited tone, shows real effort, clear CTA to review it.]`;
  },

  offer: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are an expert at packaging and pricing AI receptionist and website services for local businesses.

Prospect:
${ctx}

Build a specific, compelling service offer for ${biz.name}. Make the pricing feel justified and ROI feel obvious.

## Package for ${biz.name}

### Services Included
List each service with a one-line description of the specific benefit for ${biz.name}:
${!biz.website ? '- **Website Build** — they currently have no website; build from scratch with booking and SEO\n' : '- **Website Upgrade** — improve their existing site with booking and AI chat widget\n'}- **AI Receptionist** — configured for a ${biz.type}, handles calls 24/7
- **Call Handling Setup** — greetings, FAQs, appointment booking${biz.hours ? ', real hours built in' : ''}
- **Missed Call Recovery** — auto-SMS to any caller who can't get through
- **SMS Follow-Up Sequence** — re-engage new leads automatically
- [1 additional service relevant to ${biz.type}]

### Pricing
**Setup Fee:** $[amount]
*Why:* [justify in 1 sentence — what the setup work actually involves]

**Monthly Retainer:** $[amount]/month
*Why:* [justify with a simple ROI statement for a ${biz.type}]

**Optional Add-ons:**
- [Add-on 1 name]: $[price]/month — [1-line benefit]
- [Add-on 2 name]: $[price]/month — [1-line benefit]
- [Add-on 3 name]: $[price] one-time — [1-line benefit]

### ROI Justification for ${biz.name}
3-4 bullet points showing how ${biz.name} gets their money back. Use realistic numbers for a ${biz.type}${biz.reviewCount ? ` with ${biz.reviewCount} reviews` : ''}.

### Risk Reversal / Guarantee
A guarantee that makes saying yes easy. Should feel specific to ${biz.name}, not generic.

### How to Present This Offer
2-3 sentences on how to frame and deliver this on a live sales call with ${biz.name}.`;
  },

  demo: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are a sales trainer who specializes in live AI receptionist demos on sales calls.

Business being demoed for:
${ctx}

Write a 2-minute live demo script I can run during a sales call with ${biz.name}. The demo simulates a real caller calling ${biz.name} and the AI receptionist handling it naturally. Use real business details wherever possible.

**[Pre-Demo Setup — say this to the prospect]**
[Frame what they're about to experience. 2-3 sentences. Build anticipation.]

---
**DEMO BEGINS**

CALLER: [Realistic opening from a typical ${biz.type} customer]

AI RECEPTIONIST: [Natural, warm greeting using "${biz.name}"${biz.hours ? ' and real hours if asked' : ''}${biz.address ? ' and real address' : ''}]

CALLER: [Realistic follow-up — a question typical callers ask this type of business]

AI RECEPTIONIST: [Handles it confidently using specific business info]

CALLER: [Tries to book an appointment or asks about availability]

AI RECEPTIONIST: [Walks through booking, collects info, confirms]

CALLER: [Calls after hours OR asks about a service detail]

AI RECEPTIONIST: [Handles it, offers to leave a message or send SMS, stays friendly]

CALLER: [One more realistic exchange]

AI RECEPTIONIST: [Closes the call warmly]

**DEMO ENDS**
---

**[Post-Demo Close — say this immediately after]**
[2-3 sentences. Land the value. Move toward next steps without being pushy.]

**Key Talking Points to Hit During Demo**
- [4 bullet points specific to ${biz.name}'s situation and pain points]`;
  },

  objections: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are a top sales closer helping overcome objections when selling AI receptionist services.

Prospect:
${ctx}

Write tight, confident, natural responses to each of the 7 objections below. Reference ${biz.name} or their specific situation where it strengthens the response. Never sound scripted.

---
## "How much does it cost?"
[Give a confident price range. Immediately tie it to ROI for a ${biz.type}. Don't apologize for the price.]

*Why this works:* [1 sentence on the psychology]

---
## "We already have a receptionist"
[Agree, then reposition AI as a complement — not a replacement. Make the receptionist the hero.]

*Why this works:* [1 sentence]

---
## "We're not interested"
[Stay calm. Don't push. Ask one smart question to uncover the real hesitation.]

*Why this works:* [1 sentence]

---
## "Can it really answer calls?"
[Build confidence with specifics. Offer a live demo. Reference what it does for a ${biz.type}.]

*Why this works:* [1 sentence]

---
## "Is it AI? Our customers might not like that"
[Be honest. Reframe it. Explain why callers actually prefer it in many cases.]

*Why this works:* [1 sentence]

---
## "Will it work with our current phone number?"
[Explain how call forwarding works in plain language. No jargon. Reassure them nothing breaks.]

*Why this works:* [1 sentence]

---
## "Can it book appointments?"
[Confirm yes, explain how. Give a ${biz.type}-specific example of how the booking flow works.]

*Why this works:* [1 sentence]`;
  },

  // ── Content Pack ──────────────────────────────────────────────────

  retell: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are an expert at writing AI receptionist prompts for Retell AI.

Here is the business you are writing for:
${ctx}

Write a Retell AI receptionist system prompt specifically for ${biz.name}.

The prompt should:
- Give the AI receptionist a fitting name and personality for a ${biz.type}
- Open with a warm greeting that mentions ${biz.name} by name
- Cover key services relevant to this ${biz.type}
- Handle common caller questions (hours${biz.hours ? ' — use the real hours listed above' : ''}, pricing, appointments, directions${biz.address ? ' — use the real address listed above' : ''})
- Include escalation paths (when to transfer to a human or take a message)
- Use a tone appropriate for ${biz.location}
- Be 300-500 words

Format it as a ready-to-paste Retell AI system prompt.`;
  },

  website: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are an expert web designer and copywriter.

Here is the business you are writing for:
${ctx}

Create a detailed website outline for ${biz.name}.

Include:
1. **Homepage** - hero headline (use ${biz.name}), subheadline, CTA, 3-4 key value props
2. **About Page** - story structure, trust signals${biz.rating ? `, highlight their ${biz.rating}-star Google rating (${biz.reviewCount} reviews)` : ''}, team section
3. **Services Page** - 4-6 core services specific to ${biz.type}
4. **Testimonials/Reviews** - placeholder structure
5. **Contact/Booking Page** - form fields, hours${biz.address ? `, address (${biz.address})` : ''}${biz.phone ? `, phone (${biz.phone})` : ''}
6. **SEO Meta** - homepage title tag and meta description optimized for ${biz.location}

Make copy feel authentic to ${biz.name}. Include local SEO tips for ${biz.location}. Keep sections concise with placeholder copy examples.`;
  },

  coldcall: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are a top sales trainer specializing in local business outreach.

Here is the business you are calling:
${ctx}
${biz.rating ? `\nNote: They have a ${biz.rating}-star Google rating with ${biz.reviewCount} reviews — use this to inform your pitch.\n` : ''}
Write a cold call script for selling AI receptionist services to ${biz.name} in ${biz.location}.

Structure:
1. **Opening** (5 sec) - your name, company, permission to continue — mention ${biz.name} by name
2. **Hook** (10 sec) - specific missed-call / busy-phone pain point for a ${biz.type}
3. **Value Statement** (15 sec) - what the AI receptionist does for ${biz.name} specifically
4. **Qualifying Questions** (2-3 questions)
5. **Objection Handlers** - top 3 objections:
   - "We're not interested"
   - "We already have someone"
   - "Send me an email"
6. **Close** - ask for appointment or next step
7. **Voicemail Version** - 20-second voicemail mentioning ${biz.name}

Keep the tone conversational, not robotic. Include stage directions in [brackets].`;
  },

  sms: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are an expert in SMS marketing and follow-up sequences.

Here is the prospect business:
${ctx}

Write a 5-message SMS follow-up sequence for selling AI receptionist services to ${biz.name}.

For each message include:
- **When to send** (e.g., immediately, 1 day after, 3 days after)
- **Message text** (under 160 characters) — reference ${biz.name} where natural
- **Purpose/goal** of that message

Messages should cover:
1. Initial intro / permission to share something
2. Specific value-add relevant to a ${biz.type}
3. Soft offer or check-in referencing ${biz.name}
4. Social proof or quick win example
5. Final follow-up / re-engagement

Also write 2 bonus messages:
- After they show interest: next-step nudge
- After no reply for 1 week: breakup message

Keep language casual, friendly, and local to ${biz.location}.`;
  },

  welcome: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are an expert at client onboarding for AI receptionist agencies.

Here is the client who just said YES:
${ctx}

Write a client welcome package message to send to ${biz.name} immediately after closing. This is a copy/paste message the agency owner sends.

Structure it EXACTLY like this:

---
**Subject: Welcome to [Agency Name] — Here's Everything You Need**

Hi [Client First Name],

Welcome aboard! We're thrilled to get your AI receptionist live for ${biz.name}. Here's everything you need.

**What You're Getting**
List 4-6 specific deliverables tailored to a ${biz.type} (e.g. AI receptionist trained on ${biz.name}'s services${biz.hours ? ', real hours' : ''}, call handling for [common call types], appointment booking, monthly call review, etc.)

**What Happens Next**
Numbered 4-5 onboarding steps with realistic timeframes. Mention ${biz.name} by name in at least one step.

**Your Onboarding Form**
[ONBOARDING FORM LINK]
Please complete this within 24 hours so we can get started. It takes about 5 minutes.

**Payment**
[PAYMENT LINK]
Your first invoice is ready. We'll kick off your build immediately after payment.

**Support**
Email: [SUPPORT EMAIL]
Response time: within 1 business day
Urgent: [PHONE/TEXT NUMBER]

**Go-Live Target**
${biz.name}'s AI receptionist should be live and answering calls within [X business days].

Looking forward to working with you!

[Your Name]
[Agency Name]
[Phone]
[Website]
---

After the message, add a **Customization Notes** section with 3-4 specific fill-in tips before sending (links to add, industry-specific details for ${biz.type}, anything unique about ${biz.name} to reference).`;
  },

  leadgen: (biz) => {
    const ctx = buildBizContext(biz);
    return `You are an expert in B2B lead generation for AI receptionist agencies targeting local businesses.

Reference client (the type of business you want to find more of):
${ctx}

Generate a practical, actionable lead generation plan to find MORE ${biz.type} businesses like ${biz.name} in ${biz.location} and similar markets.

## 1. Ideal Businesses to Target
Describe the ideal-fit ${biz.type} prospect profile (size, review count, pain point signals, good vs. bad fit indicators).

## 2. Where to Find Them
List 5-6 specific platforms and places to source ${biz.type} leads.

## 3. Google / Yelp Search Terms
List 8-10 specific search strings to use in ${biz.location} and nearby areas.

## 4. What to Look For Before Contacting
List 5-6 buying signals to check before reaching out.

## 5. Best Outreach Angle for ${biz.type} Owners
The #1 pain point and how to frame the AI receptionist as the solution.

## 6. Cold DM / Email Opener
3-4 sentences that feel personally written for a ${biz.type} in ${biz.location}.

## 7. Cold Call Script (30-Second Version)
Tight 30-second script targeting ${biz.type} owners.

## 8. Day-3 Follow-Up Message
Short follow-up if no response.

## 9. How to Qualify the Lead
4-5 quick qualifying questions for a ${biz.type}.

## 10. Offer to Pitch
Best offer structure for a ${biz.type} — pricing range, terms, guarantee.`;
  }
};

// Google Places business lookup
app.get('/api/business-info', async (req, res) => {
  const { name, location } = req.query;

  if (!name || !location) {
    return res.status(400).json({ error: 'name and location are required' });
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server' });
  }

  try {
    const query = encodeURIComponent(`${name} ${location}`);
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const searchData = await httpsGet(searchUrl);

    if (!searchData.results || searchData.results.length === 0) {
      return res.status(404).json({ error: 'No business found on Google for that name and location.' });
    }

    const placeId = searchData.results[0].place_id;
    const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,types';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const detailsData = await httpsGet(detailsUrl);

    if (!detailsData.result) {
      return res.status(404).json({ error: 'Could not fetch business details from Google.' });
    }

    const d = detailsData.result;
    const info = {
      name:        d.name || name,
      address:     d.formatted_address || null,
      phone:       d.formatted_phone_number || null,
      website:     d.website || null,
      rating:      d.rating || null,
      reviewCount: d.user_ratings_total || null,
      hours:       d.opening_hours ? d.opening_hours.weekday_text : null,
      category:    d.types
        ? d.types
            .filter(t => t !== 'point_of_interest' && t !== 'establishment')
            .map(t => t.replace(/_/g, ' '))
            .join(', ')
        : null,
    };

    res.json({ success: true, info });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to contact Google Places API' });
  }
});

// Content generation — SSE stream
// Sales pack sections stream first so users see them immediately
app.post('/api/generate', async (req, res) => {
  const { businessName, businessType, location, businessInfo } = req.body;

  if (!businessType || !location) {
    return res.status(400).json({ error: 'businessType and location are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
  }

  const biz = {
    name:        (businessInfo && businessInfo.name) || businessName || businessType,
    type:        businessType,
    location:    location,
    address:     (businessInfo && businessInfo.address)     || null,
    phone:       (businessInfo && businessInfo.phone)       || null,
    website:     (businessInfo && businessInfo.website)     || null,
    rating:      (businessInfo && businessInfo.rating)      || null,
    reviewCount: (businessInfo && businessInfo.reviewCount) || null,
    hours:       (businessInfo && businessInfo.hours)       || null,
    category:    (businessInfo && businessInfo.category)    || null,
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sections = [
    'painpoints', 'outreach', 'offer', 'demo', 'objections',
    'retell', 'website', 'coldcall', 'sms', 'welcome', 'leadgen',
  ];

  const sectionLabels = {
    painpoints: 'Pain Point Finder',
    outreach:   'Personalized Outreach Bundle',
    offer:      'Offer Builder',
    demo:       'Client Demo Script',
    objections: 'Objection Handling',
    retell:     'Retell AI Receptionist Prompt',
    website:    'Website Outline',
    coldcall:   'Cold Call Script',
    sms:        'SMS Follow-Up Sequence',
    welcome:    'Client Welcome Package',
    leadgen:    'Lead Generation Plan',
  };

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for (const section of sections) {
      sendEvent({ type: 'section_start', section, label: sectionLabels[section] });

      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: SECTION_TOKENS[section] || 1200,
        messages: [{ role: 'user', content: PROMPTS[section](biz) }]
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
