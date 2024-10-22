import type { App_RoutingForms_Form, User } from "@prisma/client";
import async from "async";
import type { ImmutableTree, JsonTree } from "react-awesome-query-builder";
import type { Config } from "react-awesome-query-builder/lib";
import { Utils as QbUtils } from "react-awesome-query-builder/lib";

import dayjs from "@calcom/dayjs";
import type { Tasker } from "@calcom/features/tasker/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import { RaqbLogicResult } from "../lib/evaluateRaqbLogic";
import {
  getTeamMembersWithAttributeOptionValuePerAttribute,
  getAttributesForTeam,
} from "../lib/getAttributes";
import isRouter from "../lib/isRouter";
import jsonLogic from "../lib/jsonLogic";
import type { SerializableField, OrderedResponses } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";
import { acrossQueryValueCompatiblity, raqbQueryValueUtils } from "./raqbUtils";

let tasker: Tasker;

if (typeof window === "undefined") {
  import("@calcom/features/tasker")
    .then((module) => {
      tasker = module.default;
    })
    .catch((error) => {
      console.error("Failed to load tasker:", error);
    });
}

const {
  getAttributesData: getAttributes,
  getAttributesQueryBuilderConfig,
  getAttributesQueryValue,
} = acrossQueryValueCompatiblity;

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

type TeamMemberWithAttributeOptionValuePerAttribute = Awaited<
  ReturnType<typeof getTeamMembersWithAttributeOptionValuePerAttribute>
>[number];

function isOptionsField(field: Pick<SerializableField, "type" | "options">) {
  return (field.type === "select" || field.type === "multiselect") && field.options;
}

