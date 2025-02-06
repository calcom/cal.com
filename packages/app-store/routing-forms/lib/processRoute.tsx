"use client";

import type { App_RoutingForms_Form } from "@prisma/client";
import type { JsonTree } from "react-awesome-query-builder";
import type { z } from "zod";

import { evaluateRaqbLogic, RaqbLogicResult } from "@calcom/lib/raqb/evaluateRaqbLogic";

import type { FormResponse, Route, SerializableForm } from "../types/types";
import type { zodNonRouterRoute } from "../zod";
import { getQueryBuilderConfigForFormFields } from "./getQueryBuilderConfig";
import { isFallbackRoute } from "./isFallbackRoute";
import isRouter from "./isRouter";

export function findMatchingRoute({
  form,
  response,
}: {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "routes" | "fields">;
  response: Record<string, Pick<FormResponse[string], "value">>;
}) {
  const queryBuilderConfig = getQueryBuilderConfigForFormFields(form);

  const routes = form.routes || [];

  let chosenRoute: Route | null = null;

  const fallbackRoute = routes.find(isFallbackRoute);

  if (!fallbackRoute) {
    throw new Error("Fallback route is missing");
  }

  const routesWithFallbackInEnd = routes
    .flatMap((r) => {
      // For a router, use it's routes instead.
      if (isRouter(r)) return r.routes;
      return r;
    })
    // Use only non fallback routes
    .filter((route) => route && !isFallbackRoute(route))
    // After above flat map, all routes are non router routes.
    .concat([fallbackRoute]) as z.infer<typeof zodNonRouterRoute>[];

  for (const route of routesWithFallbackInEnd) {
    if (!route) {
      continue;
    }

    const responseValues: Record<string, FormResponse[string]["value"]> = Object.fromEntries(
      Object.entries(response).map(([uuid, { value }]) => [uuid, value])
    );

    const result = evaluateRaqbLogic({
      queryValue: route.queryValue as JsonTree,
      queryBuilderConfig,
      data: responseValues,
    });

    if (result === RaqbLogicResult.MATCH || result === RaqbLogicResult.LOGIC_NOT_FOUND_SO_MATCHED) {
      chosenRoute = route;
      break;
    }
  }

  if (!chosenRoute) {
    return null;
  }

  return chosenRoute;
}
