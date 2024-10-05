import type { App_RoutingForms_Form, User } from "@prisma/client";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import slugify from "@calcom/lib/slugify";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import { evaluateRaqbLogic, RaqbLogicResult } from "../lib/evaluateRaqbLogic";
import {
  getTeamMembersWithAttributeOptionValuePerAttribute,
  getAttributesForTeam,
} from "../lib/getAttributes";
import { getQueryBuilderConfigForAttributes } from "../lib/getQueryBuilderConfig";
import isRouter from "../lib/isRouter";
import { Attribute } from "../types/types";
import type { LocalRoute, OrderedResponses, Route } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/trpc/utils"] });
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

// We connect Form Field value and Attribute value using the labels lowercased
function compatibleForAttributeAndFormFieldMatch<T extends string | string[]>(
  stringOrStringArray: T
): T extends string[] ? string[] : string {
  return (
    stringOrStringArray instanceof Array
      ? stringOrStringArray.map((string) => string.toLowerCase())
      : stringOrStringArray.toLowerCase()
  ) as T extends string[] ? string[] : string;
}

function getAttributesCompatibleForMatchingWithFormField(attributes: Record<string, string | string[]>) {
  return Object.entries(attributes).reduce((acc, [key, value]) => {
    acc[key] = compatibleForAttributeAndFormFieldMatch(value);
    return acc;
  }, {} as Record<string, string | string[]>);
}

/**
 * Replace attribute option Ids with the attribute option label(compatible to be matched with form field value)
 */
const replaceAttributeOptionIdsWithOptionLabel = ({
  queryValueString,
  attributes,
}: {
  queryValueString: string;
  attributes: Attribute[];
}) => {
  const allAttributesOptions = attributes.map((attribute) => attribute.options).flat();
  // Because all attribute option Ids are unique, we can reliably identify them along any number of attribute options of different attributes
  allAttributesOptions.forEach((attributeOption) => {
    const attributeOptionId = attributeOption.id;
    queryValueString = queryValueString.replace(
      new RegExp(`${attributeOptionId}`, "g"),
      compatibleForAttributeAndFormFieldMatch(attributeOption.value)
    );
  });
  return queryValueString;
};

/**
 * Replace {field:<fieldId>} with the field label(compatible to be matched with attribute value)
 */
const replaceFieldTemplateVariableWithOptionLabel = ({
  queryValueString,
  fields,
  response,
}: {
  queryValueString: string;
  fields: Field[] | undefined;
  response: FormResponse;
}) => {
  return queryValueString.replace(/{field:([\w-]+)}/g, (match, fieldId: string) => {
    const field = fields?.find((f) => f.id === fieldId);
    if (!field) {
      moduleLogger.debug("field not found", safeStringify({ fieldId }));
      return match;
    }
    const fieldResponseValue = response[fieldId]?.value;
    if (!fieldResponseValue) {
      return match;
    }
    const { value: fieldValue } = getFieldResponse({ field, fieldResponseValue });
    moduleLogger.debug("matchingOptionLabel", safeStringify({ fieldValue, response, fieldId }));
    if (fieldValue instanceof Array && fieldValue.length > 1) {
      throw new Error("Array value not supported with 'Value of field'");
    }
    return fieldValue ? compatibleForAttributeAndFormFieldMatch(fieldValue.toString()) : match;
  });
};

function getAttributesQueryValueCompatibleForMatchingWithFormField({
  attributesQueryValue,
  attributes,
  response,
  fields,
}: {
  attributesQueryValue: LocalRoute["attributesQueryValue"];
  attributes: Attribute[];
  response: FormResponse;
  fields: Field[] | undefined;
}) {
  if (!attributesQueryValue) {
    return null;
  }
  const attributesQueryValueCompatibleForMatchingWithFormField = JSON.parse(
    replaceFieldTemplateVariableWithOptionLabel({
      queryValueString: replaceAttributeOptionIdsWithOptionLabel({
        queryValueString: JSON.stringify(attributesQueryValue),
        attributes,
      }),
      fields,
      response,
    })
  );
  return attributesQueryValueCompatibleForMatchingWithFormField;
}

