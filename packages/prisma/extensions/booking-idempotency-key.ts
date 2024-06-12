import { Prisma } from "@prisma/client";
import { v5 as uuidv5 } from "uuid";

import { BookingStatus } from "@calcom/prisma/enums";

export function bookingIdempotencyKeyExtension() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          const uniqueJoinInput: string[] = [];
          if (
            args.data.attendees?.create &&
            !Array.isArray(args.data.attendees?.create) &&
            args.data.attendees?.create.email
          ) {
            uniqueJoinInput.push(args.data.attendees?.create.email);
          }

          // Check for phone numbers in single attendee create
          if (
            args.data.attendees?.create &&
            !Array.isArray(args.data.attendees?.create) &&
            args.data.attendees?.create.phoneNumber
          ) {
            uniqueJoinInput.push(args.data.attendees?.create.phoneNumber);
          }

          if (args.data.attendees?.createMany && Array.isArray(args.data.attendees?.createMany.data)) {
            uniqueJoinInput.push(
              ...args.data.attendees?.createMany.data
                .map((record) => record.email)
                .filter((email): email is string => !!email)
            );

            // Check for phone numbers in attendees createMany
            uniqueJoinInput.push(
              ...args.data.attendees?.createMany.data
                .map((record) => record.phoneNumber)
                .filter((phoneNumber): phoneNumber is string => !!phoneNumber)
            );
          }

          const idempotencyKey = uuidv5(
            `${
              args.data.eventType?.connect?.id
            }.${args.data.startTime.valueOf()}.${args.data.endTime.valueOf()}.${uniqueJoinInput.join(",")}`,
            uuidv5.URL
          );
          args.data.idempotencyKey = idempotencyKey;
          return query(args);
        },
        async update({ args, query }) {
          if (args.data.status === BookingStatus.CANCELLED || args.data.status === BookingStatus.REJECTED) {
            args.data.idempotencyKey = null;
          }
          return query(args);
        },
      },
    },
  });
}
