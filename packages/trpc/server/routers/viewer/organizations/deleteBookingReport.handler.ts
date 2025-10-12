import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteBookingReportInputSchema } from "./deleteBookingReport.schema";

type DeleteBookingReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteBookingReportInputSchema;
};

export const deleteBookingReportHandler = async ({ ctx, input }: DeleteBookingReportOptions) => {
  const { user } = ctx;

  if (!user.organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User must be part of an organization",
    });
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  await bookingReportRepo.deleteReport({
    reportId: input.reportId,
    organizationId: user.organizationId,
  });

  return { success: true };
};

export default deleteBookingReportHandler;
