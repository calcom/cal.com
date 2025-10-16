import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TListBookingReportsInputSchema } from "./listBookingReports.schema";

type ListBookingReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListBookingReportsInputSchema;
};

export const listBookingReportsHandler = async ({ input }: ListBookingReportsOptions) => {
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  const result = await bookingReportRepo.findAllReportedBookings({
    skip: input.offset,
    take: input.limit,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });

  return result;
};

export default listBookingReportsHandler;
