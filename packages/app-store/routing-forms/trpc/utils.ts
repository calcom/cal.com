import type { App_RoutingForms_Form, User } from "@prisma/client";
import async from "async";
import { Config, Utils as QbUtils } from "react-awesome-query-builder";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import { RaqbLogicResult } from "../lib/evaluateRaqbLogic";
import {
  getTeamMembersWithAttributeOptionValuePerAttribute,
  getAttributesForTeam,
} from "../lib/getAttributes";
import isRouter from "../lib/isRouter";
import jsonLogic from "../lib/jsonLogic";
import type { SerializableField, OrderedResponses, AttributesQueryValue } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";
import { acrossQueryValueCompatiblity } from "./raqbUtils";

const {
  getAttributesData: getAttributes,
  getAttributesQueryBuilderConfig,
  getAttributesQueryValue,
} = acrossQueryValueCompatiblity;

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/trpc/utils"] });

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

function getJsonLogic({
  attributesQueryValue,
  attributesQueryBuilderConfig,
}: {
  attributesQueryValue: AttributesQueryValue;
  attributesQueryBuilderConfig: Config;
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
  if (!logic) {
    if (attributesQueryValue.children1 && Object.keys(attributesQueryValue.children1).length > 0) {
      throw new Error("Couldn't build the logic from the query value");
    }
    console.log(
      "No logic found",
      safeStringify({ attributesQueryValue, queryBuilderConfigFields: attributesQueryBuilderConfig.fields })
    );
  }
  console.log("Using LOGIC", safeStringify(logic));
  return logic;
}

export async function findTeamMembersMatchingAttributeLogicOfRoute(
  {
    form,
    response,
    routeId,
    teamId,
  }: {
    form: Pick<SerializableForm<App_RoutingForms_Form>, "routes" | "fields">;
    response: FormResponse;
    routeId: string;
    teamId: number;
  },
  config: {
    enablePerf?: boolean;
    concurrency?: number;
  } = {}
) {
  const route = form.routes?.find((route) => route.id === routeId);

  // Higher value of concurrency might not be performant as it might overwhelm the system. So, use a lower value as default.
  const { enablePerf = false, concurrency = 2 } = config;

  if (!route) {
    return {
      teamMembersMatchingAttributeLogic: null,
      timeTaken: null,
    };
  }

  if (isRouter(route)) {
    return {
      teamMembersMatchingAttributeLogic: null,
      timeTaken: null,
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

  if (!attributesQueryValue) {
    return {
      teamMembersMatchingAttributeLogic: null,
      timeTaken: {
        gAtr: getAttributesForTeamTimeTaken,
        gQryVal: getAttributesQueryValueTimeTaken,
        gQryCnfg: null,
        gMbrWtAtr: null,
        lgcFrMbrs: null,
      },
    };
  }

  const [attributesQueryBuilderConfig, getAttributesQueryBuilderConfigTimeTaken] = pf(() =>
    getAttributesQueryBuilderConfig({
      form,
      attributes: attributesForTeam,
      attributesQueryValue,
    })
  );

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

  const [
    teamMembersWithAttributeOptionValuePerAttribute,
    getTeamMembersWithAttributeOptionValuePerAttributeTimeTaken,
  ] = await aPf(() => getTeamMembersWithAttributeOptionValuePerAttribute({ teamId: teamId }));

  const logic = getJsonLogic({
    attributesQueryValue,
    attributesQueryBuilderConfig: attributesQueryBuilderConfig as unknown as Config,
  });

  if (!logic) {
    return {
      teamMembersMatchingAttributeLogic: [],
      timeTaken: {
        gAtr: getAttributesForTeamTimeTaken,
        gQryCnfg: getAttributesQueryBuilderConfigTimeTaken,
        gMbrWtAtr: getTeamMembersWithAttributeOptionValuePerAttributeTimeTaken,
        lgcFrMbrs: null,
        gQryVal: getAttributesQueryValueTimeTaken,
      },
    };
  }

  const [_, teamMembersMatchingAttributeLogicTimeTaken] = await aPf(async () => {
    return await async.mapLimit<TeamMemberWithAttributeOptionValuePerAttribute, Promise<void>>(
      teamMembersWithAttributeOptionValuePerAttribute,
      concurrency,
      async (member: TeamMemberWithAttributeOptionValuePerAttribute) => {
        const attributesData = getAttributes({
          attributesData: member.attributes,
          attributesQueryValue,
        });

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
