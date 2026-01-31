import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { THasWrongAssignmentReportInputSchema } from "./hasWrongAssignmentReport.schema";

type HasWrongAssignmentReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THasWrongAssignmentReportInputSchema;
};

export const hasWrongAssignmentReportHandler = async ({ ctx, input }: HasWrongAssignmentReportOptions) => {
  const { user } = ctx;
  const { bookingUid } = input;

  const bookingAccessService = new BookingAccessService(prisma);
  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You don't have access to this booking" });
  }

  const repo = new WrongAssignmentReportRepository(prisma);
  return { hasReport: await repo.existsByBookingUid(bookingUid) };
};
