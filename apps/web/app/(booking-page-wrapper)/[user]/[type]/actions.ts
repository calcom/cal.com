"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateBookingPage(user: string, type: string) {
  revalidatePath(`/${user}/${type}`);
  revalidateTag("booking-page");
}

export async function revalidateUserBookingPages(user: string) {
  revalidatePath(`/${user}`, "layout");
  revalidateTag("booking-page");
}
