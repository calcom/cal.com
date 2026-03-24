import type { CalendarProvider } from "@calid/job-engine";
import { createHash } from "node:crypto";

import { getHeaderValue, type HeaderRecord } from "./headerUtils";

const REQUEST_ID_HEADERS_BY_PROVIDER: Record<CalendarProvider, string[]> = {
  GOOGLE: ["x-goog-message-number", "x-request-id"],
  OUTLOOK: ["x-ms-notification-id", "x-ms-request-id", "x-request-id"],
};

const TIMESTAMP_HEADERS_BY_PROVIDER: Record<CalendarProvider, string[]> = {
  GOOGLE: ["x-goog-message-timestamp", "date"],
  OUTLOOK: ["x-ms-notification-timestamp", "date"],
};

const RELEVANT_HEADERS_FOR_HASH_BY_PROVIDER: Record<CalendarProvider, string[]> = {
  GOOGLE: [
    "x-goog-channel-id",
    "x-goog-resource-id",
    "x-goog-resource-uri",
    "x-goog-resource-state",
    "x-goog-message-number",
    "x-goog-channel-token",
  ],
  OUTLOOK: ["x-ms-request-id", "x-ms-notification-id", "x-ms-notification-timestamp"],
};

export const extractProviderTimestampMs = (
  provider: CalendarProvider,
  headers: HeaderRecord
): number | null => {
  for (const headerName of TIMESTAMP_HEADERS_BY_PROVIDER[provider]) {
    const raw = getHeaderValue(headers, headerName);
    if (!raw) {
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      // Treat <= 10 digits as unix seconds, else ms.
      const ms = trimmed.length <= 10 ? asNumber * 1000 : asNumber;
      if (Number.isFinite(ms)) {
        return ms;
      }
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const isTimestampWithinTolerance = (
  provider: CalendarProvider,
  headers: HeaderRecord,
  toleranceMs: number,
  nowMs: number = Date.now()
): boolean => {
  const timestampMs = extractProviderTimestampMs(provider, headers);
  if (timestampMs === null) {
    return true;
  }

  return Math.abs(nowMs - timestampMs) <= toleranceMs;
};

const getExplicitRequestId = (provider: CalendarProvider, headers: HeaderRecord): string | null => {
  for (const headerName of REQUEST_ID_HEADERS_BY_PROVIDER[provider]) {
    const value = getHeaderValue(headers, headerName);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const buildFallbackIdentitySource = (
  provider: CalendarProvider,
  rawBody: string,
  headers: HeaderRecord,
  routingHints?: {
    subscriptionId?: string | null;
    resourceId?: string | null;
    providerCalendarId?: string | null;
  }
): string => {
  const relevantHeaders = RELEVANT_HEADERS_FOR_HASH_BY_PROVIDER[provider]
    .map((name) => `${name}:${getHeaderValue(headers, name) ?? ""}`)
    .join("|");

  const timestampPart = `${extractProviderTimestampMs(provider, headers) ?? ""}`;
  const routingPart = [
    routingHints?.subscriptionId ?? "",
    routingHints?.resourceId ?? "",
    routingHints?.providerCalendarId ?? "",
  ].join("|");

  return [provider, timestampPart, relevantHeaders, routingPart, rawBody].join("::");
};

export const deriveUniqueWebhookRequestId = (params: {
  provider: CalendarProvider;
  headers: HeaderRecord;
  rawBody: string;
  routingHints?: {
    subscriptionId?: string | null;
    resourceId?: string | null;
    providerCalendarId?: string | null;
  };
}): string => {
  const explicitRequestId = getExplicitRequestId(params.provider, params.headers);
  if (explicitRequestId) {
    return explicitRequestId;
  }

  const source = buildFallbackIdentitySource(
    params.provider,
    params.rawBody,
    params.headers,
    params.routingHints
  );
  return createHash("sha256").update(source).digest("hex");
};
