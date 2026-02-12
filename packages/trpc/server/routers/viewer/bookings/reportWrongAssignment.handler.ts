import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { WrongAssignmentReportService } from "@calcom/features/bookings/services/WrongAssignmentReportService";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TReportWrongAssignmentInputSchema } from "./reportWrongAssignment.schema";

type ReportWrongAssignmentOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TReportWrongAssignmentInputSchema;
};

export const reportWrongAssignmentHandler = async ({ ctx, input }: ReportWrongAssignmentOptions) => {
  const { user } = ctx;

  const bookingAccessService = new BookingAccessService(prisma);
  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingUid: input.bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const service = new WrongAssignmentReportService({
    bookingRepo: new BookingRepository(prisma),
    wrongAssignmentReportRepo: new WrongAssignmentReportRepository(prisma),
    teamRepo: new TeamRepository(prisma),
  });

  return service.report({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userLocale: user.locale ?? "en",
    bookingUid: input.bookingUid,
    correctAssignee: input.correctAssignee,
    additionalNotes: input.additionalNotes,
  });
};
