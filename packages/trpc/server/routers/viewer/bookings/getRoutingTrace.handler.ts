import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { RoutingTracePresenter } from "@calcom/features/routing-trace/presenters/RoutingTracePresenter";
import { PrismaRoutingTraceRepository } from "@calcom/features/routing-trace/repositories/PrismaRoutingTraceRepository";
import type { RoutingTrace } from "@calcom/features/routing-trace/repositories/RoutingTraceRepository.interface";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetRoutingTraceInputSchema } from "./getRoutingTrace.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetRoutingTraceInputSchema;
};

export const getRoutingTraceHandler = async ({ ctx, input }: Options) => {
  const bookingAccessService = new BookingAccessService(prisma);

  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: ctx.user.id,
    bookingUid: input.bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const repository = new PrismaRoutingTraceRepository(prisma);

  // Try permanent RoutingTrace first (exists for round robin bookings)
  const traceRecord = await repository.findByBookingUid(input.bookingUid);

  if (traceRecord) {
    return { steps: RoutingTracePresenter.present(traceRecord.trace) };
  }

  // Fall back to PendingRoutingTrace via the booking's form response
  const formResponse = await prisma.app_RoutingForms_FormResponse.findFirst({
    where: { routedToBookingUid: input.bookingUid },
    include: { pendingRoutingTrace: true },
  });

  if (formResponse?.pendingRoutingTrace?.trace) {
    const trace = formResponse.pendingRoutingTrace.trace as unknown as RoutingTrace;
    return { steps: RoutingTracePresenter.present(trace) };
  }

  return { steps: [] };
};
