import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TListReportsInputSchema } from "./listReports.schema";

type ListReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListReportsInputSchema;
};

export const listReportsHandler = async ({ input }: ListReportsOptions) => {
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  // Get ALL reports system-wide (no organizationId filter)
  const result = await bookingReportRepo.findAllReportedBookings({
    skip: input.offset,
    take: input.limit,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });

  return result;
};

export default listReportsHandler;
