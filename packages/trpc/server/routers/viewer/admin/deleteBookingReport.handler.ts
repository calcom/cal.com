import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteBookingReportInputSchema } from "./deleteBookingReport.schema";

type DeleteBookingReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteBookingReportInputSchema;
};

export const deleteBookingReportHandler = async ({ input }: DeleteBookingReportOptions) => {
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  await bookingReportRepo.deleteReport({
    reportId: input.reportId,
  });

  return { success: true };
};

export default deleteBookingReportHandler;
