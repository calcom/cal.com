import { CalendarProvider, getAdapter } from "@calid/job-engine";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import logger from "@calcom/lib/logger";

import { enqueueDeltaSyncFromWebhook } from "../_utils/enqueueDeltaSync";
import { getHeaderValue, toHeaderRecord } from "../_utils/headerUtils";
import { readRawBody } from "../_utils/readRawBody";
import { registerWebhookDebounce, registerWebhookReplay } from "../_utils/replayProtection";
import {
  deriveUniqueWebhookRequestId,
  extractProviderTimestampMs,
  isTimestampWithinTolerance,
} from "../_utils/requestIdentity";
import { resolveCalendarIdsForWebhook } from "../_utils/routingResolver";

const log = logger.getSubLogger({ prefix: ["[api]", "[webhooks]", "[calendar-sync]"] });

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

const resolveProvider = (providerParam: string): CalendarProvider | null => {
  const normalized = providerParam.trim().toLowerCase();
  if (normalized === "google") {
    return CalendarProvider.GOOGLE;
  }
  if (normalized === "outlook") {
    return CalendarProvider.OUTLOOK;
  }
  return null;
};

const hasSignatureLikeHeader = (
  provider: CalendarProvider,
  headers: Record<string, string | string[] | undefined>
) => {
  if (provider === CalendarProvider.GOOGLE) {
    return Boolean(
      getHeaderValue(headers, "x-goog-channel-id") && getHeaderValue(headers, "x-goog-resource-id")
    );
  }
  return Boolean(getHeaderValue(headers, "client-state") || getHeaderValue(headers, "x-ms-signature"));
};

const providerName = (provider: CalendarProvider): string => provider.toLowerCase();

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const resolvedParams = await params;
    const provider = resolveProvider(resolvedParams.provider);
    if (!provider) {
      return NextResponse.json({ received: true, message: "Unsupported provider" }, { status: 200 });
    }

    const headers = toHeaderRecord(request);
    const rawBody = await readRawBody(request);
    const validationToken = request.nextUrl.searchParams.get("validationToken");

    const timestampMs = extractProviderTimestampMs(provider, headers);
    log.info("webhook_received", {
      event: "webhook_received",
      provider: providerName(provider),
      hasSignature: hasSignatureLikeHeader(provider, headers),
      hasTimestamp: timestampMs !== null,
    });

    if (!isTimestampWithinTolerance(provider, headers, TIMESTAMP_TOLERANCE_MS)) {
      log.warn("webhook_invalid_timestamp", {
        event: "webhook_invalid_timestamp",
        provider: providerName(provider),
        toleranceMs: TIMESTAMP_TOLERANCE_MS,
      });
      return NextResponse.json({ message: "Timestamp outside tolerance window" }, { status: 401 });
    }

    const adapter = getAdapter(provider);
    const verification = await adapter.verifyWebhook({
      headers,
      rawBody,
      providerHint: { validationToken },
    });
    if (!verification.isValid) {
      log.warn("webhook_invalid_signature", {
        event: "webhook_invalid_signature",
        provider: providerName(provider),
        reason: verification.reason ?? "unknown",
      });
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    log.info("webhook_verified", {
      event: "webhook_verified",
      provider: providerName(provider),
    });

    if (provider === CalendarProvider.OUTLOOK && validationToken) {
      return new NextResponse(validationToken, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    const routing = await adapter.extractWebhookRouting({
      headers,
      rawBody,
    });

    const uniqueRequestId = deriveUniqueWebhookRequestId({
      provider,
      headers,
      rawBody,
      routingHints: {
        subscriptionId: routing.subscriptionId,
        resourceId: routing.resourceId,
        providerCalendarId: routing.providerCalendarId,
      },
    });

    const replayState = await registerWebhookReplay(provider, uniqueRequestId);
    if (replayState === "replay") {
      log.warn("webhook_replay_detected", {
        event: "webhook_replay_detected",
        provider: providerName(provider),
      });
      // Keep 200 to avoid aggressive provider retries.
      return NextResponse.json({ received: true, replay: true }, { status: 200 });
    }

    const calendarIds = await resolveCalendarIdsForWebhook({
      provider,
      subscriptionId: routing.subscriptionId,
      resourceId: routing.resourceId,
      providerCalendarId: routing.providerCalendarId,
      providerAccountId: routing.providerAccountId,
    });

    if (calendarIds.length === 0) {
      log.info("webhook_unrouteable", {
        event: "webhook_unrouteable",
        provider: providerName(provider),
        hasSubscriptionId: Boolean(routing.subscriptionId),
        hasProviderCalendarId: Boolean(routing.providerCalendarId),
        hasResourceId: Boolean(routing.resourceId),
      });
      return NextResponse.json({ received: true, routed: false }, { status: 200 });
    }

    const receivedAt = new Date().toISOString();

    for (const calendarId of calendarIds) {
      const enqueueState = await registerWebhookDebounce({
        provider,
        providerAccountId: routing.providerAccountId,
        calendarId,
      });
      if (enqueueState === "deduped") {
        log.info("webhook_enqueue_skipped_dedupe", {
          event: "webhook_enqueue_skipped_dedupe",
          provider: providerName(provider),
          calendarId,
        });
        continue;
      }

      try {
        await enqueueDeltaSyncFromWebhook({
          calendarId,
          provider,
          receivedAt,
          subscriptionId: routing.subscriptionId ?? null,
          resourceId: routing.resourceId ?? null,
        });

        log.info("webhook_enqueued", {
          event: "webhook_enqueued",
          provider: providerName(provider),
          calendarId,
        });
      } catch (error) {
        log.error("webhook_enqueue_failed", {
          event: "webhook_enqueue_failed",
          provider: providerName(provider),
          calendarId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({ received: true, routed: true }, { status: 200 });
  } catch (error) {
    log.error("webhook_handler_failed", {
      event: "webhook_handler_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
