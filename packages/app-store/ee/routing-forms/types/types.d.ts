import { App_RoutingForms_Form } from "@prisma/client";
import z from "zod";

import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import { zodRouterRouteView, zodNonRouterRoute, zodFieldsView, zodRoutesView } from "../zod";

export type Response = Record<
  // Field ID
  string,
  {
    value: string | string[];
    label: string;
  }
>;

export type Fields = z.infer<typeof zodFieldsView>;
export type Field = Fields[number];
export type Routes = z.infer<typeof zodRoutesView>;
export type Route = Routes[0];
export type SerializableForm<T extends App_RoutingForms_Form> = Omit<
  T,
  "fields" | "routes" | "createdAt" | "updatedAt" | "settings"
> & {
  routes: Routes;
  fields: Fields;
  settings: z.infer<typeof RoutingFormSettings>;
  createdAt: string;
  updatedAt: string;
  connectedForms: { name: string; description: string | null; id: string }[];
  routers: { name: string; description: string | null; id: string }[];
};

export type LocalRoute = z.infer<typeof zodNonRouterRoute>;
export type GlobalRoute = z.infer<typeof zodRouterRouteView>;

export type SerializableRoute =
  | (LocalRoute & {
      queryValue: LocalRoute["queryValue"];
      isFallback?: LocalRoute["isFallback"];
    })
  | GlobalRoute;
