import { GetUserReturnType } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import { CanActivate, ExecutionContext, Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";

import { PlatformOAuthClient, Webhook } from "@calcom/prisma/client";

@Injectable()
export class IsOAuthClientWebhookGuard implements CanActivate {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly oAuthClientRepository: OAuthClientRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { webhook: Webhook; oAuthClient: PlatformOAuthClient }>();
    const user = request.user as GetUserReturnType;
    const webhookId = request.params.webhookId;
    const oAuthClientId = request.params.clientId;

    if (!user || !webhookId || !oAuthClientId) {
      return false;
    }

    const oAuthClient = await this.oAuthClientRepository.getOAuthClient(oAuthClientId);

    if (!oAuthClient) {
      throw new NotFoundException(`OAuthClient (${oAuthClientId}) not found`);
    }

    const webhook = await this.webhooksService.getWebhookById(webhookId);

    if (oAuthClient?.organizationId !== user.movedToProfile?.organizationId) {
      return user.isSystemAdmin;
    }

    if (webhook.platformOAuthClientId !== oAuthClientId) {
      return false;
    }

    request.webhook = webhook;
    request.oAuthClient = oAuthClient;

    return true;
  }
}
