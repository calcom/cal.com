import type { PrismaClient } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";

import { getBookingHistoryViewerService } from "@calcom/features/booking-audit/di/BookingHistoryViewerService.container";
import type { DisplayBookingAuditLog } from "@calcom/features/booking-audit/lib/service/BookingAuditViewerService";
import { ErrorWithCode } from "@calcom/lib/errors";

import type { TrpcSessionUser } from "../../../types";
import type { TGetBookingHistoryInputSchema } from "./getBookingHistory.schema";

type GetBookingHistoryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetBookingHistoryInputSchema;
};

export const getBookingHistoryHandler = async ({
  ctx,
  input,
}: GetBookingHistoryOptions): Promise<{
  bookingUid: string;
  auditLogs: DisplayBookingAuditLog[];
}> => {
  const { user } = ctx;
  const { bookingUid } = input;

  const bookingHistoryViewerService = getBookingHistoryViewerService();

  try {
    const result = await bookingHistoryViewerService.getHistoryForBooking({
      bookingUid,
      userId: user.id,
      userEmail: user.email,
      userTimeZone: user.timeZone,
      organizationId: user.organizationId,
    });

    return result;
  } catch (error) {
    if (error instanceof ErrorWithCode) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: error.message,
      });
    }
    throw error;
  }
};
