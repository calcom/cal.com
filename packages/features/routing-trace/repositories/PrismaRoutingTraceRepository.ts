import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type {
  IRoutingTraceRepository,
  IRoutingTraceRepositoryCreateArgs,
  RoutingTrace,
  RoutingTraceRecord,
} from "./RoutingTraceRepository.interface";

export class PrismaRoutingTraceRepository implements IRoutingTraceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(args: IRoutingTraceRepositoryCreateArgs): Promise<RoutingTraceRecord> {
    const result = await this.prisma.routingTrace.create({
      data: {
        createdAt: new Date(),
        trace: args.trace as Prisma.InputJsonValue,
        formResponseId: args.formResponseId,
        queuedFormResponseId: args.queuedFormResponseId,
        bookingUid: args.bookingUid,
        assignmentReasonId: args.assignmentReasonId,
      },
    });
    return {
      ...result,
      trace: result.trace as RoutingTrace,
    };
  }

  async findByBookingUid(bookingUid: string): Promise<RoutingTraceRecord | null> {
    const result = await this.prisma.routingTrace.findFirst({
      where: { bookingUid },
    });
    if (!result) return null;
    return {
      ...result,
      trace: result.trace as RoutingTrace,
    };
  }
}
