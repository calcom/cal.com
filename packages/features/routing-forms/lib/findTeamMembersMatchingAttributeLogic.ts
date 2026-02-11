import { acrossQueryValueCompatiblity, raqbQueryValueUtils } from "@calcom/app-store/_utils/raqb/raqbUtils";
import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import {
  extractAttributeIdsFromQueryValue,
  getAttributesAssignmentData,
} from "@calcom/features/attributes/lib/getAttributes";
import type { RoutingFormTraceService } from "@calcom/features/routing-trace/domains/RoutingFormTraceService";
import { RaqbLogicResult } from "@calcom/lib/raqb/evaluateRaqbLogic";
import jsonLogic from "@calcom/lib/raqb/jsonLogic";
import type { AttributesQueryValue, dynamicFieldValueOperands } from "@calcom/lib/raqb/types";
import async from "async";
import type { ImmutableTree, JsonLogicResult, JsonTree } from "react-awesome-query-builder";
import type { Config } from "react-awesome-query-builder/lib";
import { Utils as QbUtils } from "react-awesome-query-builder/lib";

const {
  getAttributesData: getAttributes,
  getAttributesQueryBuilderConfigHavingListofLabels,
  getAttributesQueryValue,
} = acrossQueryValueCompatiblity;

type TeamMemberWithAttributeOptionValuePerAttribute = Awaited<
  ReturnType<typeof getAttributesAssignmentData>
>["attributesAssignedToTeamMembersWithOptions"][number];

type RunAttributeLogicData = {
  attributesQueryValue: AttributesQueryValue | null;
  attributesData: {
    attributesOfTheOrg: Attribute[];
    teamMembersWithAttributeOptionValuePerAttribute: TeamMemberWithAttributeOptionValuePerAttribute[];
  };
  dynamicFieldValueOperands?: dynamicFieldValueOperands;
};

type RunAttributeLogicOptions = {
  concurrency: number;
  enablePerf: boolean;
  isPreview: boolean;
  enableTroubleshooter: boolean;
};

export enum TroubleshooterCase {
  IS_A_ROUTER = "is-a-router",
  NO_LOGIC_FOUND = "no-logic-found",
  MATCH_RESULTS_READY = "match-results-ready",
  MATCH_RESULTS_READY_WITH_FALLBACK = "match-results-ready-with-fallback",
  MATCHES_ALL_MEMBERS_BECAUSE_OF_EMPTY_QUERY_VALUE = "matches-all-members-because-of-empty-query-value",
  MATCHES_ALL_MEMBERS = "matches-all-members",
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
      errors.push(valueError.filter(Boolean));
    }
  });
  return errors;
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
      QbUtils.loadTree(attributesQueryValue as JsonTree),
      // We know that attributesQueryBuilderConfig is a Config because getAttributesQueryBuilderConfigHavingListofLabels returns a Config. So, asserting it.
      attributesQueryBuilderConfig as unknown as Config
    ),
    config: attributesQueryBuilderConfig as unknown as Config,
  };
  const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
  const logic = jsonLogicQuery.logic;
  // Considering errors as warnings as we want to continue with the flow without throwing actual errors
  // We expect fallback logic to take effect in case of errors in main logic
  const warnings = getErrorsFromImmutableTree(state.tree).flat();
  if (!logic) {
    // If children1 is not empty, it means that some rules were added by use
    if (attributesQueryValue.children1 && Object.keys(attributesQueryValue.children1).length > 0) {
      // Possible reasons for this
      // 1. The attribute option value used is not in the options list. Happens if 'Value of field' value is chosen and that field's response value doesn't exist in attribute options list.
      return { logic, warnings: ["There is some error building the logic, please check the routes."] };
    }
  }

  return { logic, warnings };
}

function buildTroubleshooterData({ type, data }: { type: TroubleshooterCase; data: Record<string, any> }) {
  return {
    troubleshooter: {
      type,
      data,
    },
  };
}

/**
 * Checks if a string is a field template placeholder (e.g., "{field:uuid}")
 */
