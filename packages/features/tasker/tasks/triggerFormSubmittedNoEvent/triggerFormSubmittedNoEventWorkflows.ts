import { z } from "zod";

import logger from "@calcom/lib/logger";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";

export const ZTriggerFormSubmittedNoEventWorkflowsPayloadSchema = z.object({
  responseId: z.number(),
  responses: z.any(),
  form: z.object({
    id: z.string(),
    name: z.string(),
    teamId: z.number().nullable(),
  }),
});

export async function triggerFormSubmittedNoEventWorkflows(payload: string): Promise<void> {
  const { responseId, form, responses } = ZTriggerFormSubmittedNoEventWorkflowsPayloadSchema.parse(
    JSON.parse(payload)
  );

  const bookingRepository = new BookingRepository(prisma);
  const bookingFromResponse = await bookingRepository.findLatestBookingByFormId(form.id);

  if (bookingFromResponse) {
    return;
  }
  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentResponses =
    (await prisma.app_RoutingForms_FormResponse.findMany({
      where: {
        formId: form.id,
        createdAt: {
          gte: sixtyMinutesAgo,
          lt: new Date(),
        },
        routedToBookingUid: {
          not: null,
        },
        NOT: {
          id: responseId,
        },
      },
    })) ?? [];

  const emailValue = Object.values(responses).find(
    (response): response is { value: string; label: string } => {
      const value =
        typeof response === "object" && response && "value" in response ? response.value : response;
      return typeof value === "string" && value.includes("@");
    }
  )?.value;
  // Check for duplicate email in recent responses
  const hasDuplicate =
    emailValue &&
    recentResponses.some((response) => {
      return Object.values(response.response as Record<string, { value: string; label: string }>).some(
        (field) => {
          if (!response.response || typeof response.response !== "object") return false;

          return typeof field.value === "string" && field.value.toLowerCase() === emailValue.toLowerCase();
        }
      );
    });

  if (hasDuplicate) {
    return;
  }
  try {
    // Todo: Execute the workflows
  } catch (error) {
    logger.error("Error while triggering form submitted no event workflows", JSON.stringify({ error }));
  }
}
