import type { WorkflowMethods } from "@prisma/client";

export const workflowTemplates: { [K in WorkflowMethods]: K } = {
  EMAIL: "EMAIL",
  SMS: "SMS",
};

export default workflowTemplates;
