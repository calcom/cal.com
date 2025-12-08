import {
  WORKFLOW_TEMPLATES,
  WORKFLOW_ACTIONS,
  TIME_UNITS,
  WORKFLOW_TRIGGER_EVENTS,
} from "@calid/features/modules/workflows/config/constants";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const ZCalIdUpdateInputSchema = z.object({
  id: z.number(),
  name: z.string(),
  activeOn: z.number().array(),
  steps: z
    .object({
      id: z.number(),
      stepNumber: z.number(),
      action: z.enum(WORKFLOW_ACTIONS),
      workflowId: z.number(),
      sendTo: z.string().nullable(),
      reminderBody: z.string().nullable(),
      emailSubject: z.string().nullable(),
      metaTemplateName: z.string().optional().nullable(),
      metaTemplatePhoneNumberId: z.string().optional().nullable(),
      template: z.enum(WORKFLOW_TEMPLATES),
      numberRequired: z.boolean().nullable(),
      sender: z.string().nullable(),
      senderName: z.string().nullable(),
      includeCalendarEvent: z.boolean(),
    })
    .array(),
  trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
  time: z.number().nullable(),
  timeUnit: z.enum(TIME_UNITS).nullable(),
  isActiveOnAll: z.boolean().optional(),
});

export type TCalIdUpdateInputSchema = z.infer<typeof ZCalIdUpdateInputSchema>;
