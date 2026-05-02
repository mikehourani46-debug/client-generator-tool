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
  if (biz.rating)      lines.push(`Google Rating: ${biz.rating}/5 (${biz.reviewCount} reviews)`);
  if (biz.hours && biz.hours.length)
    lines.push(`Hours:\n${biz.hours.map(h => `  ${h}`).join('\n')}`);
  if (biz.category)    lines.push(`Google Category: ${biz.category}`);
  return lines.join('\n');
}

const PROMPTS = {
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
List 5-6 specific platforms and places to source ${biz.type} leads (Google Maps, Yelp, industry directories, Facebook groups, LinkedIn, chamber of commerce, etc.)

## 3. Google / Yelp Search Terms
List 8-10 specific search strings to use in ${biz.location} and nearby areas to surface prospects.

## 4. What to Look For Before Contacting
List 5-6 buying signals to check before reaching out (e.g. many reviews but mediocre rating, no live chat, missing hours listing, high call-volume indicators, slow response time signals).

## 5. Best Outreach Angle for ${biz.type} Owners
Explain the #1 pain point for ${biz.type} owners and frame the AI receptionist as the solution. Keep it punchy.

## 6. Cold DM / Email Opener
Write a 3-4 sentence cold DM or email opener that feels personally written for a ${biz.type} in ${biz.location} — not generic.

## 7. Cold Call Script (30-Second Version)
Write a tight 30-second cold call script targeting ${biz.type} owners.

## 8. Day-3 Follow-Up Message
Write a short day-3 follow-up SMS or email if they haven't responded.

## 9. How to Qualify the Lead
List 4-5 quick qualifying questions to determine if this ${biz.type} is a real fit.

## 10. Offer to Pitch
Recommend the best offer structure for a ${biz.type} (trial period, done-for-you setup, monthly retainer range, any guarantee or risk reversal that works well for this industry).`;
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
        ? d.types.filter(t => t !== 'point_of_interest' && t !== 'establishment').map(t => t.replace(/_/g, ' ')).join(', ')
        : null,
    };

    res.json({ success: true, info });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to contact Google Places API' });
  }
});

// Content generation (SSE stream)
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

  const sections = ['retell', 'website', 'coldcall', 'sms', 'welcome', 'leadgen'];
  const sectionLabels = {
    retell:   'Retell AI Receptionist Prompt',
    website:  'Website Outline',
    coldcall: 'Cold Call Script',
    sms:      'SMS Follow-Up Sequence',
    welcome:  'Client Welcome Package',
    leadgen:  'Lead Generation Plan',
  };

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for (const section of sections) {
      sendEvent({ type: 'section_start', section, label: sectionLabels[section] });

      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
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
