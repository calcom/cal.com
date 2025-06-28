"use server";

import { revalidatePath } from "next/cache";

export async function revalidateWorkflowsList() {
  revalidatePath("/workflows");
}
