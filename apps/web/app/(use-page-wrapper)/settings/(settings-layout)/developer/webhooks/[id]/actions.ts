"use server";

import { revalidateTag } from "next/cache";

export async function revalidateWebhookById(id: string) {
  revalidateTag(`viewer.webhook.get:${id}`);
}
