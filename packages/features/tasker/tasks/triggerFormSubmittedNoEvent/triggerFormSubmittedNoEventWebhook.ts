import { z } from "zod";

import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import incompleteBookingActionFunctions from "@calcom/app-store/routing-forms/lib/incompleteBooking/actionFunctions";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import prisma from "@calcom/prisma";

import { getSubmitterEmail, shouldTriggerFormSubmittedNoEvent } from "./formSubmissionValidation";

export type ResponseData = {
  responseId: number;
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  form: { id: string; name: string; teamId: number | null };
  redirect?: {
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    value: string;
  };
};

export const ZTriggerFormSubmittedNoEventWebhookPayloadSchema = z.object({
  webhook: z.object({
    subscriberUrl: z.string().url(),
    appId: z.string().nullable(),
    payloadTemplate: z.string().nullable(),
    secret: z.string().nullable(),
  }),
  responseId: z.number(),
  responses: z.any(),
  redirect: z
    .object({
      type: z.enum(["customPageMessage", "externalRedirectUrl", "eventTypeRedirectUrl"]),
      value: z.string(),
    })
    .optional(),
  form: z.object({
    id: z.string(),
    name: z.string(),
    teamId: z.number().nullable(),
  }),
});

export async function triggerFormSubmittedNoEventWebhook(payload: string): Promise<void> {
  const { webhook, responseId, form, redirect, responses } =
    ZTriggerFormSubmittedNoEventWebhookPayloadSchema.parse(JSON.parse(payload));

  const shouldTrigger = await shouldTriggerFormSubmittedNoEvent({
    formId: form.id,
    responses,
    responseId,
  });

  if (!shouldTrigger) return;

  await sendGenericWebhookPayload({
    secretKey: webhook.secret,
    triggerEvent: "FORM_SUBMITTED_NO_EVENT",
    createdAt: new Date().toISOString(),
    webhook,
    data: {
      formId: form.id,
      formName: form.name,
      teamId: form.teamId,
      redirect,
      responseId,
      responses,
    },
  }).catch((e) => {
    console.error(`Error executing FORM_SUBMITTED_NO_EVENT webhook`, webhook, e);
  });

  // See if there are other incomplete booking actions
  const incompleteBookingActions = await prisma.app_RoutingForms_IncompleteBookingActions.findMany({
    where: {
      formId: form.id,
    },
  });

  if (incompleteBookingActions) {
    for (const incompleteBookingAction of incompleteBookingActions) {
      const actionType = incompleteBookingAction.actionType;

      // Get action function
      const bookingActionFunction = incompleteBookingActionFunctions[actionType];

      const emailValue = getSubmitterEmail(responses);
      if (emailValue) {
        await bookingActionFunction(incompleteBookingAction, emailValue);
      }
    }
  }
}