function isFieldTemplate(str: string): boolean {
  const trimmedStr = str.trim();
  return trimmedStr.startsWith("{field:") && trimmedStr.endsWith("}");
}

/**
 * Extracts field ID from a field template string
 */
function extractFieldIdFromTemplate(template: string): string | null {
  const trimmedTemplate = template.trim();
  if (!isFieldTemplate(trimmedTemplate)) return null;
  return trimmedTemplate.slice(7, -1);
}

/**
 * Resolves a field template to its actual value from the form response
 */
function resolveFieldTemplateValue(
  value: string,
  dynamicFieldValueOperands?: dynamicFieldValueOperands
): string {
  if (!isFieldTemplate(value) || !dynamicFieldValueOperands) {
    return value;
  }

  const fieldId = extractFieldIdFromTemplate(value);
  if (!fieldId) {
    return value;
  }

  const { fields, response } = dynamicFieldValueOperands;
  const field = fields.find((f) => f.id === fieldId);

  if (!field) {
    // Field definition not found - return original template
    return value;
  }

  const fieldResponse = response[field.id];
  if (!fieldResponse) {
    // Field not in response object - return original template
    return value;
  }

  const fieldValue = fieldResponse.value;
  if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
    return "(empty)";
  }

  if (Array.isArray(fieldValue)) {
    return fieldValue.join(", ");
  }

  return String(fieldValue);
}

/**
 * Extracts attribute name/value pairs from a resolved attributesQueryValue.
 * This is used to build the assignment reason string.
 */
function extractAttributeRoutingDetails({
  resolvedAttributesQueryValue,
  attributesOfTheOrg,
  dynamicFieldValueOperands,
}: {
  resolvedAttributesQueryValue: AttributesQueryValue | null;
  attributesOfTheOrg: Attribute[];
  dynamicFieldValueOperands?: dynamicFieldValueOperands;
}): Array<{ attributeName: string; attributeValue: string }> {
  if (!resolvedAttributesQueryValue) {
    return [];
  }

  if (!raqbQueryValueUtils.isQueryValueARuleGroup(resolvedAttributesQueryValue as JsonTree)) {
    return [];
  }

  const children1 = resolvedAttributesQueryValue.children1;
  if (!children1) {
    return [];
  }

  const result: Array<{ attributeName: string; attributeValue: string }> = [];

  for (const ruleId of Object.keys(children1)) {
    const rule = children1[ruleId];
    // Check if it's a rule (has properties with field)
    if (rule.type !== "rule" || !rule.properties) {
      continue;
    }

    const properties = rule.properties;
    const fieldId = properties.field;
    const value = properties.value;

    if (!fieldId || !value || value[0] === null || value[0] === undefined) {
      continue;
    }

    const attribute = attributesOfTheOrg.find((attr) => attr.id === fieldId);
    if (!attribute) {
      continue;
    }

    const attributeValueString = (() => {
      const firstValue = value[0];
      if (Array.isArray(firstValue)) {
        // Handle array values - resolve any field templates within
        const resolvedValues = firstValue.map((v) =>
          typeof v === "string" ? resolveFieldTemplateValue(v, dynamicFieldValueOperands) : String(v)
        );
        return resolvedValues.join(", ");
      }
      const stringValue = String(firstValue);
      // Resolve field template if present
      return resolveFieldTemplateValue(stringValue, dynamicFieldValueOperands);
    })();

    result.push({
      attributeName: attribute.name,
      attributeValue: attributeValueString,
    });
  }

  return result;
}

