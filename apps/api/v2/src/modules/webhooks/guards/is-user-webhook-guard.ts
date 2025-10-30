import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";

import type { Webhook } from "@calcom/prisma/client";

@Injectable()
export class IsUserWebhookGuard implements CanActivate {
  constructor(private readonly webhooksService: WebhooksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { webhook: Webhook }>();
    const user = request.user as ApiAuthGuardUser;
    const webhookId = request.params.webhookId;

    if (!user) {
      throw new ForbiddenException("IsUserWebhookGuard - No user associated with the request.");
    }

    if (!webhookId) {
      throw new ForbiddenException("IsUserWebhookGuard - No webhook id found in request params.");
    }

    const webhook = await this.webhooksService.getWebhookById(webhookId);

    if (webhook.userId !== user.id && !user.isSystemAdmin) {
      throw new ForbiddenException(
        `IsUserWebhookGuard - user with id=(${user.id}) is not the owner of webhook with id=(${webhookId})`
      );
    }

    request.webhook = webhook;
    return true;
  }
}
