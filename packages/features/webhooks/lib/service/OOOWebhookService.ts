import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { OOOCreatedDTO } from "../dto/types";
import type { ITasker, ILogger } from "../interface/infrastructure";
import type { IWebhookRepository } from "../interface/services";
import type { IWebhookNotifier } from "../interface/webhook";
import { WebhookService } from "./WebhookService";

export class OOOWebhookService extends WebhookService {
  constructor(
    private readonly notifier: IWebhookNotifier,
    repository: IWebhookRepository,
    tasker: ITasker,
    logger: ILogger
  ) {
    super(repository, tasker, logger);
  }

  async emitOOOCreated(params: {
    oooEntry: {
      id: number;
      start: string;
      end: string;
      createdAt: string;
      updatedAt: string;
      notes: string | null;
      reason: {
        emoji?: string;
        reason?: string;
      };
      reasonId: number;
      user: {
        id: number;
        name: string | null;
        username: string | null;
        timeZone: string;
        email: string;
      };
      toUser: {
        id: number;
        name?: string | null;
        username?: string | null;
        email?: string;
        timeZone?: string;
      } | null;
      uuid: string;
    };
    userId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: OOOCreatedDTO = {
      triggerEvent: WebhookTriggerEvents.OOO_CREATED,
      createdAt: new Date().toISOString(),
      userId: params.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      oooEntry: params.oooEntry,
    };

    await this.notifier.emitWebhook(dto, params.isDryRun);
  }
}