async function getLogicResultForAllMembers(
  {
    teamMembersWithAttributeOptionValuePerAttribute,
    attributeJsonLogic,
    attributesQueryValue,
  }: {
    teamMembersWithAttributeOptionValuePerAttribute: TeamMemberWithAttributeOptionValuePerAttribute[];
    attributeJsonLogic: NonNullable<JsonLogicResult["logic"]>;
    attributesQueryValue: AttributesQueryValue;
  },
  config: {
    concurrency?: number;
    enableTroubleshooter?: boolean;
  } = {}
) {
  const { concurrency = 2 } = config;
  const teamMembersMatchingAttributeLogicMap = new Map<number, RaqbLogicResult>();
  const attributesDataPerUser = new Map<number, ReturnType<typeof getAttributes>>();

  await async.mapLimit<TeamMemberWithAttributeOptionValuePerAttribute, Promise<void>>(
    teamMembersWithAttributeOptionValuePerAttribute,
    concurrency,
    async (member: TeamMemberWithAttributeOptionValuePerAttribute) => {
      const attributesData = getAttributes({
        attributesData: member.attributes,
        attributesQueryValue,
      });
      attributesDataPerUser.set(member.userId, attributesData);
      const result = jsonLogic.apply(attributeJsonLogic as any, attributesData)
        ? RaqbLogicResult.MATCH
        : RaqbLogicResult.NO_MATCH;

      if (result !== RaqbLogicResult.MATCH) {
        return;
      }
      teamMembersMatchingAttributeLogicMap.set(member.userId, result);
    }
  );

  return {
    teamMembersMatchingAttributeLogicMap,
    attributesDataPerUser,
  };
}

