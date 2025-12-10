import type { WorkflowMethods } from "@calcom/prisma/enums";

export function workflowTypeToText(status: WorkflowMethods) {
  const specialCases: Partial<Record<WorkflowMethods, string>> = {
    SMS: "SMS",
    WHATSAPP: "WhatsApp",
    EMAIL: "Email",
  };

  if (status in specialCases) {
    return specialCases[status];
  }

  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
