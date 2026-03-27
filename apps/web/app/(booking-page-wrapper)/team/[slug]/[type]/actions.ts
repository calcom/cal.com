"use server";

import { updateTag } from "next/cache";

// Coupled with `getCachedTeamData` in `queries.ts`
export async function revalidateTeamDataCache({
  teamSlug,
  orgSlug,
}: {
  teamSlug: string;
  orgSlug: string | null;
}) {
  updateTag(`team:${orgSlug ? `${orgSlug}:` : ""}${teamSlug}`);
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
  updateTag(`event-type:${orgSlug ? `${orgSlug}:` : ""}${teamSlug}:${meetingSlug}`);
}
