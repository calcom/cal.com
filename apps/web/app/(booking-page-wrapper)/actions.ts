"use server";

import { revalidateTag } from "next/cache";

export async function revalidateBookingCache(username: string, eventSlug: string) {
  revalidateTag(`booking-${username}-${eventSlug}`);
  revalidateTag(`user-${username}`);
  revalidateTag(`event-${eventSlug}`);
  revalidateTag(`availability-${eventSlug}`);
  revalidateTag(`user-availability-${username}`);
}
