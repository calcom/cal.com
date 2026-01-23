import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type {
  IPendingRoutingTraceRepository,
  IPendingRoutingTraceRepositoryCreateArgs,
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
}
