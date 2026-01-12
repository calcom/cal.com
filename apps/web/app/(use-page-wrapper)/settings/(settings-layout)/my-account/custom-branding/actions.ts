"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSettingsCustomBranding() {
  revalidatePath("/settings/my-account/custom-branding");
}
