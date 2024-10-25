import type { App_RoutingForms_Form } from "@prisma/client";
import async from "async";
import type { ImmutableTree, JsonLogicResult, JsonTree } from "react-awesome-query-builder";
import type { Config } from "react-awesome-query-builder/lib";
import { Utils as QbUtils } from "react-awesome-query-builder/lib";

import { getFieldResponse } from "../trpc/utils";
import type { Attribute, AttributesQueryValue } from "../types/types";
import type { FormResponse, SerializableForm } from "../types/types";
import { RaqbLogicResult } from "./evaluateRaqbLogic";
import { getTeamMembersWithAttributeOptionValuePerAttribute, getAttributesForTeam } from "./getAttributes";
import isRouter from "./isRouter";
import jsonLogic from "./jsonLogic";
import { acrossQueryValueCompatiblity, raqbQueryValueUtils } from "./raqbUtils";

const {
  getAttributesData: getAttributes,
  getAttributesQueryBuilderConfig,
  getAttributesQueryValue,
} = acrossQueryValueCompatiblity;

type RunAttributeLogicData = {
  attributesQueryValue: AttributesQueryValue | undefined;
  attributesForTeam: Attribute[];
  form: Pick<SerializableForm<App_RoutingForms_Form>, "fields">;
  teamId: number;
  response: FormResponse;
};

type RunAttributeLogicOptions = {
  concurrency: number;
  enablePerf: boolean;
  isPreview: boolean;
  enableTroubleshooter: boolean;
};
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
  MATCH_RESULTS_READY_WITH_FALLBACK = "match-results-ready-with-fallback",
  NO_FALLBACK_LOGIC_FOUND = "no-fallback-logic-found",
  NO_ROUTE_FOUND = "no-route-found",
  MATCHES_ALL_MEMBERS = "matches-all-members",
}

