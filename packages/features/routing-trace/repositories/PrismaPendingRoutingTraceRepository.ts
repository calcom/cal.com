import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type {
  IPendingRoutingTraceRepository,
  IPendingRoutingTraceRepositoryCreateArgs,
  PendingRoutingTraceRecord,
} from "./PendingRoutingTraceRepository.interface";
import type { RoutingTrace } from "./RoutingTraceRepository.interface";

export class PrismaPendingRoutingTraceRepository implements IPendingRoutingTraceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(args: IPendingRoutingTraceRepositoryCreateArgs): Promise<void> {
    await this.prisma.pendingRoutingTrace.create({
      data: {
        createdAt: new Date(),
        trace: args.trace as Prisma.InputJsonValue,
        formResponseId: "formResponseId" in args ? args.formResponseId : undefined,
        queuedFormResponseId: "queuedFormResponseId" in args ? args.queuedFormResponseId : undefined,
      },
    });
  }

  async findByFormResponseId(formResponseId: number): Promise<PendingRoutingTraceRecord | null> {
    const result = await this.prisma.pendingRoutingTrace.findUnique({
      where: { formResponseId },
    });
    if (!result) return null;
    return {
      ...result,
      trace: result.trace as RoutingTrace,
    };
  }

  async findByQueuedFormResponseId(queuedFormResponseId: string): Promise<PendingRoutingTraceRecord | null> {
    const result = await this.prisma.pendingRoutingTrace.findUnique({
      where: { queuedFormResponseId },
    });
    if (!result) return null;
    return {
      ...result,
      trace: result.trace as RoutingTrace,
    };
  }

  async linkToFormResponse(args: { queuedFormResponseId: string; formResponseId: number }): Promise<void> {
    await this.prisma.pendingRoutingTrace.update({
      where: { queuedFormResponseId: args.queuedFormResponseId },
      data: { formResponseId: args.formResponseId },
    });
  }
}
