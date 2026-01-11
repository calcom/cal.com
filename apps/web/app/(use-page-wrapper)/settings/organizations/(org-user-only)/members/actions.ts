"use server";

import { revalidateTag } from "next/cache";

export async function revalidateAttributesList() {
  revalidateTag("viewer.attributes.list");
}
