import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { GetUserReturnType } from "src/modules/auth/decorators/get-user/get-user.decorator";
import { OAuthClientRepository } from "src/modules/oauth-clients/oauth-client.repository";
import { UsersService } from "src/modules/users/services/users.service";
import { WebhooksService } from "src/modules/webhooks/services/webhooks.service";

import { PlatformOAuthClient, Webhook } from "@calcom/prisma/client";

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
    const user = request.user as GetUserReturnType;
    const webhookId = request.params.webhookId;
    const oAuthClientId = request.params.clientId;
    const organizationId = this.usersService.getUserMainOrgId(user);

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    if (!webhookId) {
      throw new BadRequestException("webhookId parameter not specified in the request");
    }

    if (!webhookId) {
      throw new BadRequestException("oAuthClientId parameter not specified in the request");
    }

    if (!user || !webhookId || !oAuthClientId) {
      return false;
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
