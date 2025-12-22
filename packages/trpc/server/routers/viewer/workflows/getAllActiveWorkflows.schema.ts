import { z } from "zod";

import {
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@calcom/ee/workflows/lib/constants";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

// Define types first to use with z.ZodType annotations
type TWorkflow = {
  id: number;
  name: string;
  trigger: (typeof WORKFLOW_TRIGGER_EVENTS)[number];
  time: number | null;
  timeUnit: (typeof TIME_UNIT)[number] | null;
  userId: number | null;
  teamId: number | null;
  steps: {
    id: number;
    action: (typeof WORKFLOW_ACTIONS)[number];
    sendTo: string | null;
    template: (typeof WORKFLOW_TEMPLATES)[number];
    reminderBody: string | null;
    emailSubject: string | null;
    numberRequired: boolean | null;
    sender: string | null;
    includeCalendarEvent: boolean;
    numberVerificationPending: boolean;
    verifiedAt?: Date | null;
  }[];
};

export const ZWorkflow: z.ZodType<TWorkflow> = z.object({
  id: z.number(),
  name: z.string(),
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
      verifiedAt: z.coerce.date().nullable().optional(),
    })
    .array(),
});

type TWorkflows = { workflow: TWorkflow }[] | undefined;

export const ZWorkflows: z.ZodType<TWorkflows> = z
  .object({
    workflow: ZWorkflow,
  })
  .array()
  .optional();

export type TGetAllActiveWorkflowsInputSchema = {
  eventType: {
    id: number;
    teamId?: number | null;
    parent?: {
      id: number | null;
      teamId: number | null;
    } | null;
    metadata: z.infer<typeof EventTypeMetaDataSchema>;
    userId?: number | null;
  };
};

export const ZGetAllActiveWorkflowsInputSchema: z.ZodType<TGetAllActiveWorkflowsInputSchema> = z.object({
  eventType: z.object({
    id: z.number(),
    teamId: z.number().optional().nullable(),
    parent: z
      .object({
        id: z.number().nullable(),
        teamId: z.number().nullable(),
      })
      .optional()
      .nullable(),
    metadata: EventTypeMetaDataSchema,
    userId: z.number().optional().nullable(),
  }),
});