function getAttributesQueryBuilderConfigCompatibleForMatchingWithFormField({
  form,
  attributes,
}: {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "fields">;
  attributes: Attribute[];
}) {
  const attributesQueryBuilderConfig = getQueryBuilderConfigForAttributes({
    attributes,
    form,
  });

  const attributesQueryBuilderConfigFieldsWithCompatibleListValues = Object.fromEntries(
    Object.entries(attributesQueryBuilderConfig.fields).map(([fieldId, field]) => [
      fieldId,
      {
        ...field,
        fieldSettings: {
          ...field.fieldSettings,
          listValues: field.fieldSettings.listValues?.map((option) => {
            return {
              ...option,
              // Use the title(which is the attributeOption.value) as the value of the raqb field so that it can be compatible for matching with the form field value
              value: compatibleForAttributeAndFormFieldMatch(option.title),
            };
          }),
        },
      },
    ])
  );

  const attributesQueryBuilderConfigWithCompatibleListValues = {
    ...attributesQueryBuilderConfig,
    fields: attributesQueryBuilderConfigFieldsWithCompatibleListValues,
  };

  return attributesQueryBuilderConfigWithCompatibleListValues;
}

export async function findTeamMembersMatchingAttributeLogicOfRoute({
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
  let teamMembersMatchingAttributeLogic: {
    userId: number;
    result: RaqbLogicResult;
  }[] = [];
  if (!isRouter(route)) {
    const attributesForTeam = await getAttributesForTeam({ teamId: teamId });
    const attributesQueryValue = getAttributesQueryValueCompatibleForMatchingWithFormField({
      attributesQueryValue: route.attributesQueryValue,
      attributes: attributesForTeam,
      response,
      fields: form.fields,
    });

    if (!attributesQueryValue) {
      return null;
    }

    const attributesQueryBuilderConfig = getAttributesQueryBuilderConfigCompatibleForMatchingWithFormField({
      form,
      attributes: attributesForTeam,
    });

    moduleLogger.debug(
      "Finding team members matching attribute logic",
      safeStringify({
        form,
        response,
        routeId,
        teamId,
        attributesQueryBuilderConfigFields: attributesQueryBuilderConfig.fields,
      })
    );

    const teamMembersWithAttributeOptionValuePerAttribute =
      await getTeamMembersWithAttributeOptionValuePerAttribute({ teamId: teamId });

    teamMembersWithAttributeOptionValuePerAttribute.forEach((member, index) => {
      const attributes = getAttributesCompatibleForMatchingWithFormField(member.attributes);
      moduleLogger.debug(
        `Checking team member ${member.userId} with attributes logic`,
        safeStringify({ attributes, attributesQueryValue })
      );
      const result = evaluateRaqbLogic({
        queryValue: attributesQueryValue,
        queryBuilderConfig: attributesQueryBuilderConfig,
        data: attributes,
        beStrictWithEmptyLogic: true,
      });

      if (result === RaqbLogicResult.MATCH || result === RaqbLogicResult.LOGIC_NOT_FOUND_SO_MATCHED) {
        moduleLogger.debug(`Team member ${member.userId} matches attributes logic`);
        teamMembersMatchingAttributeLogic.push({ userId: member.userId, result });
      } else {
        moduleLogger.debug(
          `Team member ${member.userId} does not match attributes logic with index ${index}`
        );
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
    moduleLogger.debug(
      `Preparing to send Form Response email for Form:${form.id} to form owner: ${form.user.email}`
    );
    await sendResponseEmail(form, orderedResponses, [form.user.email]);
  } else if (form.userWithEmails?.length) {
    moduleLogger.debug(
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
    moduleLogger.error("Error sending response email", e);
  }
};

function getWebhookTargetEntity(form: { teamId?: number | null; user: { id: number } }) {
  // If it's a team form, the target must be team webhook
  // If it's a user form, the target must be user webhook
  const isTeamForm = form.teamId;
  return { userId: isTeamForm ? null : form.user.id, teamId: isTeamForm ? form.teamId : null };
}
