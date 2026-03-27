"use server";

import { updateTag } from "next/cache";

export async function revalidateAttributesList() {
  updateTag("viewer.attributes.list");
}
