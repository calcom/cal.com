"use server";

import { revalidatePath } from "next/cache";

export async function revalidateApiKeysList() {
  revalidatePath("/settings/developer/api-keys");
}
