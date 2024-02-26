import { Prisma } from "@prisma/client";
import { v5 as uuidv5 } from "uuid";

import { BookingStatus } from "@calcom/prisma/enums";

export function bookingIdempotencyKeyExtension() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          const uniqueEmailJoinInput: string[] = [];
          if (args.data.attendees?.create && !Array.isArray(args.data.attendees?.create)) {
            uniqueEmailJoinInput.push(args.data.attendees?.create.email);
          }
          if (args.data.attendees?.createMany && Array.isArray(args.data.attendees?.createMany.data)) {
            uniqueEmailJoinInput.push(...args.data.attendees?.createMany.data.map((record) => record.email));
          }
          const idempotencyKey = uuidv5(
            `${
              args.data.eventType?.connect?.id
            }.${args.data.startTime.valueOf()}.${args.data.endTime.valueOf()}.${uniqueEmailJoinInput.join(
              ","
            )}`,
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
