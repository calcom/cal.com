import type { App_RoutingForms_Form } from "@prisma/client";
import async from "async";
import type { ImmutableTree, JsonLogicResult, JsonTree } from "react-awesome-query-builder";
import type { Config } from "react-awesome-query-builder/lib";
import { Utils as QbUtils } from "react-awesome-query-builder/lib";

import { getFieldResponse } from "../trpc/utils";
import type { Attribute, AttributesQueryValue, Route } from "../types/types";
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

type TeamMemberWithAttributeOptionValuePerAttribute = Awaited<
  ReturnType<typeof getTeamMembersWithAttributeOptionValuePerAttribute>
>[number];

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

export const enum TroubleshooterCase {
  EMPTY_QUERY_VALUE = "empty-query-value",
  IS_A_ROUTER = "is-a-router",
  NO_LOGIC_FOUND = "no-logic-found",
  MATCH_RESULTS_READY = "match-results-ready",
  MATCH_RESULTS_READY_WITH_FALLBACK = "match-results-ready-with-fallback",
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
      logicBuildingWarnings: null,
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

  const { logic, warnings: logicBuildingWarnings } = getJsonLogic({
    attributesQueryValue: attributesQueryValue as JsonTree,
    attributesQueryBuilderConfig: attributesQueryBuilderConfig as unknown as Config,
    isPreview: !!isPreview,
  });

  if (!logic) {
    return {
      teamMembersMatchingAttributeLogic: null,
      logicBuildingWarnings: null,
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
    logicBuildingWarnings,
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

export async function findTeamMembersMatchingAttributeLogicOfRoute(
  {
    form,
    response,
    route,
    teamId,
    isPreview = false,
  }: {
    form: Pick<SerializableForm<App_RoutingForms_Form>, "fields">;
    response: FormResponse;
    route: Route;
    teamId: number;
    isPreview?: boolean;
  },
  options: {
    enablePerf?: boolean;
    concurrency?: number;
    enableTroubleshooter?: boolean;
  } = {}
) {
  // Higher value of concurrency might not be performant as it might overwhelm the system. So, use a lower value as default.
  const { enablePerf = false, concurrency = 2, enableTroubleshooter = false } = options;

  const checkedFallback = false;

  if (isRouter(route)) {
    return {
      teamMembersMatchingAttributeLogic: null,
      mainAttributeLogicBuildingWarnings: null,
      fallbackAttributeLogicBuildingWarnings: null,
      checkedFallback,
      timeTaken: null,
      ...buildTroubleshooterData({
        type: TroubleshooterCase.IS_A_ROUTER,
        data: { route },
      }),
    };
  }

  const [attributesForTeam, getAttributesForTeamTimeTaken] = await aPf(
    async () => await getAttributesForTeam({ teamId: teamId })
  );

  const runAttributeLogicOptions = {
    concurrency,
    enablePerf,
    isPreview,
    enableTroubleshooter,
  };

  const runAttributeLogicData = {
    // Change it as per the main/fallback query
    attributesQueryValue: null,
    attributesForTeam,
    form,
    teamId,
    response,
  };

  const {
    teamMembersMatchingMainAttributeLogic,
    timeTaken: teamMembersMatchingMainAttributeLogicTimeTaken,
    troubleshooter,
    logicBuildingWarnings: mainAttributeLogicBuildingWarnings,
  } = await runMainAttributeLogic(
    {
      ...runAttributeLogicData,
      attributesQueryValue: route.attributesQueryValue,
    },
    runAttributeLogicOptions
  );

  // It being null means that no logic was found and thus all members match. In such case, we don't fallback intentionally.
  // This is the case when user added no rules so, he expects to match all members
  if (!teamMembersMatchingMainAttributeLogic) {
    return {
      teamMembersMatchingAttributeLogic: null,
      checkedFallback,
      mainAttributeLogicBuildingWarnings,
      fallbackAttributeLogicBuildingWarnings: [],
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

  const noMatchingMembersFound = !teamMembersMatchingMainAttributeLogic.length;

  if (noMatchingMembersFound) {
    const {
      teamMembersMatchingFallbackLogic,
      timeTaken: teamMembersMatchingFallbackLogicTimeTaken,
      troubleshooter,
      logicBuildingWarnings: fallbackAttributeLogicBuildingWarnings,
    } = await runFallbackAttributeLogic(
      {
        ...runAttributeLogicData,
        attributesQueryValue: route.fallbackAttributesQueryValue,
      },
      runAttributeLogicOptions
    );

    return {
      teamMembersMatchingAttributeLogic: teamMembersMatchingFallbackLogic,
      checkedFallback: true,
      fallbackAttributeLogicBuildingWarnings,
      mainAttributeLogicBuildingWarnings,
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
    checkedFallback,
    mainAttributeLogicBuildingWarnings,
    fallbackAttributeLogicBuildingWarnings: [],
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