async function runAttributeLogic(data: RunAttributeLogicData, options: RunAttributeLogicOptions) {
  const {
    attributesQueryValue: _attributesQueryValue,
    attributesData: { attributesOfTheOrg, teamMembersWithAttributeOptionValuePerAttribute },
    dynamicFieldValueOperands,
  } = data;
  const { concurrency, enablePerf, enableTroubleshooter } = options;
  const attributesQueryValue = getAttributesQueryValue({
    attributesQueryValue: _attributesQueryValue ?? null,
    attributes: attributesOfTheOrg,
    dynamicFieldValueOperands,
  });

  // TODO: Do we really need to do !attributesQueryValue  check separately?
  if (!attributesQueryValue || raqbQueryValueUtils.isQueryValueEmpty(attributesQueryValue as JsonTree)) {
    return {
      logicBuildingWarnings: null,
      teamMembersMatchingAttributeLogic: null,
      resolvedAttributesQueryValue: null,
      timeTaken: null,
      ...buildTroubleshooterData({
        type: TroubleshooterCase.MATCHES_ALL_MEMBERS_BECAUSE_OF_EMPTY_QUERY_VALUE,
        data: { attributesQueryValue },
      }),
    };
  }

  const [attributesQueryBuilderConfig, ttgetAttributesQueryBuilderConfigHavingListofLabels] = pf(() =>
    getAttributesQueryBuilderConfigHavingListofLabels({
      dynamicFieldValueOperands,
      attributes: attributesOfTheOrg,
    })
  );

  const { logic, warnings: logicBuildingWarnings } = getJsonLogic({
    attributesQueryValue,
    attributesQueryBuilderConfig: attributesQueryBuilderConfig as unknown as Config,
  });

  if (!logic) {
    return {
      teamMembersMatchingAttributeLogic: null,
      logicBuildingWarnings: null,
      resolvedAttributesQueryValue: attributesQueryValue,
      timeTaken: {
        ttgetAttributesQueryBuilderConfigHavingListofLabels,
      },
      ...buildTroubleshooterData({
        type: TroubleshooterCase.NO_LOGIC_FOUND,
        data: {
          attributesQueryValue,
          attributesQueryBuilderConfig,
          teamMembersWithAttributeOptionValuePerAttribute,
        },
      }),
    };
  }

  const [
    { teamMembersMatchingAttributeLogicMap, attributesDataPerUser },
    ttTeamMembersMatchingAttributeLogic,
  ] = await aPf(async () =>
    getLogicResultForAllMembers(
      {
        teamMembersWithAttributeOptionValuePerAttribute,
        attributeJsonLogic: logic,
        attributesQueryValue,
      },
      {
        concurrency,
        enableTroubleshooter,
      }
    )
  );

  const teamMembersMatchingAttributeLogic = Array.from(teamMembersMatchingAttributeLogicMap).map((item) => ({
    userId: item[0],
    result: item[1],
  }));

  return {
    teamMembersMatchingAttributeLogic,
    logicBuildingWarnings,
    resolvedAttributesQueryValue: attributesQueryValue,
    timeTaken: {
      ttgetAttributesQueryBuilderConfigHavingListofLabels,
      ttTeamMembersMatchingAttributeLogic,
    },
    ...buildTroubleshooterData({
      type: TroubleshooterCase.MATCH_RESULTS_READY,
      data: {
        attributesDataPerUser,
        attributesQueryValue,
        attributesQueryBuilderConfig,
        logic,
        attributesOfTheOrg,
      },
    }),
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

async function runMainAttributeLogic(data: RunAttributeLogicData, options: RunAttributeLogicOptions) {
  const { teamMembersMatchingAttributeLogic, ...rest } = await runAttributeLogic(data, options);
  return {
    teamMembersMatchingMainAttributeLogic: teamMembersMatchingAttributeLogic,
    ...rest,
  };
}

async function runFallbackAttributeLogic(data: RunAttributeLogicData, options: RunAttributeLogicOptions) {
  const { teamMembersMatchingAttributeLogic, ...rest } = await runAttributeLogic(data, options);
  return {
    teamMembersMatchingFallbackLogic: teamMembersMatchingAttributeLogic,
    ...rest,
  };
}

export async function getAttributesForLogic({
  teamId,
  orgId,
  attributeIds,
}: {
  teamId: number;
  orgId: number;
  /** If provided, only fetch attribute assignments for these attribute IDs.
   * This significantly improves performance when only a few attributes are needed. */
  attributeIds?: string[];
}) {
  const [result, ttAttributes] = await asyncPerf(async () => {
    return getAttributesAssignmentData({ teamId, orgId, attributeIds });
  });

  return {
    attributesOfTheOrg: result.attributesOfTheOrg,
    teamMembersWithAttributeOptionValuePerAttribute: result.attributesAssignedToTeamMembersWithOptions,
    timeTaken: ttAttributes,
  };
}

export async function findTeamMembersMatchingAttributeLogic(
  data: {
    teamId: number;
    orgId: number;
    attributesQueryValue: AttributesQueryValue | null;
    fallbackAttributesQueryValue?: AttributesQueryValue | null;
    dynamicFieldValueOperands?: dynamicFieldValueOperands;
    isPreview?: boolean;
    routeName?: string;
    routeIsFallback?: boolean;
  },
  options: {
    enablePerf?: boolean;
    concurrency?: number;
    enableTroubleshooter?: boolean;
    routingFormTraceService?: RoutingFormTraceService;
  } = {}
) {
  // Higher value of concurrency might not be performant as it might overwhelm the system. So, use a lower value as default.
  const {
    enablePerf = false,
    concurrency = 2,
    enableTroubleshooter = false,
    routingFormTraceService,
  } = options;

  // Any explicit value being passed should cause fallback to be considered. Even undefined
  const considerFallback = "fallbackAttributesQueryValue" in data;

  const {
    teamId,
    orgId,
    attributesQueryValue,
    fallbackAttributesQueryValue,
    dynamicFieldValueOperands,
    isPreview,
    routeName,
    routeIsFallback,
  } = data;

  // Extract attribute IDs from the routing rules to only fetch necessary data
  const attributeIds = extractAttributeIdsFromQueryValue(attributesQueryValue, fallbackAttributesQueryValue);

  const {
    attributesOfTheOrg,
    teamMembersWithAttributeOptionValuePerAttribute,
    timeTaken: ttGetAttributesForLogic,
  } = await getAttributesForLogic({
    teamId,
    orgId,
    // Only pass attributeIds if we found some - otherwise fetch all (backwards compatible)
    attributeIds: attributeIds.length > 0 ? attributeIds : undefined,
  });

  const runAttributeLogicOptions = {
    concurrency,
    enablePerf,
    isPreview: !!isPreview,
    enableTroubleshooter,
  };

  const runAttributeLogicData: Omit<RunAttributeLogicData, "attributesQueryValue"> = {
    // Change it as per the main/fallback query
    attributesData: {
      attributesOfTheOrg,
      teamMembersWithAttributeOptionValuePerAttribute,
    },
    dynamicFieldValueOperands,
  };

  const {
    teamMembersMatchingMainAttributeLogic,
    timeTaken: teamMembersMatchingMainAttributeLogicTimeTaken,
    troubleshooter,
    logicBuildingWarnings: mainAttributeLogicBuildingWarnings,
    resolvedAttributesQueryValue,
  } = await runMainAttributeLogic(
    {
      ...runAttributeLogicData,
      attributesQueryValue: attributesQueryValue,
    },
    runAttributeLogicOptions
  );

  // Helper to add trace step for attribute logic evaluation
  const addTraceStep = (checkedFallback: boolean) => {
    if (routingFormTraceService) {
      const attributeRoutingDetails = extractAttributeRoutingDetails({
        resolvedAttributesQueryValue,
        attributesOfTheOrg,
        dynamicFieldValueOperands,
      });

      routingFormTraceService.attributeLogicEvaluated({
        routeName,
        routeIsFallback,
        checkedFallback,
        attributeRoutingDetails,
      });
    }
  };

  // It being null means that no logic was found and thus all members match. In such case, we don't fallback intentionally.
  // This is the case when user added no rules so, he expects to match all members
  if (!teamMembersMatchingMainAttributeLogic) {
    addTraceStep(false);
    return {
      teamMembersMatchingAttributeLogic: null,
      checkedFallback: false,
      mainAttributeLogicBuildingWarnings,
      fallbackAttributeLogicBuildingWarnings: [],
      routeName,
      routeIsFallback,
      timeTaken: {
        ...teamMembersMatchingMainAttributeLogicTimeTaken,
        ttGetAttributesForLogic,
      },
      ...(enableTroubleshooter
        ? buildTroubleshooterData({
            ...troubleshooter,
          })
        : null),
    };
  }

  const noMatchingMembersFound = !teamMembersMatchingMainAttributeLogic.length;

  if (noMatchingMembersFound && considerFallback) {
    const {
      teamMembersMatchingFallbackLogic,
      timeTaken: teamMembersMatchingFallbackLogicTimeTaken,
      troubleshooter,
      logicBuildingWarnings: fallbackAttributeLogicBuildingWarnings,
    } = await runFallbackAttributeLogic(
      {
        ...runAttributeLogicData,
        attributesQueryValue: fallbackAttributesQueryValue ?? null,
      },
      runAttributeLogicOptions
    );

    addTraceStep(true);
    return {
      teamMembersMatchingAttributeLogic: teamMembersMatchingFallbackLogic,
      checkedFallback: true,
      fallbackAttributeLogicBuildingWarnings,
      mainAttributeLogicBuildingWarnings,
      routeName,
      routeIsFallback,
      timeTaken: {
        ...teamMembersMatchingFallbackLogicTimeTaken,
        ttGetAttributesForLogic,
      },
      ...(enableTroubleshooter
        ? buildTroubleshooterData({
            ...troubleshooter,
            type: TroubleshooterCase.MATCH_RESULTS_READY_WITH_FALLBACK,
          })
        : null),
    };
  }

  addTraceStep(false);
  return {
    teamMembersMatchingAttributeLogic: teamMembersMatchingMainAttributeLogic,
    checkedFallback: false,
    mainAttributeLogicBuildingWarnings,
    fallbackAttributeLogicBuildingWarnings: [],
    routeName,
    routeIsFallback,
    timeTaken: {
      ...teamMembersMatchingMainAttributeLogicTimeTaken,
      ttGetAttributesForLogic,
    },
    ...(enableTroubleshooter
      ? buildTroubleshooterData({
          ...troubleshooter,
          type: TroubleshooterCase.MATCH_RESULTS_READY,
          data: {
            ...troubleshooter.data,
            attributesOfTheOrg,
          },
        })
      : null),
  };
}
