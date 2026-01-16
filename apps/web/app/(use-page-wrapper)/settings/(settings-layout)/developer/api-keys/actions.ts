"use server";

import { revalidateTag } from "next/cache";

import { API_KEYS_CACHE_TAG } from "./cache";

export async function revalidateApiKeysList() {
  revalidateTag(API_KEYS_CACHE_TAG, "max");
}
