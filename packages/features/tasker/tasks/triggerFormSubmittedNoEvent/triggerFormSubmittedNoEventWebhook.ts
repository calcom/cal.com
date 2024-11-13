import { z } from "zod";

import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/trpc/utils";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import prisma from "@calcom/prisma";

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
    fields: z
      .array(z.object({ id: z.string(), label: z.string() }).passthrough())
      .nullable()
      .default([]),
  }),
});

export async function triggerFormSubmittedNoEventWebhook(payload: string): Promise<void> {
  const { webhook, responseId, form, redirect, responses } =
    ZTriggerFormSubmittedNoEventWebhookPayloadSchema.parse(JSON.parse(payload));

  const bookingFromResponse = await prisma.booking.findFirst({
    where: {
      routedFromRoutingFormReponse: {
        id: responseId,
      },
    },
  });

  if (bookingFromResponse) {
    return;
  }

  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
  const recentResponses =
    (await prisma.app_RoutingForms_FormResponse.findMany({
      where: {
        formId: form.id,
        createdAt: {
          gte: twentyMinutesAgo,
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

  const currentEmail = Object.entries(responses).find(([question, response]) => {
    const value = typeof response === "object" && response && "value" in response ? response.value : response;
    return typeof value === "string" && value.includes("@");
  })?.[1];

  // Check for duplicate email in recent responses
  const hasDuplicate =
    currentEmail?.value &&
    recentResponses.some((response) => {
      return Object.values(response.response).some(
        (field) => typeof field.value === "string" && field.value === currentEmail.value
      );
    });

  if (hasDuplicate) {
    return;
  }

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
      responses,
    },
  }).catch((e) => {
    console.error(`Error executing FORM_SUBMITTED_NO_EVENT webhook`, webhook, e);
  });
}
