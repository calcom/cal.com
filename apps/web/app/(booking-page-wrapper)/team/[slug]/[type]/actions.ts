"use server";

import { revalidatePath } from "next/cache";

export async function revalidateTeamBookingPage(
  teamSlug: string,
  meetingSlug: string,
  orgSlug: string | null
) {
  if (orgSlug) {
    revalidatePath(`/org/${orgSlug}/team/${teamSlug}/${meetingSlug}`);
  } else {
    revalidatePath(`/team/${teamSlug}/${meetingSlug}`);
  }
}
