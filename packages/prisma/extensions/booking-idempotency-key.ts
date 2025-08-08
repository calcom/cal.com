import { Prisma } from "@prisma/client";

import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { BookingStatus } from "@calcom/prisma/enums";

export function bookingIdempotencyKeyExtension() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          if (args.data.status === BookingStatus.ACCEPTED) {
            const idempotencyKey = IdempotencyKeyService.generate({
              startTime: args.data.startTime,
              endTime: args.data.endTime,
              userId: args.data.user?.connect?.id,
              reassignedById: args.data.reassignById,
            });
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
