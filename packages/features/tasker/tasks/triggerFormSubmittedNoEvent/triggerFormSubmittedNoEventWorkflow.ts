import { z } from "zod";

import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import logger from "@calcom/lib/logger";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates, TimeUnit } from "@calcom/prisma/enums";

import { shouldTriggerFormSubmittedNoEvent } from "./formSubmissionValidation";

export const ZTriggerFormSubmittedNoEventWorkflowPayloadSchema = z.object({
  responseId: z.number(),
  responses: z.any(),
  formId: z.string(),
  workflow: z.object({
    id: z.number(),
    name: z.string(),
    teamId: z.number().nullable(),
    trigger: z.nativeEnum(WorkflowTriggerEvents),
    time: z.number().nullable(),
    timeUnit: z.nativeEnum(TimeUnit).nullable(),
    userId: z.number().nullable(),
    steps: z.array(
      z.object({
        id: z.number(),
        action: z.nativeEnum(WorkflowActions),
        sendTo: z.string().nullable(),
        template: z.nativeEnum(WorkflowTemplates),
        reminderBody: z.string().nullable(),
        emailSubject: z.string().nullable(),
        sender: z.string().nullable(),
        includeCalendarEvent: z.boolean(),
        numberVerificationPending: z.boolean(),
        numberRequired: z.boolean().nullable(),
        verifiedAt: z.date().optional().nullable(),
      })
    ),
  }),
});

export async function triggerFormSubmittedNoEventWorkflow(payload: string): Promise<void> {
  const { responseId, formId, responses, workflow } = ZTriggerFormSubmittedNoEventWorkflowPayloadSchema.parse(
    JSON.parse(payload)
  );

  const shouldTrigger = await shouldTriggerFormSubmittedNoEvent({
    formId,
    responseId,
    responses,
  });

  if (!shouldTrigger) return;

  try {
    await scheduleWorkflowReminders({
      workflows: [workflow],
      smsReminderNumber: null, // we need to pass this here and get it from repsonses
      calendarEvent: null, //we need to pass responses here instead
      hideBranding: false, // we need to get that from team or user
    });
  } catch (error) {
    logger.error("Error while triggering form submitted no event workflows", JSON.stringify({ error }));
  }
}
