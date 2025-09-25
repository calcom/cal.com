import {
  TIME_UNITS,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@calid/features/modules/workflows/config/constants";
import { z } from "zod";

import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

const ZCalIdWorkflow = z.object({
  id: z.number(),
  name: z.string(),
  trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
  time: z.number().nullable(),
  timeUnit: z.enum(TIME_UNITS).nullable(),
  userId: z.number().nullable(),
  calIdTeamId: z.number().nullable(),
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

export const ZCalIdWorkflows = z
  .object({
    workflow: ZCalIdWorkflow,
  })
  .array()
  .optional();

export const ZCalIdGetAllActiveWorkflowsInputSchema = z.object({
  eventType: z.object({
    id: z.number(),
    calIdTeamId: z.number().optional().nullable(),
    parent: z
      .object({
        id: z.number().nullable(),
        calIdTeamId: z.number().nullable(),
      })
      .optional()
      .nullable(),
    metadata: EventTypeMetaDataSchema,
    userId: z.number().optional().nullable(),
  }),
});

export type TCalIdGetAllActiveWorkflowsInputSchema = z.infer<typeof ZCalIdGetAllActiveWorkflowsInputSchema>;
