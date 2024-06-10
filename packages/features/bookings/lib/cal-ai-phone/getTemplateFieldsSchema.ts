import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

const requiredFields = z.object({
  yourPhoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  numberToCall: z.string().refine((val) => isValidPhoneNumber(val)),
  calApiKey: z.string().trim().min(1, {
    message: "Please enter CAL API Key",
  }),
  eventTypeId: z.number(),
});

const getTemplateFieldsSchema = ({ templateType }: { templateType: string }) => {
  return requiredFields;
};
