import { z } from "zod";

import {
  bookingCreateSchemaLegacyPropsForApi,
  bookingCreateBodySchemaForApi,
  extendedBookingCreateBody,
} from "@calcom/prisma/zod-utils";

import getBookingResponsesSchema from "./getBookingResponsesSchema";
import type { getEventTypesFromDB } from "./handleNewBooking";

const getBookingDataSchema = (
  rescheduleUid: string | undefined,
  isNotAnApiCall: boolean,
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>
) => {
  const responsesSchema = getBookingResponsesSchema({
    eventType: {
      bookingFields: eventType.bookingFields,
    },
    view: rescheduleUid ? "reschedule" : "booking",
  });
  const bookingDataSchema = isNotAnApiCall
    ? extendedBookingCreateBody.merge(
        z.object({
          responses: responsesSchema,
        })
      )
    : bookingCreateBodySchemaForApi
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
  return bookingDataSchema;
};

export default getBookingDataSchema;
