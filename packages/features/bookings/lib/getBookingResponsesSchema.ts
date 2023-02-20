import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod";

import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { bookingResponses } from "@calcom/prisma/zod-utils";

type EventType = Parameters<typeof preprocess>[0]["eventType"];
export const getBookingResponsesPartialSchema = (eventType: EventType) => {
  const schema = bookingResponses.unwrap().partial().and(z.record(z.any()));

  return preprocess({ schema, eventType, isPartialSchema: true });
};

// Should be used when we know that not all fields responses are present
// - Can happen when we are parsing the prefill query string
// - Can happen when we are parsing a booking's responses (which was created before we added a new required field)
export default function getBookingResponsesSchema(eventType: EventType) {
  const schema = bookingResponses.and(z.record(z.any()));
  return preprocess({ schema, eventType, isPartialSchema: false });
}

// TODO: Move preprocess of `booking.responses` to FormBuilder schema as that is going to parse the fields supported by FormBuilder
// It allows anyone using FormBuilder to get the same preprocessing automatically
function preprocess<T extends z.ZodType>({
  schema,
  eventType,
  isPartialSchema,
}: {
  schema: T;
  isPartialSchema: boolean;
  eventType: {
    bookingFields: z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">;
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
        const emailSchema = isPartialSchema ? z.string() : z.string().email();
        const phoneSchema = isPartialSchema
          ? z.string()
          : z.string().refine((val) => isValidPhoneNumber(val));
        // Tag the message with the input name so that the message can be shown at appropriate place
        const m = (message: string) => `{${bookingField.name}}${message}`;
        const isRequired = bookingField.required;
        if ((isPartialSchema || !isRequired) && value === undefined) {
          return;
        }

        if (isRequired && !isPartialSchema && !value)
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`error_required_field`) });

        if (bookingField.type === "email") {
          // Email RegExp to validate if the input is a valid email
          if (!emailSchema.safeParse(value).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: m("email_validation_error"),
            });
          }
          return;
        }

        if (bookingField.type === "multiemail") {
          const emailsParsed = emailSchema.array().safeParse(value);
          if (!emailsParsed.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: m("email_validation_error"),
            });
            return;
          }

          const emails = emailsParsed.data;
          emails.sort().some((item, i) => {
            if (item === emails[i + 1]) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("duplicate_email") });
              return true;
            }
          });
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
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("invalid_number") });
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
            const optionValue = value?.optionValue;
            const optionField = bookingField.optionsInputs[value?.value];
            const typeOfOptionInput = optionField?.type;
            if (
              // Either the field is required or there is a radio selected, we need to check if the optionInput is required or not.
              (isRequired || value?.value) &&
              optionField?.required &&
              !optionValue
            ) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("error_required_field") });
            }

            if (optionValue) {
              // `typeOfOptionInput` can be any of the main types. So, we the same validations should run for `optionValue`
              if (typeOfOptionInput === "phone") {
                if (!phoneSchema.safeParse(optionValue).success) {
                  ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("invalid_number") });
                }
              }
            }
          }
          return;
        }

        if (
          ["address", "text", "select", "name", "number", "radio", "textarea"].includes(bookingField.type)
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
  if (isPartialSchema) {
    // Query Params can be completely invalid, try to preprocess as much of it in correct format but in worst case simply don't prefill instead of crashing
    return preprocessed.catch(() => {
      console.error("Failed to preprocess query params, prefilling will be skipped");
      return {};
    });
  }
  return preprocessed;
}
