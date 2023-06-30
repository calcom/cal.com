import type { App_RoutingForms_Form, User } from "@prisma/client";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import ResponseEmail from "../emails/templates/response-email";
import type { Response, SerializableForm } from "../types/types";

export async function onFormSubmission(
  form: Ensure<SerializableForm<App_RoutingForms_Form> & { user: User }, "fields">,
  response: Response
) {
  const fieldResponsesByName: Record<string, (typeof response)[keyof typeof response]["value"]> = {};

  for (const [fieldId, fieldResponse] of Object.entries(response)) {
    // Use the label lowercased as the key to identify a field.
    const key =
      form.fields.find((f) => f.id === fieldId)?.identifier ||
      (fieldResponse.label as keyof typeof fieldResponsesByName);
    fieldResponsesByName[key] = fieldResponse.value;
  }

  const subscriberOptions = {
    userId: form.user.id,
    triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
    // When team routing forms are implemented, we need to make sure to add the teamId here
    teamId: null,
  };

  const webhooks = await getWebhooks(subscriberOptions);
  const promises = webhooks.map((webhook) => {
    sendGenericWebhookPayload(
      webhook.secret,
      "FORM_SUBMITTED",
      new Date().toISOString(),
      webhook,
      fieldResponsesByName
    ).catch((e) => {
      console.error(`Error executing routing form webhook`, webhook, e);
    });
  });

  await Promise.all(promises);
  if (form.settings?.emailOwnerOnSubmission) {
    logger.debug(
      `Preparing to send Form Response email for Form:${form.id} to form owner: ${form.user.email}`
    );
    await sendResponseEmail(form, response, form.user.email);
  }
}

export const sendResponseEmail = async (
  form: Pick<App_RoutingForms_Form, "id" | "name">,
  response: Response,
  ownerEmail: string
) => {
  try {
    const email = new ResponseEmail({ form: form, toAddresses: [ownerEmail], response: response });
    await email.sendEmail();
  } catch (e) {
    logger.error("Error sending response email", e);
  }
};
