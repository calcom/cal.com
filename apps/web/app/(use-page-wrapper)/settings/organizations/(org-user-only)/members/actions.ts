"use server";

import { revalidateTag } from "next/cache";

import { ORG_ATTRIBUTES_CACHE_TAG, ORG_ROLES_CACHE_TAG } from "./cache";

export async function revalidateAttributesList() {
  revalidateTag(ORG_ATTRIBUTES_CACHE_TAG, "max");
}

export async function revalidateRolesList() {
  revalidateTag(ORG_ROLES_CACHE_TAG, "max");
}
