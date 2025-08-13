import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

import { TimeUnit, WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

import { validateSenderIdFormat } from "./utils";

const workflowFormSchema = z.object({
  name: z.string(),
  activeOn: z.object({ value: z.string(), label: z.string() }).array(),
  trigger: z.nativeEnum(WorkflowTriggerEvents),
  time: z.number().gte(0).optional(),
  timeUnit: z.nativeEnum(TimeUnit).optional(),
  steps: z
    .object({
      id: z.number(),
      stepNumber: z.number(),
      action: z.nativeEnum(WorkflowActions),
      workflowId: z.number(),
      reminderBody: z.string().nullable(),
      emailSubject: z.string().nullable(),
      template: z.nativeEnum(WorkflowTemplates),
      numberRequired: z.boolean().nullable(),
      includeCalendarEvent: z.boolean().nullable(),
      sendTo: z
        .string()
        .refine((val) => isValidPhoneNumber(val) || val.includes("@"))
        .optional()
        .nullable(),
      sender: z
        .string()
        .refine((val) => validateSenderIdFormat(val))
        .optional()
        .nullable(),
      senderName: z.string().optional().nullable(),
    })
    .array(),
  selectAll: z.boolean(),
  disabled: z.boolean().optional(),
});

const querySchema = z.object({
  workflow: stringOrNumber,
});

export { workflowFormSchema, querySchema };
