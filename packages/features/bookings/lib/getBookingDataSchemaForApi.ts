import { z } from "zod";

import {
  bookingCreateBodySchemaForApi,
  bookingCreateSchemaLegacyPropsForApi,
} from "./bookingCreateBodySchema";
import type { getBookingFieldsWithSystemFields } from "./getBookingFields";
import getBookingResponsesSchema from "./getBookingResponsesSchema";

const getBookingDataSchemaForApi = ({
  view = "booking",
  bookingFields,
}: {
  view: "booking" | "reschedule";
  bookingFields: Awaited<ReturnType<typeof getBookingFieldsWithSystemFields>>;
}) => {
  const responsesSchema = getBookingResponsesSchema({ bookingFields, view });
  return bookingCreateBodySchemaForApi
    .merge(
      z.object({
        responses: responsesSchema.optional(),
      })
    )
    .superRefine((val, ctx) => {
      if (val.responses && val.customInputs) {
        ctx.addIssue({
          code: "custom",
          message:
            "Don't use both customInputs and responses. `customInputs` is only there for legacy support.",
        });
        return;
      }
      const legacyProps = Object.keys(bookingCreateSchemaLegacyPropsForApi.shape);

      if (val.responses) {
        const unwantedProps: string[] = [];
        legacyProps.forEach((legacyProp) => {
          if (typeof val[legacyProp as keyof typeof val] !== "undefined") {
            console.error(
              `Deprecated: Unexpected falsy value for: ${unwantedProps.join(
                ","
              )}. They can't be used with \`responses\`. This will become a 400 error in the future.`
            );
          }
          if (val[legacyProp as keyof typeof val]) {
            unwantedProps.push(legacyProp);
          }
        });
        if (unwantedProps.length) {
          ctx.addIssue({
            code: "custom",
            message: `Legacy Props: ${unwantedProps.join(",")}. They can't be used with \`responses\``,
          });
          return;
        }
      } else if (val.customInputs) {
        const { success } = bookingCreateSchemaLegacyPropsForApi.safeParse(val);
        if (!success) {
          ctx.addIssue({
            code: "custom",
            message: `With \`customInputs\` you must specify legacy props ${legacyProps.join(",")}`,
          });
        }
      }
    });
};

export default getBookingDataSchemaForApi;
