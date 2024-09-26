import type { App_RoutingForms_Form, User } from "@prisma/client";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import slugify from "@calcom/lib/slugify";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import { evaluateRaqbLogic } from "../lib/evaluateRaqbLogic";
import { getAttributesMappedWithTeamMembers } from "../lib/getAttributes";
import { getAttributesForTeam } from "../lib/getAttributes";
import { getQueryBuilderConfigForAttributes } from "../lib/getQueryBuilderConfig";
import isRouter from "../lib/isRouter";
import type { OrderedResponses } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";

type Field = NonNullable<SerializableForm<App_RoutingForms_Form>["fields"]>[number];

function isOptionsField(field: Pick<Field, "type" | "options">) {
  return (field.type === "select" || field.type === "multiselect") && field.options;
}

function getFieldResponse({
  field,
  fieldResponseValue,
}: {
  fieldResponseValue: FormResponse[keyof FormResponse]["value"];
  field: Pick<Field, "type" | "options">;
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

type SelectFieldWebhookResponse = string | number | string[] | { label: string; id: string | null };
type FORM_SUBMITTED_WEBHOOK_RESPONSES = Record<
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

/**
 * Replaces the field variable(in format {field:<fieldId>}) with the response value of the field
 */
export function replaceFieldVariableInLogicWithResponseValue({
  logic,
  fields,
  response,
}: {
  logic: Object;
  fields: Field[] | undefined;
  response: FormResponse;
}) {
  const logicWithFieldValues = JSON.parse(
    JSON.stringify(logic).replace(/{field:([\w-]+)}/g, (match, fieldId) => {
      const field = fields?.find((f) => f.id === fieldId);
      if (!field) {
        console.log("field not found", fieldId);
        return match;
      }
      const matchingOptionLabel = field.options?.find(
        (option) => option.id === response[fieldId]?.value
      )?.label;
      console.log("matchingOptionLabel", { matchingOptionLabel, response, fieldId });
      const fieldValue = slugify(matchingOptionLabel || "");
      return fieldValue ? fieldValue : match;
    })
  );
  return logicWithFieldValues as Object;
}

export async function findTeamMembersMatchingAttributeLogic({
  form,
  response,
  routeId,
  teamId,
}: {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "routes" | "fields">;
  response: FormResponse;
  routeId: string;
  teamId: number;
}) {
  const route = form.routes?.find((route) => route.id === routeId);
  if (!route) {
    return null;
  }
  let teamMembersMatchingAttributeLogic: number[] = [];
  if (!isRouter(route)) {
    const attributesQueryValue = route.attributesQueryValue;
    if (!attributesQueryValue) {
      return null;
    }
    const attributes = await getAttributesForTeam({ teamId: teamId });
    const attributesQueryBuilderConfig = getQueryBuilderConfigForAttributes({ attributes, form });
    const teamMembersWithAttributes = await getAttributesMappedWithTeamMembers({ teamId: teamId });

    teamMembersWithAttributes.forEach((member) => {
      const result = evaluateRaqbLogic(
        {
          queryValue: attributesQueryValue,
          queryBuilderConfig: attributesQueryBuilderConfig,
          data: member.attributes,
        },
        ({ logic }) => {
          return replaceFieldVariableInLogicWithResponseValue({ logic, fields: form.fields, response });
        }
      );

      if (result) {
        teamMembersMatchingAttributeLogic.push(member.userId);
      } else {
        console.log("Team member does not match attributes logic", safeStringify({ member }));
      }
    });
  }

  return teamMembersMatchingAttributeLogic;
}

export async function onFormSubmission(
  form: Ensure<
    SerializableForm<App_RoutingForms_Form> & { user: Pick<User, "id" | "email">; userWithEmails?: string[] },
    "fields"
  >,
  response: FormResponse
) {
  const fieldResponsesByIdentifier: FORM_SUBMITTED_WEBHOOK_RESPONSES = {};

  for (const [fieldId, fieldResponse] of Object.entries(response)) {
    const field = form.fields.find((f) => f.id === fieldId);
    if (!field) {
      throw new Error(`Field with id ${fieldId} not found`);
    }
    // Use the label lowercased as the key to identify a field.
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

  const subscriberOptions = {
    userId,
    teamId,
    orgId,
    triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
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

  await Promise.all(promises);
  const orderedResponses = form.fields.reduce((acc, field) => {
    acc.push(response[field.id]);
    return acc;
  }, [] as OrderedResponses);

  if (form.settings?.emailOwnerOnSubmission) {
    logger.debug(
      `Preparing to send Form Response email for Form:${form.id} to form owner: ${form.user.email}`
    );
    await sendResponseEmail(form, orderedResponses, [form.user.email]);
  } else if (form.userWithEmails?.length) {
    logger.debug(
      `Preparing to send Form Response email for Form:${form.id} to users: ${form.userWithEmails.join(",")}`
    );
    await sendResponseEmail(form, orderedResponses, form.userWithEmails);
  }
}

export const sendResponseEmail = async (
  form: Pick<App_RoutingForms_Form, "id" | "name">,
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
    logger.error("Error sending response email", e);
  }
};

function getWebhookTargetEntity(form: { teamId?: number | null; user: { id: number } }) {
  // If it's a team form, the target must be team webhook
  // If it's a user form, the target must be user webhook
  const isTeamForm = form.teamId;
  return { userId: isTeamForm ? null : form.user.id, teamId: isTeamForm ? form.teamId : null };
}
