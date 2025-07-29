"use server";

import { revalidatePath } from "next/cache";

export async function revalidateSettingsGeneral() {
  revalidatePath("/settings/my-account/general");
}
