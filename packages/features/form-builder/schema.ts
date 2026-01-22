import { z } from "zod";

import { fieldSchema, fieldTypeEnum, variantsConfigSchema, type FieldType } from "@calcom/prisma/zod-utils";

import { fieldTypesConfigMap } from "./fieldTypes";
import { preprocessNameFieldDataWithVariant } from "./utils";
import { getConfig as getVariantsConfig } from "./utils/variantsConfig";

const nonEmptyString = () => z.string().refine((value: string) => value.trim().length > 0);

export type ALL_VIEWS = "ALL_VIEWS";

// It is the config that is specific to a type and doesn't make sense in all fields individually. Any field with the type will automatically inherit this config.
// This allows making changes to the UI without having to make changes to the existing stored configs
export const fieldTypeConfigSchema = z
  .object({
    label: z.string(),
    value: fieldTypeEnum,
    isTextType: z.boolean().default(false).optional(),
    systemOnly: z.boolean().default(false).optional(),
    needsOptions: z.boolean().default(false).optional(),
    supportsLengthCheck: z
      .object({
        maxLength: z.number(),
      })
      .optional(),
    supportsPricing: z.boolean().default(false).optional(),
    optionsSupportPricing: z.boolean().default(false).optional(),
    propsType: z.enum([
      "text",
      "textList",
      "select",
      "multiselect",
      "boolean",
      "objectiveWithInput",
      "variants",
    ]),
    // It is the config that can tweak what an existing or a new field shows in the App UI or booker UI.
    variantsConfig: z
      .object({
        /**
         * This is the default variant that will be used when a new field is created.
         */
        defaultVariant: z.string(),

        /**
         *  Used only when there are 2 variants, so that UI can be simplified by showing a switch(with this label) instead of a Select
         */
        toggleLabel: z.string().optional(),
        variants: z.record(
          z.object({
            /**
             * That's how the variant would be labelled in App UI. This label represents the field in booking questions' list
             * Supports translation
             */
            label: z.string(),
            fieldsMap: z.record(
              z.object({
                /**
                 * Supports translation
                 */
                defaultLabel: z.string().optional(),
                /**
                 * Supports translation
                 */
                defaultPlaceholder: z.string().optional(),
                /**
                 * Decides if a variant field's required property can be changed or not
                 */
                canChangeRequirability: z.boolean().default(true).optional(),
              })
            ),
          })
        ),
        /**
         * This is the default configuration for the field.
         */
        defaultValue: variantsConfigSchema.optional(),
      })
      .optional(),
  })
  .refine((data) => {
    if (!data.variantsConfig) {
      return;
    }
    const variantsConfig = data.variantsConfig;
    if (!variantsConfig.variants[variantsConfig.defaultVariant]) {
      throw new Error(`defaultVariant: ${variantsConfig.defaultVariant} is not in variants`);
    }
    return true;
  });

export const fieldsSchema = z.array(fieldSchema);

export const fieldTypesSchemaMap: Partial<
  Record<
    FieldType,
    {
      /**
       * - preprocess the responses received through prefill query params
       * - preprocess the values being filled in the booking form.
       * - does not run for the responses received from DB
       */
      preprocess: (data: {
        field: z.infer<typeof fieldSchema>;
        response: string;
        isPartialSchema: boolean;
      }) => unknown;
      /**
       * - Validates the response received through prefill query params
       * - Validates the values being filled in the booking form.
       * - does not run for the responses received from DB
       */
      superRefine: (data: {
        field: z.infer<typeof fieldSchema>;
        response: string;
        isPartialSchema: boolean;
        ctx: z.RefinementCtx;
        m: (key: string, options?: Record<string, unknown>) => string;
      }) => void;
    }
  >
> = {
  name: {
    preprocess: ({ response, field }) => {
      const fieldTypeConfig = fieldTypesConfigMap[field.type];

      const variantInResponse = field.variant || fieldTypeConfig?.variantsConfig?.defaultVariant;
      let correctedVariant: "firstAndLastName" | "fullName";

      if (!variantInResponse) {
        throw new Error("`variant` must be there for the field with `variantsConfig`");
      }

      if (variantInResponse !== "firstAndLastName" && variantInResponse !== "fullName") {
        correctedVariant = "fullName";
      } else {
        correctedVariant = variantInResponse;
      }

      return preprocessNameFieldDataWithVariant(correctedVariant, response);
    },
    superRefine: ({ field, response, isPartialSchema, ctx, m }) => {
      const stringSchema = z.string();
      const fieldTypeConfig = fieldTypesConfigMap[field.type];
      const variantInResponse = field.variant || fieldTypeConfig?.variantsConfig?.defaultVariant;
      if (!variantInResponse) {
        throw new Error("`variant` must be there for the field with `variantsConfig`");
      }

      const variantsConfig = getVariantsConfig(field);

      if (!variantsConfig) {
        throw new Error("variantsConfig must be there for `name` field");
      }

      const fields =
        variantsConfig.variants[variantInResponse as keyof typeof variantsConfig.variants].fields;

      const variantSupportedFields = ["text"];

      if (fields.length === 1) {
        const field = fields[0];
        if (variantSupportedFields.includes(field.type)) {
          const schema = field.required && !isPartialSchema ? nonEmptyString() : stringSchema;
          if (!schema.safeParse(response).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid string") });
          }
          return;
        } else {
          throw new Error(`Unsupported field.type with variants: ${field.type}`);
        }
      }
      fields.forEach((subField) => {
        const schema = subField.required && !isPartialSchema ? nonEmptyString() : stringSchema;
        if (!variantSupportedFields.includes(subField.type)) {
          throw new Error(`Unsupported field.type with variants: ${subField.type}`);
        }
        const valueIdentified = response as unknown as Record<string, string>;
        if (subField.required) {
          if (!isPartialSchema && !valueIdentified[subField.name])
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`error_required_field`) });
          if (!schema.safeParse(valueIdentified[subField.name]).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid string") });
            return;
          }
        }
      });
    },
  },
  textarea: {
    preprocess: ({ response }) => {
      return response.trim();
    },
    superRefine: ({ field, response, ctx, m }) => {
      const fieldTypeConfig = fieldTypesConfigMap[field.type];
      const value = response ?? "";
      const maxLength = field.maxLength ?? fieldTypeConfig.supportsLengthCheck?.maxLength;
      const minLength = field.minLength ?? 0;
      if (!maxLength) {
        throw new Error("maxLength must be there for textarea field");
      }
      const hasExceededMaxLength = value.length > maxLength;
      const hasNotReachedMinLength = value.length < minLength;
      if (hasExceededMaxLength) {
        const message = m(`max_characters_allowed`, { count: maxLength });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
        });
        return;
      }
      if (hasNotReachedMinLength) {
        const message = m(`min_characters_required`, { count: minLength });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
        });
        return;
      }
    },
  },
  url: {
    preprocess: ({ response }) => {
      return response.trim();
    },
    superRefine: ({ response, ctx, m }) => {
      const value = response ?? "";
      const urlSchema = z.string().url();

      // Check for malformed protocols (missing second slash test case)
      if (value.match(/^https?:\/[^\/]/)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m("url_validation_error"),
        });
        return;
      }

      // 1. Try validating the original value
      if (urlSchema.safeParse(value).success) {
        return;
      }

      // 2. If it failed, try prepending https://
      const domainLike = /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i;
      if (domainLike.test(value)) {
        const valueWithHttps = `https://${value}`;
        if (urlSchema.safeParse(valueWithHttps).success) {
          return;
        }
      }

      // 3. If all attempts fail, throw err
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: m("url_validation_error"),
      });
    },
  },
};
