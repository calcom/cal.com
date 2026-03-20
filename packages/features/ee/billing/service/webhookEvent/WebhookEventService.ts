import { WebhookEventStatus } from "@calcom/prisma/enums";
import type { PrismaWebhookEventRepository } from "../../repository/webhookEvent/PrismaWebhookEventRepository";

const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000;

export interface WebhookEventServiceDeps {
  webhookEventRepository: PrismaWebhookEventRepository;
}

export class WebhookEventService {
  constructor(private deps: WebhookEventServiceDeps) {}

  async tryAcquire(externalEventId: string): Promise<{ id: string } | null> {
    const created = await this.deps.webhookEventRepository.create(externalEventId);
    if (created) return created;

    const staleThreshold = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS);
    return this.deps.webhookEventRepository.reacquireStale(externalEventId, staleThreshold);
  }

  async markCompleted(id: string): Promise<void> {
    await this.deps.webhookEventRepository.updateStatus(id, WebhookEventStatus.COMPLETED);
  }

  async markFailed(id: string): Promise<void> {
    await this.deps.webhookEventRepository.updateStatus(id, WebhookEventStatus.FAILED);
  }
}
