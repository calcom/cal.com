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
  .optional();
const fieldSchema = z.object({
  name: z.string(),
  // TODO: We should make at least one of `defaultPlaceholder` and `placeholder` required. Do the same for label.
  label: z.string().optional(),
  placeholder: z.string().optional(),
  variant: z.string().optional(),
  /**
   * Supports translation
   */
  defaultLabel: z.string().optional(),
  defaultPlaceholder: z.string().optional(),
  variantsConfig: z
    .object({
      defaultVariant: z.string(),
      variants: z.record(
        z.object({
          fields: z
            .object({
              name: z.string(),
              type: fieldTypeEnum,
              label: z.string().optional(),
              defaultLabel: z.string().optional(),
              placeholder: z.string().optional(),
              defaultPlaceholder: z.string().optional(),
              required: z.boolean().optional(),
            })
            .array(),
        })
      ),
    })
    .refine((data) => {
      if (!data.variants[data.defaultVariant]) {
        throw new Error(`defaultVariant: ${data.defaultVariant} is not in variants`);
      }
      return true;
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
  type: fieldTypeEnum,

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
  /**
   * It is used to hide fields such as location when there are less than two options
   */
  hideWhenJustOneOption: z.boolean().default(false).optional(),

  required: z.boolean().default(false).optional(),
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
});
// Using superRefine makes .shape undefined, so avoid using it for now
// .superRefine((data, ctx) => {
//   if (data.appUiConfig?.variantsConfig) {
//     const { variantsConfig } = data.appUiConfig;
//     for (const [variantName, variant] of Object.entries(variantsConfig.variants)) {
//       // TODO: Validate that appUiConfig.variantsConfig.variants[variantName].fieldsMap has all the fields that are present in variantsConfig.variants[variantName].fields
//       // ctx.addIssue({
//       //   code: z.ZodIssueCode.custom,
//       // });
//     }
//   }
// });

export const fieldsSchema = z.array(fieldSchema);
