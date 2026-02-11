"use server";

import { revalidateTag } from "next/cache";

export async function revalidateApiKeysList() {
  revalidateTag("viewer.apiKeys.list", "max");
}
