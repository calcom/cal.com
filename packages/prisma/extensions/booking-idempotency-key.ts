import { v5 as uuidv5 } from "uuid";

import { Prisma } from "../client";
import { BookingStatus } from "../enums";

function generateIdempotencyKey({
  startTime,
  endTime,
  userId,
  reassignedById,
}: {
  startTime: Date | string;
  endTime: Date | string;
  userId?: number;
  reassignedById?: number | null;
}) {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  return uuidv5(
    `${startMs}.${endMs}.${userId ?? ""}${reassignedById ? `.${reassignedById}` : ""}`,
    uuidv5.URL
  );
}

export function bookingIdempotencyKeyExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        booking: {
          async create({ args, query }) {
            if (args.data.status === BookingStatus.ACCEPTED) {
              args.data.idempotencyKey = generateIdempotencyKey({
                startTime: args.data.startTime,
                endTime: args.data.endTime,
                userId: args.data.userId ?? args.data.user?.connect?.id,
                reassignedById: args.data.reassignedById ?? args.data.reassignById,
              });
            }
            return query(args);
          },
          async update({ args, query }) {
            if (
              args.data.status === BookingStatus.CANCELLED ||
              args.data.status === BookingStatus.REJECTED
            ) {
              args.data.idempotencyKey = null;
            } else if (
              args.data.status === BookingStatus.ACCEPTED &&
              !args.data.idempotencyKey
            ) {
              let startTime = args.data.startTime as Date | string | undefined;
              let endTime = args.data.endTime as Date | string | undefined;
              let userId =
                typeof args.data.userId === "number"
                  ? args.data.userId
                  : args.data.user?.connect?.id;
              let reassignedById =
                typeof args.data.reassignedById === "number"
                  ? args.data.reassignedById
                  : args.data.reassignById;

              // If startTime or endTime are missing from update payload, query DB for existing record
              if (!startTime || !endTime) {
                const existing = await client.booking.findUnique({
                  where: args.where,
                  select: {
                    startTime: true,
                    endTime: true,
                    userId: true,
                    reassignedById: true,
                  },
                });

                if (existing) {
                  startTime = startTime ?? existing.startTime;
                  endTime = endTime ?? existing.endTime;
                  userId = userId ?? existing.userId;
                  reassignedById = reassignedById ?? existing.reassignedById;
                }
              }

              if (startTime && endTime) {
                args.data.idempotencyKey = generateIdempotencyKey({
                  startTime,
                  endTime,
                  userId,
                  reassignedById,
                });
              }
            }
            return query(args);
          },
          async updateMany({ args, query }) {
            if (
              args.data.status === BookingStatus.CANCELLED ||
              args.data.status === BookingStatus.REJECTED
            ) {
              args.data.idempotencyKey = null;
            }
            return query(args);
          },
        },
      },
    })
  );
}
