import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

import { bookingResponses, eventTypeBookingFields } from "@calcom/prisma/zod-utils";

export default function getBookingResponsesSchema(
  eventType: {
    bookingFields: z.infer<typeof eventTypeBookingFields> &
      z.infer<typeof eventTypeBookingFields> &
      z.BRAND<"HAS_SYSTEM_FIELDS">;
  },
  forgiving = false
) {
  const schema = forgiving
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
    schema.superRefine((responses, ctx) => {
      eventType.bookingFields.forEach((bookingField) => {
        const value = responses[bookingField.name];
        const emailSchema = forgiving ? z.string() : z.string().email();
        const phoneSchema = forgiving ? z.string() : z.string().refine((val) => isValidPhoneNumber(val));
        // Tag the message with the input name so that the message can be shown at appropriate plae
        const m = (message: string) => `{${bookingField.name}}${message}`;
        if ((forgiving || !bookingField.required) && value === undefined) {
          return;
        }
        if (bookingField.required && !forgiving && !value)
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`Required`) });

        if (bookingField.type === "email") {
          // Email RegExp to validate if the input is a valid email
          if (!emailSchema.safeParse(value).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              //TODO: How to do translation in booker language here?
              message: m("That doesn't look like an email address"),
            });
            return;
          }
        }
        if (bookingField.type === "multiemail") {
          if (!emailSchema.array().safeParse(value).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              //TODO: How to do translation in booker language here?
              message: m("That doesn't look like an email address"),
            });
            return;
          }
          return;
        }

        if (bookingField.type === "phone") {
          if (!phoneSchema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid Phone") });
          }
        }

        if (bookingField.type === "boolean") {
          const schema = z.boolean();
          if (!schema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid Boolean") });
          }
        }

        if (bookingField.type === "radioInput" && bookingField.optionsInputs) {
          //FIXME: ManageBookings: If there is just one option then it is not required to show the radio options
          // Also, if the option is there with one input, we need to show just the input and not radio
          if (
            bookingField.required &&
            bookingField.optionsInputs[value?.value]?.required &&
            !value?.optionValue
          ) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Required Option Value") });
          }
        }

        //TODO: ManageBookings: What about multiselect and others?
      });
    })
  );
}
