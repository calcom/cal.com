import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { RoutingTrace } from "./RoutingTraceRepository.interface";
import type {
  IPendingRoutingTraceRepository,
  IPendingRoutingTraceRepositoryCreateArgs,
  PendingRoutingTraceRecord,
} from "./PendingRoutingTraceRepository.interface";

export class PrismaPendingRoutingTraceRepository
  implements IPendingRoutingTraceRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(args: IPendingRoutingTraceRepositoryCreateArgs): Promise<void> {
    await this.prisma.pendingRoutingTraces.create({
      data: {
        createdAt: new Date(),
        trace: args.trace as Prisma.InputJsonValue,
        formResponseId:
          "formResponseId" in args ? args.formResponseId : undefined,
        queuedFormResponseId:
          "queuedFormResponseId" in args
            ? args.queuedFormResponseId
            : undefined,
      },
    });
  }

  async findByFormResponseId(formResponseId: number): Promise<PendingRoutingTraceRecord | null> {
    const result = await this.prisma.pendingRoutingTraces.findUnique({
      where: { formResponseId },
    });
    if (!result) return null;
    return {
      ...result,
      trace: result.trace as RoutingTrace,
    };
  }

  async findByQueuedFormResponseId(
    queuedFormResponseId: string
  ): Promise<PendingRoutingTraceRecord | null> {
    const result = await this.prisma.pendingRoutingTraces.findUnique({
      where: { queuedFormResponseId },
    });
    if (!result) return null;
    return {
      ...result,
      trace: result.trace as RoutingTrace,
    };
  }
}
