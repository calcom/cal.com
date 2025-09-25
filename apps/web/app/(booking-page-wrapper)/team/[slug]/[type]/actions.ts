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
  revalidateTag(`team:${orgSlug ? `${orgSlug}:` : ""}${teamSlug}`);
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
  revalidateTag(`event-type:${orgSlug ? `${orgSlug}:` : ""}${teamSlug}:${meetingSlug}`);
}

export async function revalidateCalIdTeamDataCache({ teamSlug }: { teamSlug: string }) {
  revalidateTag(`team:${teamSlug}`);
}

export async function revalidateCalIdTeamEventTypeCache({
  teamSlug,
  meetingSlug,
}: {
  teamSlug: string;
  meetingSlug: string;
}) {
  revalidateTag(`event-type:${teamSlug}:${meetingSlug}`);
}
