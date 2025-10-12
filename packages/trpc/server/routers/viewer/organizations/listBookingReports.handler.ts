import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TListBookingReportsInputSchema } from "./listBookingReports.schema";

type ListBookingReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListBookingReportsInputSchema;
};

export const listBookingReportsHandler = async ({ ctx, input }: ListBookingReportsOptions) => {
  const { user } = ctx;

  const organizationId = user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to view booking reports",
    });
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  const result = await bookingReportRepo.findAllReportedBookings({
    organizationId,
    skip: input.offset,
    take: input.limit,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });

  return result;
};

export default listBookingReportsHandler;
