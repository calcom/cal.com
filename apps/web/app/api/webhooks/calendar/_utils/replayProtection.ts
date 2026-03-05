import type { CalendarProvider } from "@calid/job-engine";
import { acquireDebounceLock } from "@calid/redis";

const WEBHOOK_REPLAY_TTL_SECONDS = 10 * 60;
const WEBHOOK_DEBOUNCE_TTL_MS = 10 * 1000;

export const registerWebhookReplay = async (
  provider: CalendarProvider,
  uniqueRequestId: string
): Promise<"accepted" | "replay"> => {
  const key = `webhook_replay:${provider}:${uniqueRequestId}`;
  const acquired = await acquireDebounceLock(key, WEBHOOK_REPLAY_TTL_SECONDS * 1000);
  return acquired ? "accepted" : "replay";
};

export const registerWebhookDebounce = async (params: {
  provider: CalendarProvider;
  providerAccountId: string | null | undefined;
  calendarId: number;
  ttlMs?: number;
}): Promise<"accepted" | "deduped"> => {
  const providerAccountId = (params.providerAccountId ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `lock:calendar_sync_debounce:${params.provider.toLowerCase()}:${providerAccountId}:${
    params.calendarId
  }`;
  const acquired = await acquireDebounceLock(key, params.ttlMs ?? WEBHOOK_DEBOUNCE_TTL_MS);
  return acquired ? "accepted" : "deduped";
};
