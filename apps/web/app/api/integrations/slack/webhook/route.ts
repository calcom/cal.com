import { createHmac } from "node:crypto";
import prisma from "@calcom/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SLACK_CHAT_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";

type SlackCredentialKey = {
  access_token?: string;
  channel_id?: string;
  bridge_token?: string;
  webhook_secret?: string;
};

function verifyCalWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return true;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigToCompare = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (sigToCompare.length !== expected.length) return false;
  const sigBuffer = Buffer.from(sigToCompare, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

function formatSlackMessage(triggerEvent: string, payload: Record<string, unknown>): string {
  const title = (payload.title as string) || "Booking";
  const startTime = payload.startTime as string | undefined;
  const endTime = payload.endTime as string | undefined;
  const organizer = payload.organizer as { name?: string; email?: string } | undefined;
  const attendees = (payload.attendees as { name?: string; email?: string }[]) || [];
  const uid = payload.uid as string | undefined;
  const meetingUrl = payload.location as string | undefined;

  const lines: string[] = [`*${triggerEvent.replace(/_/g, " ")}*`, `• ${title}`];
  if (startTime && endTime) {
    lines.push(`• When: ${new Date(startTime).toLocaleString()} – ${new Date(endTime).toLocaleString()}`);
  }
  if (organizer?.name) {
    lines.push(`• Organizer: ${organizer.name}`);
  }
  if (attendees.length > 0) {
    const names = attendees.map((a) => a.name || a.email).filter(Boolean);
    if (names.length) lines.push(`• Attendees: ${names.join(", ")}`);
  }
  if (meetingUrl && typeof meetingUrl === "string" && meetingUrl.startsWith("http")) {
    lines.push(`• <${meetingUrl}|Join meeting>`);
  }
  if (uid) {
    lines.push(`• Booking UID: \`${uid}\``);
  }
  return lines.join("\n");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "Missing token. Use the webhook URL from Slack app setup." },
        { status: 400 }
      );
    }

    const rawBody = await request.text();
    let body: { triggerEvent?: string; payload?: Record<string, unknown> };
    try {
      body = JSON.parse(rawBody) as { triggerEvent?: string; payload?: Record<string, unknown> };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const triggerEvent = body.triggerEvent ?? "BOOKING_EVENT";
    const payload = body.payload ?? {};

    const credentials = await prisma.credential.findMany({
      where: { appId: "slack", type: "slack_notification" },
      select: { id: true, key: true },
    });

    const credential = credentials.find((c) => {
      const key = c.key as SlackCredentialKey | null;
      return key?.bridge_token === token;
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Invalid or expired token. Re-save your Slack app setup to get a new webhook URL." },
        { status: 404 }
      );
    }

    const key = credential.key as SlackCredentialKey;
    const accessToken = key.access_token;
    const channelId = key.channel_id;
    const webhookSecret = key.webhook_secret;

    if (!accessToken) {
      return NextResponse.json({ error: "Slack credential missing access token." }, { status: 500 });
    }

    const signature = request.headers.get("x-cal-signature-256");
    if (!verifyCalWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const text = formatSlackMessage(triggerEvent, payload);
    let channel: string | undefined;
    if (channelId && typeof channelId === "string") {
      channel = channelId;
    }
    if (!channel) {
      return NextResponse.json(
        { error: "Slack credential missing channel_id. Update the app setup with a channel ID." },
        { status: 500 }
      );
    }

    const slackRes = await fetch(SLACK_CHAT_POST_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        channel,
        text,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    if (!slackRes.ok) {
      const errText = await slackRes.text();
      console.error("Slack API error:", slackRes.status, errText);
      return NextResponse.json(
        { error: `Slack API error: ${slackRes.status}`, details: errText },
        { status: 502 }
      );
    }

    const slackBody = (await slackRes.json()) as { ok: boolean; error?: string };
    if (!slackBody.ok) {
      console.error("Slack API application error:", slackBody.error);
      return NextResponse.json(
        { error: `Slack API error: ${slackBody.error ?? "unknown"}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Slack webhook bridge error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
