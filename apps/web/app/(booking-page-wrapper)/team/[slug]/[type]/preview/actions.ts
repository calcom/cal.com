"use server";

import { revalidatePath } from "next/cache";

export async function revalidateTeamBookingPreview({
  teamSlug,
  eventTypeSlug,
}: {
  teamSlug: string;
  eventTypeSlug: string;
}) {
  revalidatePath(`/team/${teamSlug}/${eventTypeSlug}/preview`);
}
