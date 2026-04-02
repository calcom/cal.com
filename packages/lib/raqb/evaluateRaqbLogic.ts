"use client";

import { safeStringify } from "@calcom/lib/safeStringify";
import { type JsonTree, Utils as QbUtils } from "react-awesome-query-builder";
import jsonLogic from "./jsonLogic";

export enum RaqbLogicResult {
  MATCH = "MATCH",
  NO_MATCH = "NO_MATCH",
  LOGIC_NOT_FOUND_SO_MATCHED = "LOGIC_NOT_FOUND_SO_MATCHED",
}

export const evaluateRaqbLogic = (
  {
    queryValue,
    queryBuilderConfig,
    data,
    beStrictWithEmptyLogic = false,
  }: {
    queryValue: JsonTree;
    queryBuilderConfig: any;
    data: Record<string, unknown>;
    beStrictWithEmptyLogic?: boolean;
  },
  config: {
    // 2 - Error/Warning
    // 1 - Info
    // 0 - Debug
    logLevel: 0 | 1 | 2;
  } = {
    logLevel: 1,
  }
): RaqbLogicResult => {
  const state = {
    tree: QbUtils.checkTree(QbUtils.loadTree(queryValue), queryBuilderConfig),
    config: queryBuilderConfig,
  };
  const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
  const logic = jsonLogicQuery.logic;
  if (!logic) {
    if (beStrictWithEmptyLogic && queryValue.children1 && Object.keys(queryValue.children1).length > 0) {
      throw new Error("Couldn't build the logic from the query value");
    }
    console.log(
      "No logic found",
      safeStringify({ queryValue, queryBuilderConfigFields: queryBuilderConfig.fields })
    );
    // If no logic is provided, then consider it a match
    return RaqbLogicResult.LOGIC_NOT_FOUND_SO_MATCHED;
  }

  if (config.logLevel >= 1) {
    console.log("Checking logic with data", safeStringify({ logic, data }));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jsonLogic.apply(logic as any, data) ? RaqbLogicResult.MATCH : RaqbLogicResult.NO_MATCH;
};
