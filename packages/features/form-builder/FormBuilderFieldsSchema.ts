import { z } from "zod";

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
]);

export const EditableSchema = z.enum([
  "system", // Can't be deleted, can't be hidden, name can't be edited, can't be marked optional
  "system-but-optional", // Can't be deleted. Name can't be edited. But can be hidden or be marked optional
  "user", // Fully editable
  "user-readonly", // All fields are readOnly.
]);
export type ALL_VIEWS = "ALL_VIEWS";
// It has the config that is always read from the Code(even if it's stored in DB. Though we shouldn't store it there)
// This allows making changes to the UI without having to make changes to the existing stored configs
export const FieldTypeConfig = z
  .object({
    variantsConfig: z
      .object({
        defaultVariant: z.string(),

        // Used only when there are 2 variants, so that UI can be simplified by showing a switch
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
                canChangeRequirability: z.boolean().default(true).optional(),
              })
            ),
          })
        ),
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
  })
  .optional();

const baseFieldSchema = z.object({
  name: z.string(),
  type: fieldTypeEnum,
  // TODO: We should make at least one of `defaultPlaceholder` and `placeholder` required. Do the same for label.
  label: z.string().optional(),
  /**
   * Supports translation
   */
  defaultLabel: z.string().optional(),

  placeholder: z.string().optional(),
  /**
   * Supports translation
   */
  defaultPlaceholder: z.string().optional(),
  required: z.boolean().default(false).optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  /**
   * This is an alternate way to specify options when the options are stored elsewhere. Form Builder expects options to be present at `dataStore[getOptionsAt]`
   * This allows keeping a single source of truth in DB.
   */
  getOptionsAt: z.string().optional(),

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
});

/**
 * Main field Schema
 */
const mainFieldSchema = baseFieldSchema.merge(
  z.object({
    variant: z.string().optional(),
    variantsConfig: z
      .object({
        variants: z.record(
          z.object({
            /**
             * Variant Fields schema for a variant of the main field.
             * It doesn't support non text fields as of now
             **/
            fields: baseFieldSchema
              .omit({
                options: true,
                getOptionsAt: true,
                optionsInputs: true,
              })
              .array(),
          })
        ),
      })
      .optional(),

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
    editable: z
      .enum([
        "system", // Can't be deleted, can't be hidden, name can't be edited, can't be marked optional
        "system-but-optional", // Can't be deleted. Name can't be edited. But can be hidden or be marked optional
        "user", // Fully editable
        "user-readonly", // All fields are readOnly.
      ])
      .default("user")
      .optional(),
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
    fieldTypeConfig: FieldTypeConfig,
  })
);

export const fieldsSchema = z.array(mainFieldSchema);

export const FieldTypeSchema = {
  name: {
    preprocess: (value: unknown) => {
      let newValue;
      if (typeof value === "string") {
        try {
          newValue = JSON.parse(value);
        } catch (e) {
          // If the value is not a valid JSON, then we will just use the value as is as it can be the full name directly
          newValue = value;
        }
      } else {
        newValue = value;
      }
      return newValue;
    },
    superRefine: ({
      bookingField,
      response,
      isPartialSchema,
      ctx,
      m,
    }: {
      bookingField: z.infer<typeof mainFieldSchema>;
      response: any;
      isPartialSchema: boolean;
      ctx: z.RefinementCtx;
      m: (key: string) => string;
    }) => {
      const stringSchema = z.string();
      const variantInResponse =
        bookingField.variant || bookingField.fieldTypeConfig?.variantsConfig?.defaultVariant;
      if (!bookingField.variantsConfig) {
        throw new Error(`variantsConfig must be there for booking field ${bookingField.type}`);
      }
      if (!variantInResponse) {
        throw new Error("`variant` must be there for booking field with `variantsConfig`");
      }
      const fields =
        bookingField.variantsConfig.variants[
          variantInResponse as keyof typeof bookingField.variantsConfig.variants
        ].fields;

      const variantSupportedFields = ["text"];

      if (fields.length === 1) {
        const field = fields[0];
        if (variantSupportedFields.includes(field.type)) {
          const schema = stringSchema;
          if (!schema.safeParse(response).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid string") });
          }
          return;
        } else {
          throw new Error(`Unsupported field.type with variants: ${field.type}`);
        }
      }
      fields.forEach((subField) => {
        const schema = stringSchema;
        if (!variantSupportedFields.includes(subField.type)) {
          throw new Error(`Unsupported field.type with variants: ${subField.type}`);
        }
        const valueIdentified = response as unknown as Record<string, string>;
        if (subField.required) {
          if (!schema.safeParse(valueIdentified[subField.name]).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid string") });
            return;
          }
          if (!isPartialSchema && !valueIdentified[subField.name])
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`error_required_field`) });
        }
      });
    },
  },
};
