"use server";

import { revalidateWorkflowsList } from "@lib/cache/workflows";

export async function revalidateWorkflowsListAction() {
  await revalidateWorkflowsList();
}
