require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

Keep language casual, friendly, and local to ${location}.`
};

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

  const sections = ['retell', 'website', 'coldcall', 'sms'];
  const sectionLabels = {
    retell: 'Retell AI Receptionist Prompt',
    website: 'Website Outline',
    coldcall: 'Cold Call Script',
    sms: 'SMS Follow-Up Sequence'
  };

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    for (const section of sections) {
      sendEvent({ type: 'section_start', section, label: sectionLabels[section] });

      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: PROMPTS[section](businessType, location)
          }
        ]
      });

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
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
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
