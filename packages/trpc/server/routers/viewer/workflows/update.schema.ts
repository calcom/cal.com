import { z } from "zod";

import { isFormTrigger } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import {
  WORKFLOW_TEMPLATES,
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TRIGGER_EVENTS,
  ALLOWED_FORM_WORKFLOW_ACTIONS,
} from "@calcom/features/ee/workflows/lib/constants";

const stepSchema = z.object({
  id: z.number(),
  stepNumber: z.number(),
  action: z.enum(WORKFLOW_ACTIONS),
  workflowId: z.number(),
  sendTo: z.string().nullable(),
  reminderBody: z.string().nullable(),
  emailSubject: z.string().nullable(),
  template: z.enum(WORKFLOW_TEMPLATES),
  numberRequired: z.boolean().nullable(),
  sender: z.string().nullable(),
  senderName: z.string().nullable(),
  includeCalendarEvent: z.boolean(),
  agentId: z.string().nullish(),
  inboundAgentId: z.string().nullish(),
});

export const ZUpdateInputSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    activeOnEventTypeIds: z.number().array(), // also includes team ids
    activeOnRoutingFormIds: z.string().array(),
    steps: stepSchema.array(),
    trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
    time: z.number().nullable(),
    timeUnit: z.enum(TIME_UNIT).nullable(),
    isActiveOnAll: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // For form triggers, validate that all steps use allowed actions
      if (isFormTrigger(data.trigger)) {
        return data.steps.every((step) =>
          (ALLOWED_FORM_WORKFLOW_ACTIONS as readonly string[]).includes(step.action)
        );
      }
      return true;
    },
    {
      message: "This action is not allowed for form triggers",
      path: ["steps"],
    }
  );

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
