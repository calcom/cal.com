import z from "zod";

import type { ALL_VIEWS } from "@calcom/features/form-builder/schema";
import { fieldTypesSchemaMap, dbReadResponseSchema } from "@calcom/features/form-builder/schema";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { bookingResponses, emailSchemaRefinement } from "@calcom/prisma/zod-utils";

type EventType = Parameters<typeof preprocess>[0]["eventType"];
// eslint-disable-next-line @typescript-eslint/ban-types
type View = ALL_VIEWS | (string & {});

export const bookingResponse = dbReadResponseSchema;
export const bookingResponsesDbSchema = z.record(dbReadResponseSchema);

const catchAllSchema = bookingResponsesDbSchema;

export const getBookingResponsesPartialSchema = ({
  eventType,
  view,
}: {
  eventType: EventType;
  view: View;
}) => {
  const schema = bookingResponses.unwrap().partial().and(catchAllSchema);

  return preprocess({ schema, eventType, isPartialSchema: true, view });
};

// Should be used when we know that not all fields responses are present
// - Can happen when we are parsing the prefill query string
// - Can happen when we are parsing a booking's responses (which was created before we added a new required field)
export default function getBookingResponsesSchema({ eventType, view }: { eventType: EventType; view: View }) {
  const schema = bookingResponses.and(z.record(z.any()));
  return preprocess({ schema, eventType, isPartialSchema: false, view });
}

