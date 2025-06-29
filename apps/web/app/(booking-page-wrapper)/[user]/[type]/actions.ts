"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateUserBookingPage(userSlug: string, meetingSlug: string) {
  revalidatePath(`/${userSlug}/${meetingSlug}`);
  revalidateTag("user-booking-page");
}
