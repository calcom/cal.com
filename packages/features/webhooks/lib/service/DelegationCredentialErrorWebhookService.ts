import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { DelegationCredentialErrorDTO } from "../dto/types";
import type { ITasker, ILogger } from "../interface/infrastructure";
import type { IWebhookRepository } from "../interface/services";
import type { IWebhookNotifier } from "../interface/webhook";
import { WebhookService } from "./WebhookService";

export class DelegationCredentialErrorWebhookService extends WebhookService {
  constructor(
    private readonly notifier: IWebhookNotifier,
    repository: IWebhookRepository,
    tasker: ITasker,
    logger: ILogger
  ) {
    super(repository, tasker, logger);
  }

  async emitDelegationCredentialError(params: {
    error: {
      type: string;
      message: string;
    };
    credential: {
      id: number;
      type: string;
      appId: string;
    };
    user: {
      id: number;
      email: string;
      name: string | null;
    };
    userId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: DelegationCredentialErrorDTO = {
      triggerEvent: WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
      createdAt: new Date().toISOString(),
      userId: params.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      error: params.error,
      credential: params.credential,
      user: params.user,
    };

    await this.notifier.emitWebhook(dto, params.isDryRun);
  }
}
