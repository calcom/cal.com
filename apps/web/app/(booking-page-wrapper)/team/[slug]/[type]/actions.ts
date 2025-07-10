"use server";

import { revalidateTag } from "next/cache";

// Coupled with `getCachedTeamData` in `queries.ts`
export async function revalidateTeamDataCache({
  teamSlug,
  orgSlug,
}: {
  teamSlug: string;
  orgSlug: string | null;
}) {
  revalidateTag(`team:${teamSlug}${orgSlug ? `:${orgSlug}` : ""}`);
}

// Coupled with `getCachedTeamEventType` in `queries.ts`
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
