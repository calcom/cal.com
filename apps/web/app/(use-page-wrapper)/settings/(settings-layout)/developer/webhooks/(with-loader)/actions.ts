"use server";

import { revalidatePath } from "next/cache";

export async function revalidateWebhooksList() {
  revalidatePath("/settings/developer/webhooks");
}
