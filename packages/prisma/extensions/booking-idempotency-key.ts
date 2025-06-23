import { Prisma } from "@prisma/client";
import { v5 as uuidv5 } from "uuid";

import { BookingStatus } from "@calcom/prisma/enums";

export function bookingIdempotencyKeyExtension() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          if (args.data.status === BookingStatus.ACCEPTED) {
            const idempotencyKey = uuidv5(
              `${args.data.startTime.valueOf()}.${args.data.endTime.valueOf()}.${
                args.data?.user?.connect?.id
              }${args.data?.reassignById ? `.${args.data.reassignById}` : ""}`,
              uuidv5.URL
            );
            args.data.idempotencyKey = idempotencyKey;
          }
          return query(args);
        },
        async update({ args, query }) {
          if (args.data.status === BookingStatus.CANCELLED || args.data.status === BookingStatus.REJECTED) {
            args.data.idempotencyKey = null;
          }
          return query(args);
        },
        async updateMany({ args, query }) {
          if (args.data.status === BookingStatus.CANCELLED || args.data.status === BookingStatus.REJECTED) {
            args.data.idempotencyKey = null;
          }
          return query(args);
        },
      },
    },
  });
}
