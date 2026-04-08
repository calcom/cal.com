import Anthropic from "@anthropic-ai/sdk";

import type { CalEventResponses } from "@calcom/types/Calendar";

export interface BriefingInput {
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  startTime: Date;
  responses: Record<string, { label: string; value: string | string[] }>;
  timeZone: string;
}

export interface BriefingOutput {
  attendeeSummary: string;
  suggestedAgenda: [string, string, string];
  openingQuestion: string;
  prepTip: string;
}

function isBriefingOutput(parsed: unknown): parsed is BriefingOutput {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Record<string, unknown>;
  const agenda = o.suggestedAgenda;
  if (!Array.isArray(agenda) || agenda.length !== 3) return false;
  if (!agenda.every((x) => typeof x === "string")) return false;
  return (
    typeof o.attendeeSummary === "string" &&
    typeof o.openingQuestion === "string" &&
    typeof o.prepTip === "string"
  );
}

export function mapCalEventResponsesForBriefing(
  responses: CalEventResponses | null | undefined
): BriefingInput["responses"] {
  const out: BriefingInput["responses"] = {};
  if (!responses) return out;
  for (const key of Object.keys(responses)) {
    const entry = responses[key];
    if (!entry) continue;
    const raw = entry.value;
    const value = Array.isArray(raw) ? raw.map((x) => String(x)) : String(raw);
    out[key] = { label: entry.label, value };
  }
  return out;
}

export async function generateBriefing(input: BriefingInput): Promise<BriefingOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const startFormatted = input.startTime.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: input.timeZone,
  });
  const responseLines = Object.entries(input.responses)
    .map(([, v]) => `${v.label}: ${Array.isArray(v.value) ? v.value.join(", ") : v.value}`)
    .join("\n");
  const userMessage = `Meeting details:
Organizer: ${input.organizerName} (${input.organizerEmail})
Attendee: ${input.attendeeName} (${input.attendeeEmail})
Event: ${input.eventTitle}
Start (organizer timezone ${input.timeZone}): ${startFormatted}
Form responses:
${responseLines || "(none)"}

Return a JSON object with exactly these keys: attendeeSummary (string), suggestedAgenda (array of exactly 3 strings), openingQuestion (string), prepTip (string).`;

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system:
        "You are a meeting preparation assistant. Return only valid JSON. No markdown, no explanation, no code fences.",
      messages: [{ role: "user", content: userMessage }],
    });
    const first = res.content[0];
    if (!first || first.type !== "text") return null;
    const cleaned = first.text.replace(/```json|```/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!isBriefingOutput(parsed)) return null;
    const [a0, a1, a2] = parsed.suggestedAgenda;
    return {
      attendeeSummary: parsed.attendeeSummary,
      suggestedAgenda: [a0, a1, a2],
      openingQuestion: parsed.openingQuestion,
      prepTip: parsed.prepTip,
    };
  } catch (err) {
    console.error("[BookingBrief]", err);
    return null;
  }
}