// TODO: Move preprocess of `booking.responses` to FormBuilder schema as that is going to parse the fields supported by FormBuilder
// It allows anyone using FormBuilder to get the same preprocessing automatically
function preprocess<T extends z.ZodType>({
  schema,
  eventType,
  isPartialSchema,
  view: currentView,
}: {
  schema: T;
  // It is useful when we want to prefill the responses with the partial values. Partial can be in 2 ways
  // - Not all required fields are need to be provided for prefill.
  // - Even a field response itself can be partial so the content isn't validated e.g. a field with type="phone" can be given a partial phone number(e.g. Specifying the country code like +91)
  isPartialSchema: boolean;
  eventType: {
    bookingFields: (z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">) | null;
  };
  view: View;
}): z.ZodType<z.infer<T>, z.infer<T>, z.infer<T>> {
  const preprocessed = z.preprocess(
    (responses) => {
      const parsedResponses = z.record(z.any()).nullable().parse(responses) || {};
      const newResponses = {} as typeof parsedResponses;
      // if eventType has been deleted, we won't have bookingFields and thus we can't preprocess or validate them.
      if (!eventType.bookingFields) return parsedResponses;
      eventType.bookingFields.forEach((field) => {
        const value = parsedResponses[field.name];
        if (value === undefined) {
          // If there is no response for the field, then we don't need to do any processing
          return;
        }
        const views = field.views;
        const isFieldApplicableToCurrentView =
          currentView === "ALL_VIEWS" ? true : views ? views.find((view) => view.id === currentView) : true;
        if (!isFieldApplicableToCurrentView) {
          // If the field is not applicable in the current view, then we don't need to do any processing
          return;
        }
        const fieldTypeSchema = fieldTypesSchemaMap[field.type as keyof typeof fieldTypesSchemaMap];
        // TODO: Move all the schemas along with their respective types to fieldTypeSchema, that would make schemas shared across Routing Forms builder and Booking Question Formm builder
        if (fieldTypeSchema) {
          newResponses[field.name] = fieldTypeSchema.preprocess({
            response: value,
            isPartialSchema,
            field,
          });
          return;
        }
        if (field.type === "boolean") {
          // Turn a boolean in string to a real boolean
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

      return {
        ...parsedResponses,
        ...newResponses,
      };
    },
    schema.superRefine(async (responses, ctx) => {
      if (!eventType.bookingFields) {
        // if eventType has been deleted, we won't have bookingFields and thus we can't validate the responses.
        return;
      }
      for (const bookingField of eventType.bookingFields) {
        const value = responses[bookingField.name];
        const stringSchema = z.string();
        const emailSchema = isPartialSchema ? z.string() : z.string().refine(emailSchemaRefinement);
        const phoneSchema = isPartialSchema
          ? z.string()
          : z.string().refine(async (val) => {
              const { isValidPhoneNumber } = await import("libphonenumber-js");
              return isValidPhoneNumber(val);
            });
        // Tag the message with the input name so that the message can be shown at appropriate place
        const m = (message: string) => `{${bookingField.name}}${message}`;
        const views = bookingField.views;
        const isFieldApplicableToCurrentView =
          currentView === "ALL_VIEWS" ? true : views ? views.find((view) => view.id === currentView) : true;
        let hidden = bookingField.hidden;
        const numOptions = bookingField.options?.length ?? 0;
        if (bookingField.hideWhenJustOneOption) {
          hidden = hidden || numOptions <= 1;
        }
        // If the field is hidden, then it can never be required
        const isRequired = hidden ? false : isFieldApplicableToCurrentView ? bookingField.required : false;

        if ((isPartialSchema || !isRequired) && value === undefined) {
          continue;
        }

        if (isRequired && !isPartialSchema && !value) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`error_required_field`) });
          return;
        }

        if (bookingField.type === "email") {
          // Email RegExp to validate if the input is a valid email
          if (!emailSchema.safeParse(value).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: m("email_validation_error"),
            });
          }
          continue;
        }

        const fieldTypeSchema = fieldTypesSchemaMap[bookingField.type as keyof typeof fieldTypesSchemaMap];

        if (fieldTypeSchema) {
          fieldTypeSchema.superRefine({
            response: value,
            ctx,
            m,
            field: bookingField,
            isPartialSchema,
          });
          continue;
        }

        if (bookingField.type === "multiemail") {
          const emailsParsed = emailSchema.array().safeParse(value);

          if (isRequired && (!value || value.length === 0)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m(`error_required_field`) });
            continue;
          }

          if (!emailsParsed.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: m("email_validation_error"),
            });
            continue;
          }

          const emails = emailsParsed.data;
          emails.sort().some((item, i) => {
            if (item === emails[i + 1]) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("duplicate_email") });
              return true;
            }
          });
          continue;
        }

        if (bookingField.type === "checkbox" || bookingField.type === "multiselect") {
          if (!stringSchema.array().safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid array of strings") });
          }
          continue;
        }

        if (bookingField.type === "phone") {
          if (!(await phoneSchema.safeParseAsync(value)).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("invalid_number") });
          }
          continue;
        }

        if (bookingField.type === "boolean") {
          const schema = z.boolean();
          if (!schema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid Boolean") });
          }
          continue;
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
              return;
            }

            if (optionValue) {
              // `typeOfOptionInput` can be any of the main types. So, we the same validations should run for `optionValue`
              if (typeOfOptionInput === "phone") {
                if (!(await phoneSchema.safeParseAsync(optionValue)).success) {
                  ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("invalid_number") });
                }
              }
            }
          }
          continue;
        }

        // Use fieldTypeConfig.propsType to validate for propsType=="text" or propsType=="select" as in those cases, the response would be a string.
        // If say we want to do special validation for 'address' that can be added to `fieldTypesSchemaMap`
        if (["address", "text", "select", "number", "radio", "textarea"].includes(bookingField.type)) {
          const schema = stringSchema;
          if (!schema.safeParse(value).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: m("Invalid string") });
          }
          continue;
        }

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Can't parse unknown booking field type: ${bookingField.type}`,
        });
      }
    })
  );
  if (isPartialSchema) {
    // Query Params can be completely invalid, try to preprocess as much of it in correct format but in worst case simply don't prefill instead of crashing
    return preprocessed.catch(function (res?: { error?: unknown[] }) {
      console.error("Failed to preprocess query params, prefilling will be skipped", res?.error);
      return {};
    });
  }
  return preprocessed;
}
