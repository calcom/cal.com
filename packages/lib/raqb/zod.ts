import { z } from "zod";

// The actual schema of children1 is quite complex, we don't want to worry about that at the moment.
const children1Schema = z
  .any()
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
  });

// TODO: We could make it stricter
const propertiesSchema = z.any();

export const raqbQueryValueSchema = z.union([
  z.object({
    id: z.string().optional(),
    type: z.literal("group"),
    children1: children1Schema,
    properties: propertiesSchema,
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("switch_group"),
    children1: children1Schema,
    properties: propertiesSchema,
  }),
]);

export const zodAttributesQueryValue = raqbQueryValueSchema;
