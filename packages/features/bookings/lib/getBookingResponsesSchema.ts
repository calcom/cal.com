import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

import { bookingInputs } from "@calcom/prisma/zod-utils";

export default function getBookingResponsesSchema(eventType) {
  return bookingInputs.superRefine((response, ctx) => {
    eventType.bookingInputs.forEach((input) => {
      const value = response[input.name];
      // Tag the message with the input name so that the message can be shown at appropriate plae
      const m = (message: string) => `{${input.name}}${message}`;
      if (input.required && !value) ctx.addIssue({ code: z.ZodIssueCode.custom, message: m`Required` });
      if (input.type === "email") {
        // Email RegExp to validate if the input is a valid email
        if (!z.string().email().safeParse(value).success)
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m`Invalid email` });
      }
      if (input.type === "phone") {
        if (
          !z
            .string()
            .refine((val) => isValidPhoneNumber(val))
            .optional()
            .nullable()
            .safeParse(value).success
        ) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m`Invalid Phone` });
        }
      }

      if (input.type === "radioInput") {
        if (input.optionsInputs[value?.value]?.required && !value?.optionValue) {
          console.log(value, "value");
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m`Required` });
        }
      }
    });
  });
}
