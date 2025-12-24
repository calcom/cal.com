"use client";

/**
 * Client-only RAQB utilities that require the react-awesome-query-builder runtime.
 * These functions should only be imported in client-side React components.
 */
import type { JsonTree } from "react-awesome-query-builder";
import type { Config } from "react-awesome-query-builder";
import { Utils as QbUtils } from "react-awesome-query-builder";

export function buildEmptyQueryValue() {
  return { id: QbUtils.uuid(), type: "group" as const };
}

export const buildStateFromQueryValue = ({
  queryValue,
  config,
}: {
  /**
   * Allow null as the queryValue as initially there could be no queryValue and without that we can't build the state and can't show the UI
   */
  queryValue: JsonTree | null;
  config: Config;
}) => {
  const queryValueToUse = queryValue || buildEmptyQueryValue();
  const immutableTree = QbUtils.checkTree(QbUtils.loadTree(queryValueToUse), config);
  return {
    state: {
      tree: immutableTree,
      config,
    },
    queryValue: QbUtils.getTree(immutableTree),
  };
};
