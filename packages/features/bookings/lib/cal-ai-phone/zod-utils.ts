import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

const requiredFields = z.object({
  yourPhoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  numberToCall: z.string().refine((val) => isValidPhoneNumber(val)),
  calApiKey: z.string().trim().min(1, {
    message: "Please enter CAL API Key",
  }),
  eventTypeId: z.number(),
  enabled: z.boolean().default(false),
});

export const createPhoneCallSchema = requiredFields.merge(
  z.object({
    schedulerName: z.string().min(1).optional(),
    guestName: z
      .string()
      .optional()
      .transform((val) => {
        return !!val ? val : undefined;
      }),
    guestEmail: z
      .string()
      .optional()
      .transform((val) => {
        return !!val ? val : undefined;
      }),
    guestCompany: z
      .string()
      .optional()
      .transform((val) => {
        return !!val ? val : undefined;
      }),
    beginMessage: z.string().optional(),
    generalPrompt: z.string().optional(),
  })
);

export const fieldSchemaMap = {
  CHECK_IN_APPPOINTMENT: requiredFields.merge(
    z.object({
      schedulerName: z.string().min(1),
    })
  ),
};

const templateTypeEnum = z.enum(["CHECK_IN_APPPOINTMENT"]);

export type TemplateType = z.infer<typeof templateTypeEnum>;

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

export const fieldNameEnum = z.enum(["schedulerName"]);

export type FieldType = z.infer<typeof fieldTypeEnum>;

const FieldSchema = z.object({
  type: fieldTypeEnum,
  name: fieldNameEnum,
  required: z.boolean(),
  defaultLabel: z.string(),
  placeholder: z.string(),
});

const FieldsSchema = z.array(FieldSchema);

export type Fields = z.infer<typeof FieldsSchema>;