function getFieldResponse({
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
 * Performance wrapper for async functions
 */
async function asyncPerf<ReturnValue>(fn: () => Promise<ReturnValue>): Promise<[ReturnValue, number | null]> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

/**
 * Performance wrapper for sync functions
 */
function perf<ReturnValue>(fn: () => ReturnValue): [ReturnValue, number | null] {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return [result, end - start];
}

function getErrorsFromImmutableTree(tree: ImmutableTree) {
  const validatedQueryValue = QbUtils.getTree(tree);
  if (!raqbQueryValueUtils.isQueryValueARuleGroup(validatedQueryValue)) {
    return [];
  }

  if (!validatedQueryValue.children1) {
    return [];
  }

  const errors: string[][] = [];
  Object.values(validatedQueryValue.children1).map((rule) => {
    if (rule.type !== "rule") {
      return;
    }
    const valueError = rule.properties.valueError;
    if (valueError) {
      // Sometimes there are null values in it.
      errors.push(valueError.filter((value) => !!value));
    }
  });
  return errors;
}

function getJsonLogic({
  attributesQueryValue,
  attributesQueryBuilderConfig,
  isPreview,
}: {
  attributesQueryValue: JsonTree;
  attributesQueryBuilderConfig: Config;
  isPreview: boolean;
}) {
  const state = {
    tree: QbUtils.checkTree(
      QbUtils.loadTree(attributesQueryValue),
      // We know that attributesQueryBuilderConfig is a Config because getAttributesQueryBuilderConfig returns a Config. So, asserting it.
      attributesQueryBuilderConfig as unknown as Config
    ),
    config: attributesQueryBuilderConfig as unknown as Config,
  };

  const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
  const logic = jsonLogicQuery.logic;

  // We error only in preview mode to communicate any problem.
  // In live mode, we don't error and instead prefer to let no members match which then causes all of the assignes of the team event to be used.
  if (isPreview) {
    const errors = getErrorsFromImmutableTree(state.tree).flat();
    if (errors.length) {
      throw new Error(errors.toString());
    }
    if (!logic) {
      // Empty children1 is normal where it means that no rules are added by user.
      if (attributesQueryValue.children1 && Object.keys(attributesQueryValue.children1).length > 0) {
        // Possible reasons for this
        // 1. The attribute option value used is not in the options list. Happens if 'Value of field' value is chosen and that field's response value doesn't exist in attribute options list.
        throw new Error("There is some error building the logic, please check the routes.");
      }
    }
  }

  return logic;
}

export const enum TroubleshooterCase {
  EMPTY_QUERY_VALUE = "empty-query-value",
  IS_A_ROUTER = "is-a-router",
  NO_LOGIC_FOUND = "no-logic-found",
  MATCH_RESULTS_READY = "match-results-ready",
  NO_ROUTE_FOUND = "no-route-found",
}

export async function findTeamMembersMatchingAttributeLogicOfRoute(
  {
    form,
    response,
    routeId,
    teamId,
    isPreview,
  }: {
    form: Pick<SerializableForm<App_RoutingForms_Form>, "routes" | "fields">;
    response: FormResponse;
    routeId: string;
    teamId: number;
    isPreview?: boolean;
  },
  config: {
    enablePerf?: boolean;
    concurrency?: number;
    enableTroubleshooter?: boolean;
  } = {}
) {
  const route = form.routes?.find((route) => route.id === routeId);
  // Higher value of concurrency might not be performant as it might overwhelm the system. So, use a lower value as default.
  const { enablePerf = false, concurrency = 2, enableTroubleshooter } = config;

  if (!route) {
    return {
      teamMembersMatchingAttributeLogic: null,
      timeTaken: null,
      troubleshooter: enableTroubleshooter
        ? {
            type: TroubleshooterCase.NO_ROUTE_FOUND,
            data: {
              routeId,
            },
          }
        : null,
    };
  }

  if (isRouter(route)) {
    return {
      teamMembersMatchingAttributeLogic: null,
      timeTaken: null,
      troubleshooter: enableTroubleshooter
        ? {
            type: TroubleshooterCase.IS_A_ROUTER,
            data: {
              routeId,
            },
          }
        : null,
    };
  }

  const teamMembersMatchingAttributeLogicMap = new Map<number, RaqbLogicResult>();

  const [attributesForTeam, getAttributesForTeamTimeTaken] = await aPf(
    async () => await getAttributesForTeam({ teamId: teamId })
  );

  const [attributesQueryValue, getAttributesQueryValueTimeTaken] = pf(() =>
    getAttributesQueryValue({
      attributesQueryValue: route.attributesQueryValue,
      attributes: attributesForTeam,
      response,
      fields: form.fields,
      getFieldResponse,
    })
  );

  if (raqbQueryValueUtils.isQueryValueEmpty(attributesQueryValue)) {
    return {
      teamMembersMatchingAttributeLogic: null,
      timeTaken: {
        gAtr: getAttributesForTeamTimeTaken,
        gQryVal: getAttributesQueryValueTimeTaken,
        gQryCnfg: null,
        gMbrWtAtr: null,
        lgcFrMbrs: null,
      },
      troubleshooter: enableTroubleshooter
        ? {
            type: TroubleshooterCase.EMPTY_QUERY_VALUE,
            data: {
              attributesQueryValue,
            },
          }
        : null,
    };
  }

  const [attributesQueryBuilderConfig, getAttributesQueryBuilderConfigTimeTaken] = pf(() =>
    getAttributesQueryBuilderConfig({
      form,
      attributes: attributesForTeam,
      attributesQueryValue,
    })
  );

  const [
    teamMembersWithAttributeOptionValuePerAttribute,
    getTeamMembersWithAttributeOptionValuePerAttributeTimeTaken,
  ] = await aPf(() => getTeamMembersWithAttributeOptionValuePerAttribute({ teamId: teamId }));

  const logic = getJsonLogic({
    attributesQueryValue: attributesQueryValue as JsonTree,
    attributesQueryBuilderConfig: attributesQueryBuilderConfig as unknown as Config,
    isPreview: !!isPreview,
  });

  if (!logic) {
    return {
      teamMembersMatchingAttributeLogic: null,
      timeTaken: {
        gAtr: getAttributesForTeamTimeTaken,
        gQryCnfg: getAttributesQueryBuilderConfigTimeTaken,
        gMbrWtAtr: getTeamMembersWithAttributeOptionValuePerAttributeTimeTaken,
        lgcFrMbrs: null,
        gQryVal: getAttributesQueryValueTimeTaken,
      },
      troubleshooter: enableTroubleshooter
        ? {
            type: TroubleshooterCase.NO_LOGIC_FOUND,
            data: {
              attributesQueryValue,
              attributesQueryBuilderConfig,
              teamMembersWithAttributeOptionValuePerAttribute,
            },
          }
        : null,
    };
  }

  const attributesDataPerUser = new Map<number, ReturnType<typeof getAttributes>>();

  const [_, teamMembersMatchingAttributeLogicTimeTaken] = await aPf(async () => {
    return await async.mapLimit<TeamMemberWithAttributeOptionValuePerAttribute, Promise<void>>(
      teamMembersWithAttributeOptionValuePerAttribute,
      concurrency,
      async (member: TeamMemberWithAttributeOptionValuePerAttribute) => {
        const attributesData = getAttributes({
          attributesData: member.attributes,
          attributesQueryValue,
        });

        if (enableTroubleshooter) {
          attributesDataPerUser.set(member.userId, attributesData);
        }

        const result = !!jsonLogic.apply(logic as any, attributesData)
          ? RaqbLogicResult.MATCH
          : RaqbLogicResult.NO_MATCH;

        if (result !== RaqbLogicResult.MATCH) {
          return;
        }
        teamMembersMatchingAttributeLogicMap.set(member.userId, result);
      }
    );
  });

  return {
    teamMembersMatchingAttributeLogic: Array.from(teamMembersMatchingAttributeLogicMap).map((item) => ({
      userId: item[0],
      result: item[1],
    })),
    timeTaken: {
      gAtr: getAttributesForTeamTimeTaken,
      gQryCnfg: getAttributesQueryBuilderConfigTimeTaken,
      gMbrWtAtr: getTeamMembersWithAttributeOptionValuePerAttributeTimeTaken,
      lgcFrMbrs: teamMembersMatchingAttributeLogicTimeTaken,
      gQryVal: getAttributesQueryValueTimeTaken,
    },
    troubleshooter: enableTroubleshooter
      ? {
          type: TroubleshooterCase.MATCH_RESULTS_READY,
          data: {
            attributesDataPerUser,
            attributesQueryValue,
            attributesQueryBuilderConfig,
            logic,
            attributesForTeam,
          },
        }
      : null,
  };

  function pf<ReturnValue>(fn: () => ReturnValue): [ReturnValue, number | null] {
    if (!enablePerf) {
      return [fn(), null];
    }
    return perf(fn);
  }

  async function aPf<ReturnValue>(fn: () => Promise<ReturnValue>): Promise<[ReturnValue, number | null]> {
    if (!enablePerf) {
      return [await fn(), null];
    }
    return asyncPerf(fn);
  }
}

export async function onFormSubmission(
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

  const promisesFormSubmittedNoEvent = webhooksFormSubmittedNoEvent.map((webhook) => {
    const scheduledAt = dayjs().add(10, "minute").toDate();
    return tasker.create(
      "triggerFormSubmittedNoEventWebhook",
      {
        responseId,
        form,
        responses: fieldResponsesByIdentifier,
        redirect: chosenAction,
        webhook,
      },
      { scheduledAt }
    );
  });

  const promises = [...promisesFormSubmitted, ...promisesFormSubmittedNoEvent];

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
