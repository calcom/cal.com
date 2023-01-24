import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

import { bookingResponses, eventTypeBookingFields } from "@calcom/prisma/zod-utils";

export default function getBookingResponsesSchema(eventType: {
  bookingFields: z.infer<typeof eventTypeBookingFields>;
}) {
  return bookingResponses.superRefine((response, ctx) => {
    eventType.bookingFields.forEach((input) => {
      const value = response[input.name];
      // Tag the message with the input name so that the message can be shown at appropriate plae
      const m = (message: string) => `{${input.name}}${message}`;
      if (input.required && !value) ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`Required`) });
      if (input.type === "email") {
        // Email RegExp to validate if the input is a valid email
        if (!z.string().email().safeParse(value).success)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            //TODO: How to do translation in booker language here?
            message: m("That doesn't look like an email address"),
          });
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
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid Phone") });
        }
      }

      if (input.type === "radioInput" && input.optionsInputs) {
        //FIXME: ManageBookings: If there is just one option then it is not required to show the radio options
        // Also, if the option is there with one input, we need to show just the input and not radio
        if (input.required && input.optionsInputs[value?.value]?.required && !value?.optionValue) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Required") });
        }
      }

      //TODO: ManageBookings: What about multiselect and others?
    });
  });
}
