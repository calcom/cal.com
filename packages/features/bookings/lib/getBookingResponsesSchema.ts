import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

import { bookingResponses, eventTypeBookingFields } from "@calcom/prisma/zod-utils";

export default function getBookingResponsesSchema(
  eventType: {
    bookingFields: z.infer<typeof eventTypeBookingFields>;
  },
  partial = false
) {
  const schema = partial
    ? bookingResponses.partial().and(z.record(z.any()))
    : bookingResponses.and(z.record(z.any()));

  return z.preprocess(
    (responses) => {
      const parsedResponses = z.record(z.any()).parse(responses);
      const newResponses = {} as typeof parsedResponses;
      eventType.bookingFields.forEach((field) => {
        if (parsedResponses[field.name] === undefined) {
          // If there is no response for the field, then we don't need to do any processing
          return;
        }
        // Turn a boolean in string to a real boolean
        if (field.type === "boolean") {
          newResponses[field.name] =
            parsedResponses[field.name] === "true" || parsedResponses[field.name] === true;
        } else {
          newResponses[field.name] = parsedResponses[field.name];
        }
      });
      return newResponses;
    },
    schema.superRefine((response, ctx) => {
      eventType.bookingFields.forEach((input) => {
        const value = response[input.name];
        // Tag the message with the input name so that the message can be shown at appropriate plae
        const m = (message: string) => `{${input.name}}${message}`;
        if ((partial || !input.required) && value === undefined) {
          return;
        }
        if (input.required && !partial && !value)
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`Required`) });

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

        if (input.type === "boolean") {
          const schema = z.preprocess((val) => {
            return val === "true";
          }, z.boolean());
          if (!schema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid Boolean") });
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
    })
  );
}
