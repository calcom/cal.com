"use client";

import { Utils as QbUtils, type JsonTree } from "react-awesome-query-builder";
import jsonLogic from "./jsonLogicOverrides";
import { safeStringify } from "@calcom/lib/safeStringify";

export const evaluateRaqbLogic = ({
  queryValue,
  queryBuilderConfig,
  data,
}: {
  queryValue: JsonTree;
  queryBuilderConfig: any;
  data: Record<string, unknown>;
}, callback?: (params: { logic: Object }) => Object) => {
  const state = {
    tree: QbUtils.checkTree(QbUtils.loadTree(queryValue), queryBuilderConfig),
    config: queryBuilderConfig,
  };
  const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
  const logic = jsonLogicQuery.logic;
  if (!logic) {
    console.log("No logic found", safeStringify({ queryValue, queryBuilderConfig }));
    // If no logic is provided, then consider it a match
    return true;
  }
  const updatedLogic = callback ? callback({ logic }) : logic;
  console.log("Checking logic with data", safeStringify({ updatedLogic, data }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jsonLogic.apply(updatedLogic as any, data);
};
