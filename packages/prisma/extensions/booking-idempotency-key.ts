import { v5 as uuidv5 } from "uuid";
import { Prisma } from "../client";
import { BookingStatus } from "../enums";

type IdempotencyKeySeed = {
  startTime: Date | string;
  endTime: Date | string;
  userId?: number | null;
  reassignedById?: number | null;
};

function generateIdempotencyKey({ startTime, endTime, userId, reassignedById }: IdempotencyKeySeed) {
  return uuidv5(
    `${startTime.valueOf()}.${endTime.valueOf()}.${userId}${reassignedById ? `.${reassignedById}` : ""}`,
    uuidv5.URL
  );
}

// Prisma accepts either scalar form (`userId: 5`) or relation-connect form
// (`user: { connect: { id: 5 } }`); both are present in current call sites.
function readUserId(data: Prisma.BookingCreateInput | Prisma.BookingUncheckedCreateInput) {
  if ("userId" in data && typeof data.userId === "number") return data.userId;
  if ("user" in data && data.user && "connect" in data.user) {
    return data.user.connect?.id ?? null;
  }
  return null;
}

function readReassignedById(data: Prisma.BookingCreateInput | Prisma.BookingUncheckedCreateInput) {
  if ("reassignById" in data && typeof data.reassignById === "number") return data.reassignById;
  if ("reassignBy" in data && data.reassignBy && "connect" in data.reassignBy) {
    return data.reassignBy.connect?.id ?? null;
  }
  return null;
}

function isTerminalCancel(status: unknown) {
  return status === BookingStatus.CANCELLED || status === BookingStatus.REJECTED;
}

function isActiveBookingStatus(status: unknown) {
  return (
    status === BookingStatus.ACCEPTED ||
    status === BookingStatus.PENDING ||
    status === BookingStatus.AWAITING_HOST
  );
}

export function bookingIdempotencyKeyExtension() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          // Stamp on every active status, not just ACCEPTED: bookings created as
          // PENDING/AWAITING_HOST and later confirmed via update() would otherwise
          // end up ACCEPTED with idempotencyKey = null, defeating the unique constraint.
          if (isActiveBookingStatus(args.data.status)) {
            args.data.idempotencyKey = generateIdempotencyKey({
              startTime: args.data.startTime,
              endTime: args.data.endTime,
              userId: readUserId(args.data),
              reassignedById: readReassignedById(args.data),
            });
          }
          return query(args);
        },
        async update({ args, query }) {
          if (isTerminalCancel(args.data.status)) {
            args.data.idempotencyKey = null;
          }
          return query(args);
        },
        async updateMany({ args, query }) {
          if (isTerminalCancel(args.data.status)) {
            args.data.idempotencyKey = null;
          }
          return query(args);
        },
      },
    },
  });
}
