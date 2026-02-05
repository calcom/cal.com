"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSettingsAppearance() {
  revalidatePath("/settings/my-account/appearance");
}
