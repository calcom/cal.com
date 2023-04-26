import { z } from "zod";

import { TimeUnit, WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

export const ZUpdateInputSchema = z.object({
  id: z.number(),
  name: z.string(),
  activeOn: z.number().array(),
  steps: z
    .object({
      id: z.number(),
      stepNumber: z.number(),
      action: z.nativeEnum(WorkflowActions),
      workflowId: z.number(),
      sendTo: z.string().optional().nullable(),
      reminderBody: z.string().optional().nullable(),
      emailSubject: z.string().optional().nullable(),
      template: z.nativeEnum(WorkflowTemplates),
      numberRequired: z.boolean().nullable(),
      sender: z.string().optional().nullable(),
      senderName: z.string().optional().nullable(),
    })
    .array(),
  trigger: z.nativeEnum(WorkflowTriggerEvents),
  time: z.number().nullable(),
  timeUnit: z.nativeEnum(TimeUnit).nullable(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
