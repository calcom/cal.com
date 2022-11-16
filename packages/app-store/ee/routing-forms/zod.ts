import { z } from "zod";

const zodField = z.object({
  id: z.string(),
  label: z.string(),
  identifier: z.string().optional(),
  type: z.string(),
  selectText: z.string().optional(),
  required: z.boolean().optional(),
  deleted: z.boolean().optional(),
  globalRouterId: z.string().optional(),
});

export const zodFieldView = zodField.extend({
  globalRouterId: z.string().optional(),
  globalRouter: z
    .object({
      name: z.string(),
      description: z.string(),
      id: z.string(),
    })
    .optional(),
});

export const zodFields = z.array(zodField).optional();
export const zodFieldsView = z
  .array(
    // TODO: Extract from Form
    zodFieldView
  )
  .optional();

export const localRoute = z.object({
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

export const globalRoute = z.object({
  id: z.string(),
  routerType: z.literal("global"),
});

export const zodRoute = z.union([localRoute, globalRoute]);

export const globalRouteView = globalRoute.extend({
  //TODO: Extend it from form
  name: z.string(),
  description: z.string().nullable(),
  routes: z.array(
    z.union([
      zodRoute,
      z.object({
        id: z.string(),
        routerType: z.literal("global"),
      }),
      z.null(),
    ])
  ),
});

export const zodRoutes = z.union([z.array(zodRoute), z.null()]).optional();

export const zodRouteView = z.union([localRoute, globalRouteView]);

export const zodRoutesView = z.union([z.array(zodRouteView), z.null()]).optional();

// TODO: This is a requirement right now that zod.ts file (if it exists) must have appDataSchema export(which is only required by apps having EventTypeAppCard interface)
// This is a temporary solution and will be removed in future
export const appDataSchema = z.any();
