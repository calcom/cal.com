import { z } from "zod";

import { getValidRhfFieldName } from "@calcom/lib/getValidRhfFieldName";

import { fieldTypesConfigMap } from "./fieldTypes";
import { preprocessNameFieldDataWithVariant } from "./utils";
import { getConfig as getVariantsConfig } from "./utils/variantsConfig";

const nonEmptyString = () => z.string().refine((value: string) => value.trim().length > 0);

const fieldTypeEnum = z.enum([
  "name",
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "address",
  "multiemail",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "radioInput",
  "boolean",
  "url",
]);

export type FieldType = z.infer<typeof fieldTypeEnum>;

export const EditableSchema = z.enum([
  "system", // Can't be deleted, can't be hidden, name can't be edited, can't be marked optional
  "system-but-optional", // Can't be deleted. Name can't be edited. But can be hidden or be marked optional
  "system-but-hidden", // Can't be deleted, name can't be edited, will be shown
  "user", // Fully editable
  "user-readonly", // All fields are readOnly.
]);

export const excludeOrRequireEmailSchema = z.string().superRefine((val, ctx) => {
  const allDomains = val.split(",").map((dom) => dom.trim());

  const regex = /^(?:@?[a-z0-9-]+(?:\.[a-z]{2,})?)?(?:@[a-z0-9-]+\.[a-z]{2,})?$/;

  /*
  Valid patterns - [ example, example.anything, anyone@example.anything ]
  Invalid patterns - Patterns involving capital letter [ Example, Example.anything, Anyone@example.anything ]
*/

  const isValid = !allDomains.some((domain) => !regex.test(domain));

  if (!isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter valid domain or email",
    });
  }
});

const baseFieldSchema = z.object({
  name: z.string().transform(getValidRhfFieldName),
  type: fieldTypeEnum,
  // TODO: We should make at least one of `defaultPlaceholder` and `placeholder` required. Do the same for label.
  label: z.string().optional(),
  labelAsSafeHtml: z.string().optional(),

  /**
   * It is the default label that will be used when a new field is created.
   * Note: It belongs in FieldsTypeConfig, so that changing defaultLabel in code can work for existing fields as well(for fields that are using the default label).
   * Supports translation
   */
  defaultLabel: z.string().optional(),

  placeholder: z.string().optional(),
  /**
   * It is the default placeholder that will be used when a new field is created.
   * Note: Same as defaultLabel, it belongs in FieldsTypeConfig
   * Supports translation
   */
  defaultPlaceholder: z.string().optional(),
  required: z.boolean().default(false).optional(),
  /**
   * It is the list of options that is valid for a certain type of fields.
   *
   */
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  /**
   * This is an alternate way to specify options when the options are stored elsewhere. Form Builder expects options to be present at `dataStore[getOptionsAt]`
   * This allows keeping a single source of truth in DB.
   */
  getOptionsAt: z.string().optional(),

  /**
   * For `radioInput` type of questions, it stores the input that is shown based on the user option selected.
   * e.g. If user is given a list of locations and he selects "Phone", then he will be shown a phone input
   */
  optionsInputs: z
    .record(
      z.object({
        // Support all types as needed
        // Must be a subset of `fieldTypeEnum`.TODO: Enforce it in TypeScript
        type: z.enum(["address", "phone", "text"]),
        required: z.boolean().optional(),
        placeholder: z.string().optional(),
      })
    )
    .optional(),

  /**
   * It is the minimum number of characters that can be entered in the field.
   * It is used for types with `supportsLengthCheck= true`.
   * @default 0
   * @requires supportsLengthCheck = true
   */
  minLength: z.number().optional(),

  /**
   * It is the maximum number of characters that can be entered in the field.
   * It is used for types with `supportsLengthCheck= true`.
   * @requires supportsLengthCheck = true
   */
  maxLength: z.number().optional(),

  // Emails that needs to be excluded
  excludeEmails: excludeOrRequireEmailSchema.optional(),
  // Emails that need to be required
  requireEmails: excludeOrRequireEmailSchema.optional(),
});

export const variantsConfigSchema = z.object({
  variants: z.record(
    z.object({
      /**
       * Variant Fields schema for a variant of the main field.
       * It doesn't support non text fields as of now
       **/
      fields: baseFieldSchema
        .omit({
          defaultLabel: true,
          defaultPlaceholder: true,
          options: true,
          getOptionsAt: true,
          optionsInputs: true,
        })
        .array(),
    })
  ),
});

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

/**
 * Main field Schema
 */
export const fieldSchema = baseFieldSchema.merge(
  z.object({
    variant: z.string().optional(),
    variantsConfig: variantsConfigSchema.optional(),

    views: z
      .object({
        label: z.string(),
        id: z.string(),
        description: z.string().optional(),
      })
      .array()
      .optional(),

    /**
     * It is used to hide fields such as location when there are less than two options
     */
    hideWhenJustOneOption: z.boolean().default(false).optional(),

    hidden: z.boolean().optional(),
    editable: EditableSchema.default("user").optional(),
    sources: z
      .array(
        z.object({
          // Unique ID for the `type`. If type is workflow, it's the workflow ID
          id: z.string(),
          type: z.union([z.literal("user"), z.literal("system"), z.string()]),
          label: z.string(),
          editUrl: z.string().optional(),
          // Mark if a field is required by this source or not. This allows us to set `field.required` based on all the sources' fieldRequired value
          fieldRequired: z.boolean().optional(),
        })
      )
      .optional(),
    disableOnPrefill: z.boolean().default(false).optional(),
  })
);

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
        m: (key: string) => string;
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
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m(`Max. ${maxLength} characters allowed`),
        });
        return;
      }
      if (hasNotReachedMinLength) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m(`Min. ${minLength} characters required`),
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

      if (!urlSchema.safeParse(value).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: m("url_validation_error"),
        });
      }
    },
  },
};

/**
 * DB Read schema has no field type based validation because user might change the type of a field from Type1 to Type2 after some data has been collected with Type1.
 * Parsing that type1 data with type2 schema will fail.
 * So, we just validate that the response conforms to one of the field types' schema.
 */
export const dbReadResponseSchema = z.union([
  z.string(),
  z.boolean(),
  z.string().array(),
  z.object({
    optionValue: z.string(),
    value: z.string(),
  }),
  // For variantsConfig case
  z.record(z.string()),
]);