function buildTroubleshooterData({ type, data }: { type: TroubleshooterCase; data: Record<string, any> }) {
  return {
    troubleshooter: {
      type,
      data,
    },
  };
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
    concurrency: number;
    enableTroubleshooter: boolean;
  }
) {
  const { concurrency, enableTroubleshooter } = config;
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

      if (enableTroubleshooter) {
        attributesDataPerUser.set(member.userId, attributesData);
      }

      const result = !!jsonLogic.apply(attributeJsonLogic as any, attributesData)
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
  const { attributesQueryValue: _attributesQueryValue, attributesForTeam, form, teamId, response } = data;
  const { concurrency, enablePerf, isPreview, enableTroubleshooter } = options;
  const [attributesQueryValue, ttGetAttributesQueryValue] = pf(() =>
    getAttributesQueryValue({
      attributesQueryValue: _attributesQueryValue,
      attributes: attributesForTeam,
      response,
      fields: form.fields,
      getFieldResponse,
    })
  );

  if (raqbQueryValueUtils.isQueryValueEmpty(attributesQueryValue)) {
    return {
      teamMembersMatchingAttributeLogic: null,
      ...buildTroubleshooterData({
        type: TroubleshooterCase.EMPTY_QUERY_VALUE,
        data: { attributesQueryValue },
      }),
      timeTaken: {
        ttGetAttributesQueryValue,
      },
    };
  }

  const [attributesQueryBuilderConfig, ttGetAttributesQueryBuilderConfig] = pf(() =>
    getAttributesQueryBuilderConfig({
      form,
      attributes: attributesForTeam,
      attributesQueryValue,
    })
  );

  const [
    teamMembersWithAttributeOptionValuePerAttribute,
    ttGetTeamMembersWithAttributeOptionValuePerAttribute,
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
        ttGetAttributesQueryValue,
        ttGetAttributesQueryBuilderConfig,
        ttGetTeamMembersWithAttributeOptionValuePerAttribute,
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
    timeTaken: {
      ttGetAttributesQueryBuilderConfig,
      ttGetTeamMembersWithAttributeOptionValuePerAttribute,
      ttTeamMembersMatchingAttributeLogic,
      ttGetAttributesQueryValue,
    },
    ...buildTroubleshooterData({
      type: TroubleshooterCase.MATCH_RESULTS_READY,
      data: {
        attributesDataPerUser,
        attributesQueryValue,
        attributesQueryBuilderConfig,
        logic,
        attributesForTeam,
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
  const result = await runAttributeLogic(data, options);
  return {
    teamMembersMatchingMainAttributeLogic: result.teamMembersMatchingAttributeLogic,
    timeTaken: result.timeTaken,
    troubleshooter: result.troubleshooter,
  };
}

async function runFallbackAttributeLogic(data: RunAttributeLogicData, options: RunAttributeLogicOptions) {
  const result = await runAttributeLogic(data, options);
  return {
    teamMembersMatchingFallbackLogic: result.teamMembersMatchingAttributeLogic,
    timeTaken: result.timeTaken,
    troubleshooter: result.troubleshooter,
  };
}

export async function findTeamMembersMatchingAttributeLogicOfRoute(
  {
    form,
    response,
    routeId,
    teamId,
    isPreview = false,
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
  const { enablePerf = false, concurrency = 2, enableTroubleshooter = false } = config;

  if (!route) {
    return {
      teamMembersMatchingAttributeLogic: null,
      checkedFallback: false,
      timeTaken: null,
      ...buildTroubleshooterData({
        type: TroubleshooterCase.NO_ROUTE_FOUND,
        data: { routeId },
      }),
    };
  }

  if (isRouter(route)) {
    return {
      teamMembersMatchingAttributeLogic: null,
      checkedFallback: false,
      timeTaken: null,
      ...buildTroubleshooterData({
        type: TroubleshooterCase.IS_A_ROUTER,
        data: { routeId },
      }),
    };
  }

  const [attributesForTeam, getAttributesForTeamTimeTaken] = await aPf(
    async () => await getAttributesForTeam({ teamId: teamId })
  );

  const attributeRunningOptions = {
    concurrency,
    enablePerf,
    isPreview,
    enableTroubleshooter,
  };

  const attributeRunningData = {
    attributesForTeam,
    form,
    teamId,
    response,
  };

  const {
    teamMembersMatchingMainAttributeLogic,
    timeTaken: teamMembersMatchingMainAttributeLogicTimeTaken,
    troubleshooter,
  } = await runMainAttributeLogic(
    {
      attributesQueryValue: route.attributesQueryValue,
      ...attributeRunningData,
    },
    attributeRunningOptions
  );

  if (!teamMembersMatchingMainAttributeLogic) {
    return {
      teamMembersMatchingAttributeLogic: null,
      checkedFallback: false,
      timeTaken: {
        ...teamMembersMatchingMainAttributeLogicTimeTaken,
        getAttributesForTeamTimeTaken,
      },
      ...(enableTroubleshooter
        ? buildTroubleshooterData({
            ...troubleshooter,
            type: TroubleshooterCase.MATCHES_ALL_MEMBERS,
          })
        : null),
    };
  }

  if (!teamMembersMatchingMainAttributeLogic.length) {
    const {
      teamMembersMatchingFallbackLogic,
      timeTaken: teamMembersMatchingFallbackLogicTimeTaken,
      troubleshooter,
    } = await runFallbackAttributeLogic(
      {
        attributesQueryValue: route.fallbackAttributesQueryValue,
        ...attributeRunningData,
      },
      attributeRunningOptions
    );

    return {
      teamMembersMatchingAttributeLogic: teamMembersMatchingFallbackLogic,
      checkedFallback: true,
      timeTaken: {
        ...teamMembersMatchingFallbackLogicTimeTaken,
        getAttributesForTeamTimeTaken,
      },
      ...(enableTroubleshooter
        ? buildTroubleshooterData({
            ...troubleshooter,
            type: TroubleshooterCase.MATCH_RESULTS_READY_WITH_FALLBACK,
          })
        : null),
    };
  }

  return {
    teamMembersMatchingAttributeLogic: teamMembersMatchingMainAttributeLogic,
    checkedFallback: false,
    timeTaken: {
      ...teamMembersMatchingMainAttributeLogicTimeTaken,
      getAttributesForTeamTimeTaken,
    },
    ...(enableTroubleshooter
      ? buildTroubleshooterData({
          ...troubleshooter,
          type: TroubleshooterCase.MATCH_RESULTS_READY,
          data: {
            ...troubleshooter.data,
            attributesForTeam,
          },
        })
      : null),
  };

  async function aPf<ReturnValue>(fn: () => Promise<ReturnValue>): Promise<[ReturnValue, number | null]> {
    if (!enablePerf) {
      return [await fn(), null];
    }
    return asyncPerf(fn);
  }
}
