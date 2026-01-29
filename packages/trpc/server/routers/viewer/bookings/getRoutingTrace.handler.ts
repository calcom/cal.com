import { RoutingTracePresenter } from "@calcom/features/routing-trace/presenters/RoutingTracePresenter";
import { PrismaRoutingTraceRepository } from "@calcom/features/routing-trace/repositories/PrismaRoutingTraceRepository";
import type { RoutingTrace } from "@calcom/features/routing-trace/repositories/RoutingTraceRepository.interface";
import { prisma } from "@calcom/prisma";

import type { TGetRoutingTraceInputSchema } from "./getRoutingTrace.schema";

type Options = {
  input: TGetRoutingTraceInputSchema;
};

export const getRoutingTraceHandler = async ({ input }: Options) => {
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
