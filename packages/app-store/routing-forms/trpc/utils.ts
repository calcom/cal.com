import type { App_RoutingForms_Form, User } from "@prisma/client";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import type { OrderedResponses } from "../types/types";
import type { Response, SerializableForm } from "../types/types";

export async function onFormSubmission(
  form: Ensure<SerializableForm<App_RoutingForms_Form> & { user: User }, "fields">,
  response: Response
) {
  const fieldResponsesByName: Record<
    string,
    {
      value: Response[keyof Response]["value"];
    }
  > = {};

  for (const [fieldId, fieldResponse] of Object.entries(response)) {
    // Use the label lowercased as the key to identify a field.
    const key =
      form.fields.find((f) => f.id === fieldId)?.identifier ||
      (fieldResponse.label as keyof typeof fieldResponsesByName);
    fieldResponsesByName[key] = {
      value: fieldResponse.value,
    };
  }

  const subscriberOptions = {
    triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
    ...getWebhookTargetEntity(form),
  };

  const webhooks = await getWebhooks(subscriberOptions);

  const promises = webhooks.map((webhook) => {
    sendGenericWebhookPayload({
      secretKey: webhook.secret,
      triggerEvent: "FORM_SUBMITTED",
      createdAt: new Date().toISOString(),
      webhook,
      data: {
        formId: form.id,
        formName: form.name,
        teamId: form.teamId,
        responses: fieldResponsesByName,
      },
      rootData: {
        // Send responses unwrapped at root level for backwards compatibility
        ...Object.entries(fieldResponsesByName).reduce((acc, [key, value]) => {
          acc[key] = value.value;
          return acc;
        }, {} as Record<string, Response[keyof Response]["value"]>),
      },
    }).catch((e) => {
      console.error(`Error executing routing form webhook`, webhook, e);
    });
  });

  await Promise.all(promises);
  const orderedResponses = form.fields.reduce((acc, field) => {
    acc.push(response[field.id]);
    return acc;
  }, [] as OrderedResponses);

  if (form.settings?.emailOwnerOnSubmission) {
    logger.debug(
      `Preparing to send Form Response email for Form:${form.id} to form owner: ${form.user.email}`
    );
    await sendResponseEmail(form, orderedResponses, form.user.email);
  }
}

export const sendResponseEmail = async (
  form: Pick<App_RoutingForms_Form, "id" | "name">,
  orderedResponses: OrderedResponses,
  ownerEmail: string
) => {
  try {
    if (typeof window === "undefined") {
      const { default: ResponseEmail } = await import("../emails/templates/response-email");
      const email = new ResponseEmail({ form: form, toAddresses: [ownerEmail], orderedResponses });
      await email.sendEmail();
    }
  } catch (e) {
    logger.error("Error sending response email", e);
  }
};

function getWebhookTargetEntity(form: { teamId?: number | null; user: { id: number } }) {
  // If it's a team form, the target must be team webhook
  // If it's a user form, the target must be user webhook
  const isTeamForm = form.teamId;
  return { userId: isTeamForm ? null : form.user.id, teamId: isTeamForm ? form.teamId : null };
}
