import { z } from "zod";

export const zodNonRouterField = z.object({
  id: z.string(),
  label: z.string(),
  identifier: z.string().optional(),
  placeholder: z.string().optional(),
  type: z.string(),
  selectText: z.string().optional(),
  required: z.boolean().optional(),
  deleted: z.boolean().optional(),
});

export const zodRouterField = zodNonRouterField.extend({
  routerId: z.string(),
});

// This ordering is important - If routerId is present then it should be in the parsed object. Moving zodNonRouterField to first position doesn't do that
export const zodField = z.union([zodRouterField, zodNonRouterField]);
export const zodFields = z.array(zodField).optional();

export const zodNonRouterFieldView = zodNonRouterField;
export const zodRouterFieldView = zodRouterField.extend({
  routerField: zodNonRouterFieldView,
  router: z.object({
    name: z.string(),
    description: z.string(),
    id: z.string(),
  }),
});
/**
 * Has some additional fields that are not supposed to be saved to DB but are required for the UI
 */
export const zodFieldView = z.union([zodNonRouterFieldView, zodRouterFieldView]);

export const zodFieldsView = z.array(zodFieldView).optional();

export const zodNonRouterRoute = z.object({
  id: z.string(),
  queryValue: z.object({
    id: z.string().optional(),
    type: z.union([z.literal("group"), z.literal("switch_group")]),
    children1: z.any(),
    properties: z.any(),
  }),
  isFallback: z.boolean().optional(),
  action: z.object({
    // TODO: Make it a union type of "customPageMessage" and ..
    type: z.union([
      z.literal("customPageMessage"),
      z.literal("externalRedirectUrl"),
      z.literal("eventTypeRedirectUrl"),
    ]),
    value: z.string(),
  }),
});

export const zodNonRouterRouteView = zodNonRouterRoute;

export const zodRouterRoute = z.object({
  // This is the id of the Form being used as router
  id: z.string(),
  isRouter: z.literal(true),
});

export const zodRoute = z.union([zodNonRouterRoute, zodRouterRoute]);

export const zodRouterRouteView = zodRouterRoute.extend({
  //TODO: Extend it from form
  name: z.string(),
  description: z.string().nullable(),
  routes: z.array(z.union([zodRoute, z.null()])),
});

export const zodRoutes = z.union([z.array(zodRoute), z.null()]).optional();

export const zodRouteView = z.union([zodNonRouterRouteView, zodRouterRouteView]);

export const zodRoutesView = z.union([z.array(zodRouteView), z.null()]).optional();

// TODO: This is a requirement right now that zod.ts file (if it exists) must have appDataSchema export(which is only required by apps having EventTypeAppCard interface)
// This is a temporary solution and will be removed in future
export const appDataSchema = z.any();

export const appKeysSchema = z.object({});
