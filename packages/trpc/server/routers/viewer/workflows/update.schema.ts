import { z } from "zod";

import {
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@calcom/features/ee/workflows/lib/constants";

export const ZUpdateInputSchema = z.object({
  id: z.number(),
  name: z.string(),
  activeOn: z.number().array(),
  steps: z
    .object({
      id: z.number(),
      stepNumber: z.number(),
      action: z.enum(WORKFLOW_ACTIONS),
      workflowId: z.number(),
      sendTo: z.string().optional().nullable(),
      reminderBody: z.string().optional().nullable(),
      emailSubject: z.string().optional().nullable(),
      template: z.enum(WORKFLOW_TEMPLATES),
      numberRequired: z.boolean().nullable(),
      sender: z.string().optional().nullable(),
      senderName: z.string().optional().nullable(),
    })
    .array(),
  trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
  time: z.number().nullable(),
  timeUnit: z.enum(TIME_UNIT).nullable(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
