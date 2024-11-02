import { z } from "zod";

export const zodNonRouterField = z.object({
  id: z.string(),
  label: z.string(),
  identifier: z.string().optional(),
  placeholder: z.string().optional(),
  type: z.string(),
  /**
   * @deprecated in favour of `options`
   */
  selectText: z.string().optional(),
  required: z.boolean().optional(),
  deleted: z.boolean().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        // To keep backwards compatibility with the options generated from legacy selectText, we allow saving null as id
        // It helps in differentiating whether the routing logic should consider the option.label as value or option.id as value.
        // This is important for legacy routes which has option.label saved in conditions and it must keep matching with the value of the option
        id: z.string().or(z.null()),
      })
    )
    .optional(),
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
const queryValueSchema = z.object({
  id: z.string().optional(),
  type: z.union([z.literal("group"), z.literal("switch_group")]),
  children1: z.any(),
  properties: z.any(),
});

export enum RouteActionType {
  CustomPageMessage = "customPageMessage",
  ExternalRedirectUrl = "externalRedirectUrl",
  EventTypeRedirectUrl = "eventTypeRedirectUrl",
}

export const routeActionTypeSchema = z.nativeEnum(RouteActionType);
/**
 * Stricter schema for validating before saving to DB
 * It doesn't decide what will be saved, it is just to validate the data before saving
 */
export const queryValueSaveValidationSchema = queryValueSchema
  .omit({ children1: true })
  .merge(
    z.object({
      children1: z
        .record(
          z.object({
            type: z.string().optional(),
            properties: z
              .object({
                field: z.any().optional(),
                operator: z.any().optional(),
                value: z.any().optional(),
                valueSrc: z.any().optional(),
              })
              .optional(),
          })
        )
        .optional()
        // Be very careful and lenient here. Just ensure that the rule isn't invalid without breaking anything
        .superRefine((children1, ctx) => {
          if (!children1) return;
          const isObject = (value: unknown): value is Record<string, unknown> =>
            typeof value === "object" && value !== null;
          Object.entries(children1).forEach(([, _rule]) => {
            const rule = _rule as unknown;
            if (!isObject(rule) || rule.type !== "rule") return;
            if (!isObject(rule.properties)) return;

            const value = rule.properties.value || [];
            const valueSrc = rule.properties.valueSrc;
            if (!(value instanceof Array) || !(valueSrc instanceof Array)) {
              return;
            }

            if (!valueSrc.length) {
              // If valueSrc is empty, value could be empty for operators like is_empty, is_not_empty
              return;
            }

            // MultiSelect array can be 2D array
            const flattenedValues = value.flat();

            const validValues = flattenedValues.filter((value: unknown) => {
              // Might want to restrict it to filter out null and empty string as well. But for now we know that Prisma errors only for undefined values when saving it in JSON field
              // Also, it is possible that RAQB has some requirements to support null or empty string values.
              if (value === undefined) return false;
              return true;
            });

            if (!validValues.length) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Looks like you are trying to create a rule with no value",
              });
            }
          });
        }),
    })
  )
  .nullish();

export const zodNonRouterRoute = z.object({
  id: z.string(),
  attributeRoutingConfig: z
    .object({
      skipContactOwner: z.boolean().optional(),
    })
    .nullish(),

  // TODO: It should be renamed to formFieldsQueryValue but it would take some effort
  /**
   * RAQB query value for form fields
   * BRANDED to ensure we don't give it Attributes
   */
  queryValue: queryValueSchema.brand<"formFieldsQueryValue">(),
  /**
   * RAQB query value for attributes. It is only applicable for Team Events as it is used to find matching team members
   * BRANDED to ensure we don't give it Form Fields
   */
  attributesQueryValue: queryValueSchema.brand<"attributesQueryValue">().optional(),
  /**
   * RAQB query value for fallback of `attributesQueryValue`
   * BRANDED to ensure we don't give it Form Fields, It needs Attributes
   */
  fallbackAttributesQueryValue: queryValueSchema.brand<"attributesQueryValue">().optional(),
  /**
   * Whether the route is a fallback if no other routes match
   */
  isFallback: z.boolean().optional(),
  action: z.object({
    type: routeActionTypeSchema,
    eventTypeId: z.number().optional(),
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

// This is different from FormResponse in types.d.ts in that it has label optional. We don't seem to be using label at this point, so we might want to use this only while saving the response when Routing Form is submitted
export const routingFormResponseInDbSchema = z.record(
  z.object({
    label: z.string().optional(),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
  })
);
