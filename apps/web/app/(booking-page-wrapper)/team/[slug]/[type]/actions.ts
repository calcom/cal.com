"use server";

import { revalidateTag } from "next/cache";

/**
 * Invalidate only the team data cache for a specific team
 * Use this when team data is modified
 */
export async function revalidateTeamDataCache({
  teamSlug,
  orgSlug,
}: {
  teamSlug: string;
  orgSlug: string | null;
}) {
  revalidateTag(`team:${teamSlug}${orgSlug ? `:${orgSlug}` : ""}`);
}

/**
 * Invalidate only the team event type cache for a specific event type
 * Use this when event types are added, removed, or modified
 */
export async function revalidateTeamEventTypeCache({
  teamSlug,
  meetingSlug,
  orgSlug,
}: {
  teamSlug: string;
  meetingSlug: string;
  orgSlug: string | null;
}) {
  revalidateTag(`event-type:${teamSlug}:${meetingSlug}${orgSlug ? `:${orgSlug}` : ""}`);
}
