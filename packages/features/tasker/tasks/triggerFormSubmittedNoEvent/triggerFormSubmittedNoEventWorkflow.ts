import { z } from "zod";

import logger from "@calcom/lib/logger";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import { ZWorkflow } from "@calcom/trpc/server/routers/viewer/workflows/getAllActiveWorkflows.schema";

import { shouldTriggerFormSubmittedNoEvent } from "./formSubmissionValidation";

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
  workflow: ZWorkflow,
});

export async function triggerFormSubmittedNoEventWorkflow(payload: string): Promise<void> {
  const { responseId, form, responses, workflow } = ZTriggerFormSubmittedNoEventWorkflowPayloadSchema.parse(
    JSON.parse(payload)
  );

  const shouldTrigger = await shouldTriggerFormSubmittedNoEvent({
    formId: form.id,
    responseId,
    responses,
  });

  if (!shouldTrigger) return;

  try {
    WorkflowService.scheduleFormWorkflows({
      workflows: [workflow],
      responses,
      responseId,
      form: form,
    });
  } catch (error) {
    logger.error("Error while triggering form submitted no event workflows", JSON.stringify({ error }));
  }
}
