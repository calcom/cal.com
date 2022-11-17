import { App_RoutingForms_Form, App_RoutingForms_Router } from "@prisma/client";
import z from "zod";

import { RoutingFormSettings, RoutingFormUsedByForms } from "@calcom/prisma/zod-utils";

import { zodFieldsView, zodRoutesView } from "../zod";

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
  usedByForms: { name: string; description: string | null; id: string }[];
  usingForms: { name: string; description: string | null; id: string }[];
};

export type SerializableRouter<T extends App_RoutingForms_Router> = Omit<
  T,
  "fields" | "routes" | "createdAt" | "updatedAt" | "settings"
> & {
  routes: Routes;
  fields: Fields;
  createdAt: string;
  updatedAt: string;
};
