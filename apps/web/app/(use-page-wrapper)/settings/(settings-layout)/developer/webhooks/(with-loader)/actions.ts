"use server";

import { revalidateTag } from "next/cache";

export async function revalidateWebhooksListGetByViewer() {
  revalidateTag("viewer.webhook.getByViewer");
}
