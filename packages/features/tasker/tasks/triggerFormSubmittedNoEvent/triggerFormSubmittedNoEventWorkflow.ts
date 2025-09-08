import { z } from "zod";

import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { Workflow } from "@calcom/ee/workflows/lib/types";
import logger from "@calcom/lib/logger";
import { ZWorkflow } from "@calcom/trpc/server/routers/viewer/workflows/getAllActiveWorkflows.schema";

import { shouldTriggerFormSubmittedNoEvent } from "./formSubmissionValidation";

const log = logger.getSubLogger({ prefix: ["[tasker] triggerFormSubmittedNoEventWorkflow"] });

export const ZTriggerFormSubmittedNoEventWorkflowPayloadSchema = z.object({
  responseId: z.number(),
  responses: z.any(),
  form: z.object({
    id: z.string(),
    userId: z.number(),
    teamId: z.number().nullable().optional(),
    fields: z.array(z.object({ type: z.string(), identifier: z.string().optional() })).optional(),
    user: z.object({
      email: z.string(),
      timeFormat: z.number().nullable(),
      locale: z.string().nullable(),
    }),
  }),
  hideBranding: z.boolean(),
  smsReminderNumber: z.string().nullable(),
  workflow: ZWorkflow,
  submittedAt: z.coerce.date(),
});

export async function triggerFormSubmittedNoEventWorkflow(payload: string): Promise<void> {
  const { responseId, form, responses, smsReminderNumber, hideBranding, workflow, submittedAt } =
    ZTriggerFormSubmittedNoEventWorkflowPayloadSchema.parse(JSON.parse(payload));

  const shouldTrigger = await shouldTriggerFormSubmittedNoEvent({
    formId: form.id,
    responseId,
    responses,
    submittedAt,
  });

  if (!shouldTrigger) return;

  try {
    await scheduleWorkflowReminders({
      smsReminderNumber,
      formData: {
        responses,
        user: { email: form.user.email, timeFormat: form.user.timeFormat, locale: form.user.locale ?? "en" },
      },
      hideBranding,
      workflows: [workflow as Workflow],
    });
  } catch (error) {
    log.error("Error while triggering form submitted no event workflows", JSON.stringify({ error }));
  }
}
