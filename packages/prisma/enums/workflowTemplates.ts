import type { WorkflowTemplates } from "@prisma/client";

export const workflowTemplates: { [K in WorkflowTemplates]: K } = {
  REMINDER: "REMINDER",
  CUSTOM: "CUSTOM",
};

export default workflowTemplates;
