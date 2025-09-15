import { z } from "zod";

export const raqbChildSchema = z.object({
  type: z.string().optional(),
  properties: z
    .object({
      field: z.any().optional(),
      operator: z.any().optional(),
      value: z.any().optional(),
      valueSrc: z.any().optional(),
      valueError: z.array(z.union([z.string(), z.null()])).optional(),
      valueType: z.any().optional(),
    })
    .optional(),
  /*
   * TODO: (emrysal) This schema is good, but our DB contains invalid entries-
   *       instead of crashing on read we need to handle this on write first.
  type: z.union([z.literal("rule"), z.literal("rule_group")]),
  properties: z.object({
    // This is RAQB field that is used in the rules. The aluealue we provide here is used as a lookup key in RAQB_CONFIG.fields
    field: z.string(),
    // It could be any of the operators. There are many custom operators.
    operator: z.string(),
    // It is the value of the 'field' chosen for comparison in the rule
    // It might not be set if the operator needs nothing to compare with e.g. is_empty, is_not_empty\
    // It could be a 2D array for MultiSelect field
    value: z.array(z.union([z.string(), z.array(z.string()), z.null()])).optional(),
    // It is the source of the value. It might not be set if the value is coming from the field itself.
    valueSrc: z
      .union([z.literal("value"), z.literal("field"), z.literal("func"), z.literal("const")])
      .array()
      .optional(),
    // It is the error message that is shown when the value is not valid.
    valueError: z.array(z.union([z.string(), z.null()])).optional(),
    // Type of the value - can be text, number, boolean, date, time, datetime, select, multiselect, treeselect, treemultiselect and maybe more
    // We only use a few of them in our app
    valueType: z.array(z.string()).optional(),
  }),*/
});

// The actual schema of children1 is quite complex, we don't want to worry about that at the moment.
const raqbChildren1Schema = z
  .record(raqbChildSchema)
  // .catch((ctx) => {
  //   console.error("Failed to parse raqbChildren1Schema:", ctx.error);
  //   return ctx.input;
  // })
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
  });

/**
 * @example
 * ```json
 * {
    "id": "9b8ba888-0123-4456-b89a-b1984020d699",
    "type": "group",
    "children1": {
        "a8a89bba-89ab-4cde-b012-31984020ebaa": {
            "type": "rule",
            "properties": {
                "field": "88be6104-d350-411d-aa0f-092b2deda257",
                "operator": "multiselect_some_in",
                "value": [
                    [
                        "{field:0bf77a89-2bd0-4df7-9648-758014ba3189}",
                        "899c846d-7c02-43dc-9057-c3f8c118d41f"
                    ]
                ],
                "valueSrc": [
                    "value"
                ],
                "valueError": [
                    null
                ],
                  "valueType": [
                      "multiselect"
                  ]
              }
          }
      }
  }
 * ```
 */
export const raqbQueryValueSchema = z.union([
  z.object({
    id: z.string().optional(),
    type: z.literal("group"),
    children1: raqbChildren1Schema.optional(),
    properties: z.any(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("switch_group"),
    children1: raqbChildren1Schema.optional(),
    properties: z.any(),
  }),
]);

export const zodAttributesQueryValue = raqbQueryValueSchema;
