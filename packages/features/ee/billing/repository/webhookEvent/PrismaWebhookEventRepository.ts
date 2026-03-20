import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { WebhookEventStatus } from "@calcom/prisma/enums";

export class PrismaWebhookEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(externalEventId: string): Promise<{ id: string } | null> {
    try {
      const event = await this.prisma.webhookEvent.create({
        data: { externalEventId, status: WebhookEventStatus.PROCESSING },
        select: { id: true },
      });
      return event;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return null;
      }
      throw error;
    }
  }

  async reacquireStale(externalEventId: string, staleThreshold: Date): Promise<{ id: string } | null> {
    const results = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        UPDATE "WebhookEvent"
        SET "status" = ${WebhookEventStatus.PROCESSING}::"WebhookEventStatus", "updatedAt" = NOW()
        WHERE "externalEventId" = ${externalEventId}
          AND (
            ("status" = ${WebhookEventStatus.PROCESSING}::"WebhookEventStatus" AND "updatedAt" < ${staleThreshold})
            OR "status" = ${WebhookEventStatus.FAILED}::"WebhookEventStatus"
          )
        RETURNING "id"
      `
    );

    return results.length > 0 ? { id: results[0].id } : null;
  }

  async updateStatus(id: string, status: WebhookEventStatus): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: { status },
    });
  }
}
