"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSettingsProfile() {
  revalidatePath("/settings/my-account/profile");
}

export async function revalidateSettingsCalendars() {
  revalidatePath("/settings/my-account/calendars");
}
