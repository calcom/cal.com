/**
 * Booking Brief — Cal.com × Anthropic Claude
 * Intercepts BOOKING_CREATED webhooks, generates host briefings via Claude,
 * and delivers a styled HTML email 30 minutes before the meeting.
 *
 * Setup: cd examples/booking-brief && npm install && cp .env.example .env && npm start
 * Cal.com webhook: POST https://your-host/webhook/cal — trigger BOOKING_CREATED
 */

require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("node:crypto");

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

const {
  CAL_WEBHOOK_SECRET,
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL = "claude-sonnet-4-20250514",
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  PORT = 3000,
} = process.env;

const scheduledJobs = new Map();

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

function verifySignature(req) {
  if (!CAL_WEBHOOK_SECRET) return true;
  const sig = String(req.headers["x-cal-signature-256"] || "");
  const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
  const expected = crypto.createHmac("sha256", CAL_WEBHOOK_SECRET).update(raw).digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractFormNotes(payload) {
  const r = payload.responses;
  if (!r) return payload.additionalNotes || null;
  if (typeof r.notes === "string") return r.notes;
  if (r.notes?.value != null) return String(r.notes.value);
  const parts = [];
  for (const [k, v] of Object.entries(r)) {
    if (k === "email" || k === "name" || k === "guests" || k === "location") continue;
    const text =
      v && typeof v === "object" && "value" in v
        ? Array.isArray(v.value)
          ? v.value.join(", ")
          : String(v.value)
        : typeof v === "string"
          ? v
          : "";
    if (text) parts.push(`${k}: ${text}`);
  }
  return parts.length ? parts.join("\n") : null;
}

function parseBriefFromClaude(text) {
  const cleaned = (text || "{}").replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      attendeeSummary: "",
      suggestedAgenda: [],
      openingQuestion: "",
      prepTip: "",
    };
  }
}

async function generateBriefing(booking) {
  const { attendee, host, eventType, startTime, formResponses } = booking;
  const prompt = `You are a professional meeting preparation assistant. Generate a concise pre-meeting briefing for ${host.name}.

Meeting details:
- Event: ${eventType}
- Attendee: ${attendee.name} (${attendee.email})
- Time: ${new Date(startTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}
- Timezone: ${attendee.timeZone}
${formResponses ? `- Their notes: ${formResponses}` : ""}

Return a JSON object with exactly these fields:
{
  "attendeeSummary": "2 sentences about likely context/intent based on their name, email domain, and notes",
  "suggestedAgenda": ["agenda item 1", "agenda item 2", "agenda item 3"],
  "openingQuestion": "one strong opening question to ask them",
  "prepTip": "one sentence of tactical prep advice for the host"
}

Return only valid JSON. No markdown, no extra text.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Anthropic API ${res.status}`);
  }
  const text = data.content?.[0]?.text || "{}";
  return parseBriefFromClaude(text);
}

