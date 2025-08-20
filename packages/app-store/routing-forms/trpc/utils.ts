import type { App_RoutingForms_Form, User } from "@prisma/client";

import dayjs from "@calcom/dayjs";

import { FormWebhookService } from "@calcom/features/webhooks/lib/service/FormWebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import type { SerializableField, OrderedResponses } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/trpc/utils"] });

type SelectFieldWebhookResponse = string | number | string[] | { label: string; id: string | null };
export type FORM_SUBMITTED_WEBHOOK_RESPONSES = Record<
  string,
  {
    /**
     * Deprecates `value` prop as it now has both the id(that doesn't change) and the label(that can change but is human friendly)
     */
    response: number | string | string[] | SelectFieldWebhookResponse | SelectFieldWebhookResponse[];
    /**
     * @deprecated Use `response` instead
     */
    value: FormResponse[keyof FormResponse]["value"];
  }
>;

function isOptionsField(field: Pick<SerializableField, "type" | "options">) {
  return (field.type === "select" || field.type === "multiselect") && field.options;
}

export function getFieldResponse({
  field,
  fieldResponseValue,
}: {
  fieldResponseValue: FormResponse[keyof FormResponse]["value"];
  field: Pick<SerializableField, "type" | "options">;
}) {
  if (!isOptionsField(field)) {
    return {
      value: fieldResponseValue,
      response: fieldResponseValue,
    };
  }

  if (!field.options) {
    return {
      value: fieldResponseValue,
      response: fieldResponseValue,
    };
  }

  const valueArray = fieldResponseValue instanceof Array ? fieldResponseValue : [fieldResponseValue];

  const chosenOptions = valueArray.map((idOrLabel) => {
    const foundOptionById = field.options?.find((option) => {
      return option.id === idOrLabel;
    });
    if (foundOptionById) {
      return {
        label: foundOptionById.label,
        id: foundOptionById.id,
      };
    } else {
      return {
        label: idOrLabel.toString(),
        id: null,
      };
    }
  });
  return {
    // value is a legacy prop that is just sending the labels which can change
    value: chosenOptions.map((option) => option.label),
    // response is new prop that is sending the label along with id(which doesn't change)
    response: chosenOptions,
  };
}

/**
 * Not called in preview mode or dry run mode
 * It takes care of sending webhooks and emails for form submissions
 */
export async function _onFormSubmission(
  form: Ensure<
    SerializableForm<App_RoutingForms_Form> & { user: Pick<User, "id" | "email">; userWithEmails?: string[] },
    "fields"
  >,
  response: FormResponse,
  responseId: number,
  chosenAction?: {
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    value: string;
  }
) {
  const fieldResponsesByIdentifier: FORM_SUBMITTED_WEBHOOK_RESPONSES = {};

  for (const [fieldId, fieldResponse] of Object.entries(response)) {
    const field = form.fields.find((f) => f.id === fieldId);
    if (!field) {
      throw new Error(`Field with id ${fieldId} not found`);
    }
    // Use the label lowercased as the key to identify a field.
    // TODO: We seem to be using label from the response, Can we not use the field.label
    const key =
      form.fields.find((f) => f.id === fieldId)?.identifier ||
      (fieldResponse.label as keyof typeof fieldResponsesByIdentifier);
    fieldResponsesByIdentifier[key] = getFieldResponse({
      fieldResponseValue: fieldResponse.value,
      field,
    });
  }

  const { userId, teamId } = getWebhookTargetEntity(form);

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

  const subscriberOptionsFormSubmitted = {
    userId,
    teamId,
    orgId,
    triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
  };

  const subscriberOptionsFormSubmittedNoEvent = {
    userId,
    teamId,
    orgId,
    triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
  };

  // Send immediate FORM_SUBMITTED webhooks using new architecture
  await FormWebhookService.emitFormSubmitted({
    form: {
      id: form.id,
      name: form.name,
    },
    response: {
      id: responseId,
      data: fieldResponsesByIdentifier,
    },
    eventTypeId: undefined, // Routing forms are not tied to specific event types
    userId,
    teamId,
    orgId,
  });

  // Schedule delayed form webhooks using new architecture
  if (typeof window === "undefined") {
    try {
      await FormWebhookService.scheduleDelayedFormWebhooks({
        responseId,
        form: {
          id: form.id,
          name: form.name,
          teamId: form.teamId ?? null,
        },
        responses: fieldResponsesByIdentifier,
        redirect: chosenAction,
        teamId: form.teamId,
        orgId,
        delayMinutes: 15,
      });

      const promises: Promise<any>[] = [];

      await Promise.all(promises);
      const orderedResponses = form.fields.reduce((acc, field) => {
        acc.push(response[field.id]);
        return acc;
      }, [] as OrderedResponses);

      if (form.teamId) {
        if (form.userWithEmails?.length) {
          moduleLogger.debug(
            `Preparing to send Form Response email for Form:${form.id} to users: ${form.userWithEmails.join(
              ","
            )}`
          );
          await sendResponseEmail(form, orderedResponses, form.userWithEmails);
        }
      } else if (form.settings?.emailOwnerOnSubmission) {
        moduleLogger.debug(
          `Preparing to send Form Response email for Form:${form.id} to form owner: ${form.user.email}`
        );
        await sendResponseEmail(form, orderedResponses, [form.user.email]);
      }
    } catch (e) {
      moduleLogger.error("Error triggering routing form response side effects", e);
    }
  }
}
export const onFormSubmission = withReporting(_onFormSubmission, "onFormSubmission");

export const sendResponseEmail = async (
  form: Pick<App_RoutingForms_Form, "id" | "name" | "fields">,
  orderedResponses: OrderedResponses,
  toAddresses: string[]
) => {
  try {
    if (typeof window === "undefined") {
      const { default: ResponseEmail } = await import("../emails/templates/response-email");
      const email = new ResponseEmail({ form: form, toAddresses, orderedResponses });
      await email.sendEmail();
    }
  } catch (e) {
    moduleLogger.error("Error sending response email", e);
  }
};

function getWebhookTargetEntity(form: { teamId?: number | null; user: { id: number } }) {
  // If it's a team form, the target must be team webhook
  // If it's a user form, the target must be user webhook
  const isTeamForm = form.teamId;
  return { userId: isTeamForm ? null : form.user.id, teamId: isTeamForm ? form.teamId : null };
}
