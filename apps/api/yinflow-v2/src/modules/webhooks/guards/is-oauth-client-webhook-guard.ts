import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

import { PlatformOAuthClient, Webhook } from "@calcom/prisma/client";

import { ApiAuthGuardUser } from "../../auth/strategies/api-auth/api-auth.strategy";
import { OAuthClientRepository } from "../../oauth-clients/oauth-client.repository";
import { UsersService } from "../../users/services/users.service";
import { WebhooksService } from "../../webhooks/services/webhooks.service";

@Injectable()
export class IsOAuthClientWebhookGuard implements CanActivate {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly oAuthClientRepository: OAuthClientRepository,
    private usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { webhook: Webhook; oAuthClient: PlatformOAuthClient }>();
    const user = request.user as ApiAuthGuardUser;
    const webhookId = request.params.webhookId;
    const oAuthClientId = request.params.clientId;
    const organizationId = this.usersService.getUserMainOrgId(user);

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    if (!webhookId) {
      throw new BadRequestException("webhookId parameter not specified in the request");
    }

    if (!oAuthClientId) {
      throw new BadRequestException("oAuthClientId parameter not specified in the request");
    }

    const oAuthClient = await this.oAuthClientRepository.getOAuthClient(oAuthClientId);

    if (!oAuthClient) {
      throw new NotFoundException(`OAuthClient (${oAuthClientId}) not found`);
    }

    const webhook = await this.webhooksService.getWebhookById(webhookId);

    if (oAuthClient?.organizationId !== organizationId) {
      return user.isSystemAdmin;
    }

    if (webhook.platformOAuthClientId !== oAuthClientId) {
      throw new ForbiddenException("Webhook does not belong to this oAuthClient");
    }

    request.webhook = webhook;
    request.oAuthClient = oAuthClient;

    return true;
  }
}
