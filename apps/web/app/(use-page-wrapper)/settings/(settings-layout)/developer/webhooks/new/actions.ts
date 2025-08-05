"use server";

import { revalidateTag } from "next/cache";

export async function revalidateWebhookList() {
  revalidateTag("viewer.webhook.list");
}
