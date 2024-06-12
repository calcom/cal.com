import { z } from "zod";

import {
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@calcom/ee/workflows/lib/constants";

const ZWorkflow = z.object({
  id: z.number(),
  trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
  time: z.number().nullable(),
  timeUnit: z.enum(TIME_UNIT).nullable(),
  userId: z.number().nullable(),
  teamId: z.number().nullable(),
  steps: z
    .object({
      id: z.number(),
      action: z.enum(WORKFLOW_ACTIONS),
      sendTo: z.string().nullable(),
      template: z.enum(WORKFLOW_TEMPLATES),
      reminderBody: z.string().nullable(),
      emailSubject: z.string().nullable(),
      numberRequired: z.boolean().nullable(),
      sender: z.string().nullable(),
      includeCalendarEvent: z.boolean(),
      numberVerificationPending: z.boolean(),
    })
    .array(),
});

export const ZGetAllActiveWorkflowsInputSchema = z.object({
  eventTypeWorkflows: z.array(ZWorkflow),
  teamId: z.number().optional().nullable(),
  userId: z.number().optional().nullable(),
});

export type TGetAllActiveWorkflowsInputSchema = z.infer<typeof ZGetAllActiveWorkflowsInputSchema>;
