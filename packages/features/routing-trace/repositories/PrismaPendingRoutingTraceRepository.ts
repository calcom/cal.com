import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type {
  IPendingRoutingTraceRepository,
  IPendingRoutingTraceRepositoryCreateArgs,
  PendingRoutingTraceRecord,
} from "./PendingRoutingTraceRepository.interface";
import type { RoutingStep, RoutingTrace } from "./RoutingTraceRepository.interface";

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

  async findById(id: string): Promise<PendingRoutingTraceRecord | null> {
    const result = await this.prisma.pendingRoutingTrace.findUnique({
      where: { id },
    });
    if (!result) return null;
    return {
      ...result,
      trace: result.trace as RoutingTrace,
    };
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

  async appendSteps(
    lookup: { formResponseId: number } | { queuedFormResponseId: string },
    steps: RoutingTrace
  ): Promise<boolean> {
    const where =
      "formResponseId" in lookup
        ? { formResponseId: lookup.formResponseId }
        : { queuedFormResponseId: lookup.queuedFormResponseId };

    const existing = await this.prisma.pendingRoutingTrace.findUnique({ where });
    if (!existing) return false;

    const existingSteps = (existing.trace as RoutingStep[]) ?? [];

    // Deduplicate by (domain, step, timestamp) to avoid appending the exact
    // same trace steps twice (e.g. if this method is called multiple times for
    // the same CRM invocation), while still allowing a second CRM lookup
    // (booking-page host filter / tiebreaker) to append its steps even though
    // the first lookup (routing-form evaluation) already added salesforce-domain steps.
    const existingKeys = new Set(existingSteps.map((s) => `${s.domain}:${s.step}:${s.timestamp}`));
    const newSteps = steps.filter((s) => !existingKeys.has(`${s.domain}:${s.step}:${s.timestamp}`));

    if (newSteps.length === 0) return true;

    await this.prisma.pendingRoutingTrace.update({
      where: { id: existing.id },
      data: { trace: [...existingSteps, ...newSteps] as Prisma.InputJsonValue },
    });
    return true;
  }

  async promoteToBooking(args: { pendingTraceId: string; bookingUid: string }): Promise<void> {
    const pending = await this.prisma.pendingRoutingTrace.findUnique({
      where: { id: args.pendingTraceId },
    });
    if (!pending || pending.trace === null) return;

    await this.prisma.routingTrace.create({
      data: {
        trace: pending.trace,
        bookingUid: args.bookingUid,
      },
    });
    await this.prisma.pendingRoutingTrace.delete({
      where: { id: pending.id },
    });
  }
}
