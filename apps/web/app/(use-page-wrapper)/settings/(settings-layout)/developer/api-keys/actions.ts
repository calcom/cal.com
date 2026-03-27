"use server";

import { updateTag } from "next/cache";

export async function revalidateApiKeysList() {
  updateTag("viewer.apiKeys.list");
}
