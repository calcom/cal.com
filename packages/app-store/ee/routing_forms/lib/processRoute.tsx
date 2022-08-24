import jsonLogic from "json-logic-js";
import { Utils as QbUtils } from "react-awesome-query-builder";

import { getQueryBuilderConfig } from "../pages/route-builder/[...appPages]";
import { Response, Route, SerializableForm } from "../types/types";
import { App_RoutingForms_Form } from ".prisma/client";

export function processRoute({
  form,
  response,
}: {
  form: SerializableForm<App_RoutingForms_Form>;
  response: Record<string, Pick<Response[string], "value">>;
}) {
  const queryBuilderConfig = getQueryBuilderConfig(form);

  const routes = form.routes || [];

  let decidedAction: Route["action"] | null = null;

  const fallbackRoute = routes.find((route) => route.isFallback);

  if (!fallbackRoute) {
    throw new Error("Fallback route is missing");
  }

  const reorderedRoutes = routes.filter((route) => !route.isFallback).concat([fallbackRoute]);

  reorderedRoutes.some((route) => {
    if (!route) {
      return false;
    }
    const state = {
      tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), queryBuilderConfig),
      config: queryBuilderConfig,
    };
    const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
    const logic = jsonLogicQuery.logic;
    let result = false;
    const responseValues: Record<string, string | string[]> = {};
    for (const [uuid, { value }] of Object.entries(response)) {
      responseValues[uuid] = value;
    }

    if (logic) {
      // Leave the logs for easy debugging of routing form logic test.
      console.log("Checking logic with response", logic, responseValues);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = jsonLogic.apply(logic as any, responseValues);
    } else {
      // If no logic is provided, then consider it a match
      result = true;
    }
    if (result) {
      decidedAction = route.action;
      return true;
    }
  });

  if (!decidedAction) {
    return null;
  }

  // Without type assertion, it is never. See why https://github.com/microsoft/TypeScript/issues/16928
  return decidedAction as Route["action"];
}
