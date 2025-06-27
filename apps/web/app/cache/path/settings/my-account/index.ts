"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSettingsProfile() {
  revalidatePath("/settings/my-account/profile");
}
