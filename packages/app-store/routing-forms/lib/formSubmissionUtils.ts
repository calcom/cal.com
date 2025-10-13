import dayjs from "@calcom/dayjs";
import type { Tasker } from "@calcom/features/tasker/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { App_RoutingForms_Form, User } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";
import type { Ensure } from "@calcom/types/utils";

import type { FormResponse, SerializableForm, SerializableField, OrderedResponses } from "../types/types";
import getFieldIdentifier from "./getFieldIdentifier";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/formSubmissionUtils"] });

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

/**
 * Not called in preview mode or dry run mode
 * It takes care of sending webhooks and emails for form submissions
 */
export async function _onFormSubmission(
  form: Ensure<
    SerializableForm<App_RoutingForms_Form> & {
      user: Pick<User, "id" | "email" | "timeFormat" | "locale">;
      userWithEmails?: string[];
    },
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

  const webhooksFormSubmitted = await getWebhooks(subscriberOptionsFormSubmitted);

  const webhooksFormSubmittedNoEvent = await getWebhooks(subscriberOptionsFormSubmittedNoEvent);

  const promisesFormSubmitted = webhooksFormSubmitted.map((webhook) => {
    sendGenericWebhookPayload({
      secretKey: webhook.secret,
      triggerEvent: "FORM_SUBMITTED",
      createdAt: new Date().toISOString(),
      webhook,
      data: {
        formId: form.id,
        formName: form.name,
        teamId: form.teamId,
        responses: fieldResponsesByIdentifier,
      },
      rootData: {
        // Send responses unwrapped at root level for backwards compatibility
        ...Object.entries(fieldResponsesByIdentifier).reduce((acc, [key, value]) => {
          acc[key] = value.value;
          return acc;
        }, {} as Record<string, FormResponse[keyof FormResponse]["value"]>),
      },
    }).catch((e) => {
      console.error(`Error executing routing form webhook`, webhook, e);
    });
  });

  if (typeof window === "undefined") {
    try {
      const tasker: Tasker = await (await import("@calcom/features/tasker")).default;
      const promisesFormSubmittedNoEvent = webhooksFormSubmittedNoEvent.map((webhook) => {
        const scheduledAt = dayjs().add(15, "minute").toDate();

        return tasker.create(
          "triggerFormSubmittedNoEventWebhook",
          {
            responseId,
            form: {
              id: form.id,
              name: form.name,
              teamId: form.teamId ?? null,
            },
            responses: fieldResponsesByIdentifier,
            redirect: chosenAction,
            webhook,
          },
          { scheduledAt }
        );
      });

      const promises = [...promisesFormSubmitted, ...promisesFormSubmittedNoEvent];

      await Promise.all(promises);

      const workflows = await WorkflowService.getAllWorkflowsFromRoutingForm(form);

      await WorkflowService.scheduleFormWorkflows({
        workflows,
        responseId,
        responses: fieldResponsesByIdentifier,
        form: {
          ...form,
          fields: form.fields.map((field) => ({
            type: field.type,
            identifier: getFieldIdentifier(field),
          })),
        },
      });

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

export type TargetRoutingFormForResponse = SerializableForm<
  App_RoutingForms_Form & {
    user: {
      id: number;
      email: string;
      timeFormat: number | null;
      locale: string | null;
    };
    team: {
      parentId: number | null;
    } | null;
  }
>;

/**
 * A wrapper over onFormSubmission that handles building the data needed for onFormSubmission
 */
export const onSubmissionOfFormResponse = async ({
  form,
  formResponseInDb,
  chosenRouteAction,
}: {
  form: TargetRoutingFormForResponse;
  formResponseInDb: { id: number; response: Prisma.JsonValue };
  chosenRouteAction: {
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    value: string;
  } | null;
}) => {
  if (!form.fields) {
    // There is no point in submitting a form that doesn't have fields defined
    throw new HttpError({ statusCode: 400 });
  }
  const settings = RoutingFormSettings.parse(form.settings);
  let userWithEmails: string[] = [];

  if (form.teamId && (settings?.sendToAll || settings?.sendUpdatesTo?.length)) {
    const whereClause: Prisma.MembershipWhereInput = { teamId: form.teamId };
    if (!settings?.sendToAll) {
      whereClause.userId = { in: settings.sendUpdatesTo };
    }
    const userEmails = await prisma.membership.findMany({
      where: whereClause,
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    userWithEmails = userEmails.map((userEmail) => userEmail.user.email);
  }

  await onFormSubmission(
    { ...form, fields: form.fields, userWithEmails },
    formResponseInDb.response as FormResponse,
    formResponseInDb.id,
    chosenRouteAction ?? undefined
  );
};
