"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSettingsCalendars() {
  revalidatePath("/settings/my-account/calendars");
}
