import { z } from "zod";

import logger from "@calcom/lib/logger";

import { shouldTriggerFormSubmittedNoEvent } from "./formSubmissionValidation";

export const ZTriggerFormSubmittedNoEventWorkflowPayloadSchema = z.object({
  responseId: z.number(),
  responses: z.any(),
  form: z.object({
    id: z.string(),
    name: z.string(),
    teamId: z.number().nullable(),
  }),
});

export async function triggerFormSubmittedNoEventWorkflow(payload: string): Promise<void> {
  const { responseId, form, responses } = ZTriggerFormSubmittedNoEventWorkflowPayloadSchema.parse(
    JSON.parse(payload)
  );

  const shouldTrigger = await shouldTriggerFormSubmittedNoEvent({
    formId: form.id,
    responseId,
    responses,
  });

  if (!shouldTrigger) return;

  try {
    // Todo: Execute the workflows
  } catch (error) {
    logger.error("Error while triggering form submitted no event workflows", JSON.stringify({ error }));
  }
}
