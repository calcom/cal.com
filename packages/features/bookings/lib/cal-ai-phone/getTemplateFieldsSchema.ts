import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

import type { TemplateType } from "./template-fields-map";

const requiredFields = z.object({
  yourPhoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  numberToCall: z.string().refine((val) => isValidPhoneNumber(val)),
  calApiKey: z.string().trim().min(1, {
    message: "Please enter CAL API Key",
  }),
  eventTypeId: z.number(),
  enabled: z.boolean().default(false),
});

const fieldSchemaMap = {
  CHECK_IN_APPPOINTMENT: requiredFields.merge(
    z.object({
      schedulerName: z.string().min(1),
    })
  ),
};

export const getTemplateFieldsSchema = ({ templateType }: { templateType: string }) => {
  return fieldSchemaMap[templateType as TemplateType];
};
