import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

import { bookingResponses, eventTypeBookingFields } from "@calcom/prisma/zod-utils";

type EventType = Parameters<typeof preprocess>[0]["eventType"];
export const getBookingResponsesQuerySchema = (eventType: EventType) => {
  const schema = bookingResponses.unwrap().partial().and(z.record(z.any()));

  return preprocess({ schema, eventType, forQueryParsing: true });
};

export default function getBookingResponsesSchema(eventType: EventType) {
  const schema = bookingResponses.and(z.record(z.any()));
  return preprocess({ schema, eventType, forQueryParsing: false });
}

// TODO: Move it to FormBuilder schema
function preprocess<T extends z.ZodType>({
  schema,
  eventType,
  forQueryParsing,
}: {
  schema: T;
  forQueryParsing: boolean;
  eventType: {
    bookingFields: z.infer<typeof eventTypeBookingFields> &
      z.infer<typeof eventTypeBookingFields> &
      z.BRAND<"HAS_SYSTEM_FIELDS">;
  };
}): z.ZodType<z.infer<T>, z.infer<T>, z.infer<T>> {
  const preprocessed = z.preprocess(
    (responses) => {
      const parsedResponses = z.record(z.any()).nullable().parse(responses) || {};
      const newResponses = {} as typeof parsedResponses;
      eventType.bookingFields.forEach((field) => {
        const value = parsedResponses[field.name];
        if (value === undefined) {
          // If there is no response for the field, then we don't need to do any processing
          return;
        }
        // Turn a boolean in string to a real boolean
        if (field.type === "boolean") {
          newResponses[field.name] = value === "true" || value === true;
        }
        // Make sure that the value is an array
        else if (field.type === "multiemail" || field.type === "checkbox" || field.type === "multiselect") {
          newResponses[field.name] = value instanceof Array ? value : [value];
        }
        // Parse JSON
        else if (field.type === "radioInput" && typeof value === "string") {
          let parsedValue = {
            optionValue: "",
            value: "",
          };
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {}
          newResponses[field.name] = parsedValue;
        } else {
          newResponses[field.name] = value;
        }
      });
      return newResponses;
    },
    schema.superRefine((responses, ctx) => {
      eventType.bookingFields.forEach((bookingField) => {
        const value = responses[bookingField.name];
        const stringSchema = z.string();
        const emailSchema = forQueryParsing ? z.string() : z.string().email();
        const phoneSchema = forQueryParsing
          ? z.string()
          : z.string().refine((val) => isValidPhoneNumber(val));
        // Tag the message with the input name so that the message can be shown at appropriate place
        const m = (message: string) => `{${bookingField.name}}${message}`;
        const isRequired = bookingField.required;
        if ((forQueryParsing || !isRequired) && value === undefined) {
          return;
        }

        if (isRequired && !forQueryParsing && !value)
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`Required`) });

        if (bookingField.type === "email") {
          // Email RegExp to validate if the input is a valid email
          if (!emailSchema.safeParse(value).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              //TODO: How to do translation in booker language here?
              message: m("That doesn't look like an email address"),
            });
          }
          return;
        }

        if (bookingField.type === "multiemail") {
          if (!emailSchema.array().safeParse(value).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              //TODO: How to do translation in booker language here?
              message: m("That doesn't look like an email address"),
            });
          }
          return;
        }

        if (bookingField.type === "checkbox" || bookingField.type === "multiselect") {
          if (!stringSchema.array().safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid array of strings") });
          }
          return;
        }

        if (bookingField.type === "phone") {
          if (!phoneSchema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid Phone") });
          }
          return;
        }

        if (bookingField.type === "boolean") {
          const schema = z.boolean();
          if (!schema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid Boolean") });
          }
          return;
        }

        if (bookingField.type === "radioInput") {
          if (bookingField.optionsInputs) {
            // Also, if the option is there with one input, we need to show just the input and not radio
            if (isRequired && bookingField.optionsInputs[value?.value]?.required && !value?.optionValue) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Required Option Value") });
            }
          }
          return;
        }

        if (
          bookingField.type === "address" ||
          bookingField.type === "text" ||
          bookingField.type === "select" ||
          bookingField.type === "name" ||
          bookingField.type === "number" ||
          bookingField.type === "radio" ||
          bookingField.type === "textarea"
        ) {
          const schema = stringSchema;
          if (!schema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid string") });
          }
          return;
        }

        throw new Error(`Can't parse unknown booking field type: ${bookingField.type}`);
      });
    })
  );
  if (forQueryParsing) {
    // Query Params can be completely invalid, try to preprocess as much of it in correct format but in worst case simply don't prefill instead of crashing
    return preprocessed.catch(() => {
      console.error("Failed to preprocess query params, prefilling will be skipped");
      return {};
    });
  }
  return preprocessed;
}