function buildEmail(booking, brief) {
  const { attendee, host, eventType, startTime } = booking;
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const initial = (attendee.name || "?").charAt(0).toUpperCase();
  const time = new Date(startTime).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const agendaItems = (brief.suggestedAgenda || [])
    .map(
      (item, i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ede8;vertical-align:top">
          <span style="display:inline-block;width:22px;height:22px;background:#1a1a1a;color:#fff;
            border-radius:50%;text-align:center;line-height:22px;font-size:11px;
            font-family:monospace;margin-right:12px">${i + 1}</span>
          <span style="font-size:14px;color:#2d2d2d;line-height:1.5">${esc(item)}</span>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 20px">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
      <tr><td style="background:#1a1a1a;border-radius:12px 12px 0 0;padding:28px 36px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;
                color:rgba(255,255,255,0.45);font-family:monospace">Booking Brief</span>
              <div style="font-size:22px;font-weight:500;color:#fff;margin-top:6px;line-height:1.3">
                ${esc(eventType)}
              </div>
            </td>
            <td align="right" valign="top">
              <span style="background:#2e2e2e;border:1px solid #3a3a3a;color:rgba(255,255,255,0.6);
                font-size:11px;padding:5px 10px;border-radius:6px;font-family:monospace;
                white-space:nowrap">T−30 min</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="background:#252525;padding:14px 36px">
        <span style="font-size:13px;color:rgba(255,255,255,0.55)">&#128197; </span>
        <span style="font-size:13px;color:rgba(255,255,255,0.8)">${esc(time)}</span>
      </td></tr>
      <tr><td style="background:#fff;padding:32px 36px">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#faf9f6;border:1px solid #ece9e3;border-radius:10px;margin-bottom:28px">
          <tr><td style="padding:20px 24px">
            <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
              color:#9a9690;font-family:monospace;margin-bottom:12px">Who you're meeting</div>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:42px;height:42px;background:#1a1a1a;border-radius:50%;
                  text-align:center;vertical-align:middle;font-size:16px;color:#fff;
                  font-weight:500" align="center">${esc(initial)}</td>
                <td style="padding-left:14px">
                  <div style="font-size:16px;font-weight:500;color:#1a1a1a">${esc(attendee.name)}</div>
                  <div style="font-size:13px;color:#7a7570;margin-top:2px">${esc(attendee.email)}</div>
                </td>
              </tr>
            </table>
            ${
              brief.attendeeSummary
                ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid #ece9e3;
              font-size:13.5px;color:#4a4642;line-height:1.65">${esc(brief.attendeeSummary)}</div>`
                : ""
            }
          </td></tr>
        </table>
        <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
          color:#9a9690;font-family:monospace;margin-bottom:14px">Suggested agenda</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
          ${agendaItems}
        </table>
        ${
          brief.openingQuestion
            ? `<table width="100%" cellpadding="0" cellspacing="0"
          style="background:#f0ede8;border-left:3px solid #1a1a1a;border-radius:0 8px 8px 0;margin-bottom:28px">
          <tr><td style="padding:16px 20px">
            <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
              color:#9a9690;font-family:monospace;margin-bottom:8px">Opening question</div>
            <div style="font-size:14px;color:#2d2d2d;line-height:1.6;font-style:italic">
              &ldquo;${esc(brief.openingQuestion)}&rdquo;</div>
          </td></tr>
        </table>`
            : ""
        }
        ${
          brief.prepTip
            ? `<table width="100%" cellpadding="0" cellspacing="0"
          style="background:#f7faf3;border:1px solid #d4e8c2;border-radius:8px">
          <tr><td style="padding:14px 18px">
            <span style="font-size:13px;color:#3a5c25">&#128161; ${esc(brief.prepTip)}</span>
          </td></tr>
        </table>`
            : ""
        }
      </td></tr>
      <tr><td style="background:#faf9f6;border:1px solid #ece9e3;border-top:none;
        border-radius:0 0 12px 12px;padding:16px 36px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:11px;color:#b0aba5">
              Generated by <strong style="color:#7a7570">Booking Brief</strong> &times; Cal.com
            </td>
            <td align="right" style="font-size:11px;color:#b0aba5">For ${esc(host.name)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function scheduleEmail(booking, brief) {
  const meetingTime = new Date(booking.startTime).getTime();
  const sendAt = meetingTime - 30 * 60 * 1000;
  const delay = sendAt - Date.now();

  if (delay < 0) {
    console.warn(`Meeting ${booking.uid} is soon — sending briefing now`);
    void sendBriefingEmail(booking, brief);
    return;
  }

  const timer = setTimeout(() => {
    void sendBriefingEmail(booking, brief);
    scheduledJobs.delete(booking.uid);
  }, delay);

  scheduledJobs.set(booking.uid, timer);
  console.log(`Briefing for ${booking.uid} scheduled at ${new Date(sendAt).toISOString()}`);
}

async function sendBriefingEmail(booking, brief) {
  const html = buildEmail(booking, brief);
  try {
    await transporter.sendMail({
      from: `"Booking Brief" <${SMTP_USER}>`,
      to: booking.host.email,
      subject: `Briefing: ${booking.eventType} with ${booking.attendee.name}`,
      html,
    });
    console.log(`Briefing sent to ${booking.host.email}`);
  } catch (err) {
    console.error("Email failed:", err.message);
  }
}

app.post("/webhook/cal", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { triggerEvent, payload } = req.body || {};
  if (triggerEvent !== "BOOKING_CREATED") {
    return res.status(200).json({ ok: true, skipped: true });
  }

  res.status(200).json({ ok: true });

  const p = payload || {};
  const booking = {
    uid: p.uid || String(p.bookingId || crypto.randomUUID()),
    eventType: p.type || p.title || "Meeting",
    startTime: p.startTime,
    host: {
      name: p.organizer?.name || "Host",
      email: p.organizer?.email,
    },
    attendee: {
      name: p.attendees?.[0]?.name || p.responses?.name?.value || "Guest",
      email: p.attendees?.[0]?.email || p.responses?.email?.value || "",
      timeZone: p.attendees?.[0]?.timeZone || "UTC",
    },
    formResponses: extractFormNotes(p),
  };

  if (!booking.host.email) {
    console.error("No host email in payload");
    return;
  }
  if (!ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return;
  }

  console.log(`Booking received: ${booking.eventType} with ${booking.attendee.name}`);

  try {
    const brief = await generateBriefing(booking);
    console.log(`Briefing generated for ${booking.uid}`);
    scheduleEmail(booking, brief);
  } catch (err) {
    console.error("Briefing generation failed:", err.message);
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", jobs: scheduledJobs.size });
});

app.listen(Number(PORT), () => {
  console.log(`Booking Brief on port ${PORT}`);
  console.log(`POST /webhook/cal  |  GET /health`);
});
