import type { WorkflowMethods } from "@calcom/prisma/enums";

export function workflowTypeToText(status: WorkflowMethods) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
