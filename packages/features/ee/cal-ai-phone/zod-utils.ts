import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

export const templateTypeEnum = z.enum(["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]);

const requiredFields = z.object({
  yourPhoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  numberToCall: z.string().refine((val) => isValidPhoneNumber(val)),
  calApiKey: z.string().trim().min(1, {
    message: "Please enter CAL API Key",
  }),
  eventTypeId: z.number(),
  enabled: z.boolean().default(false),
  templateType: templateTypeEnum,
});

export const createPhoneCallSchema = requiredFields.merge(
  z.object({
    schedulerName: z.string().min(1).optional().nullable(),
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

export type TCreatePhoneCallSchema = z.infer<typeof createPhoneCallSchema>;

export const ZGetPhoneNumberSchema = z
  .object({
    agent_id: z.string(),
    inbound_agent_id: z.string(),
    outbound_agent_id: z.string(),
    error_message: z.string().optional(),
  })
  .passthrough();

export type TGetPhoneNumberSchema = z.infer<typeof ZGetPhoneNumberSchema>;

export const ZCreatePhoneSchema = z
  .object({
    call_id: z.string(),
    agent_id: z.string(),
  })
  .passthrough();

export type TCreatePhoneSchema = z.infer<typeof ZCreatePhoneSchema>;

export const fieldSchemaMap = {
  CHECK_IN_APPOINTMENT: requiredFields.merge(
    z.object({
      schedulerName: z.string().min(1),
    })
  ),
  CUSTOM_TEMPLATE: createPhoneCallSchema.omit({ generalPrompt: true }).merge(
    z.object({
      generalPrompt: z.string(),
    })
  ),
};

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

export const fieldNameEnum = z.enum([
  "schedulerName",
  "generalPrompt",
  "guestName",
  "guestEmail",
  "guestCompany",
  "beginMessage",
]);

export type FieldType = z.infer<typeof fieldTypeEnum>;

const FieldSchema = z.object({
  type: fieldTypeEnum,
  name: fieldNameEnum,
  required: z.boolean(),
  defaultLabel: z.string(),
  placeholder: z.string(),
  variableName: z.string().optional(),
});

const FieldsSchema = z.array(FieldSchema);

export type Fields = z.infer<typeof FieldsSchema>;

export const ZCreateRetellLLMSchema = z
  .object({
    llm_id: z.string(),
    llm_websocket_url: z.string(),
  })
  .passthrough();

export type TCreateRetellLLMSchema = z.infer<typeof ZCreateRetellLLMSchema>;

export const ZGetRetellLLMSchema = z
  .object({
    general_prompt: z.string(),
    begin_message: z.string().nullable(),
    llm_id: z.string(),
    llm_websocket_url: z.string(),
    general_tools: z.array(
      z
        .object({
          name: z.string(),
          type: z.string(),
          cal_api_key: z.string().optional(),
          event_type_id: z.number().optional(),
          timezone: z.string().optional(),
        })
        .passthrough()
    ),
    states: z
      .array(
        z
          .object({
            name: z.string(),
            tools: z.array(
              z
                .object({
                  name: z.string(),
                  type: z.string(),
                  cal_api_key: z.string().optional(),
                  event_type_id: z.number().optional(),
                  timezone: z.string().optional(),
                })
                .passthrough()
            ),
          })
          .passthrough()
      )
      .nullable()
      .optional(),
  })
  .passthrough();

export type TGetRetellLLMSchema = z.infer<typeof ZGetRetellLLMSchema>;
