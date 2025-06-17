"use server";

import { revalidatePath } from "next/cache";

export async function revalidateUserBookingPreview({
  userSlug,
  eventTypeSlug,
}: {
  userSlug: string;
  eventTypeSlug: string;
}) {
  revalidatePath(`/${userSlug}/${eventTypeSlug}/preview`);
}
