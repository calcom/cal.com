import { App_RoutingForms_Form } from "@prisma/client";
import z from "zod";

import { zodFields, zodRoutes } from "../zod";

export type Response = Record<
  string,
  {
    value: string | string[];
    label: string;
  }
>;

export type Fields = z.infer<typeof zodFields>;
export type Field = Fields[number];
export type Routes = z.infer<typeof zodRoutes>;
export type Route = Routes[0];
export type SerializableForm<T extends App_RoutingForms_Form> = Omit<
  T,
  "fields" | "routes" | "createdAt" | "updatedAt"
> & {
  routes: Routes;
  fields: Fields;
  createdAt: string;
  updatedAt: string;
};
