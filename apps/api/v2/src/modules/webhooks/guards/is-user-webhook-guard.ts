import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";

import { Webhook } from "@calcom/prisma/client";

@Injectable()
export class IsUserWebhookGuard implements CanActivate {
  constructor(private readonly webhooksService: WebhooksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { webhook: Webhook }>();
    const user = request.user as ApiAuthGuardUser;
    const webhookId = request.params.webhookId;

    if (!user || !webhookId) {
      return false;
    }

    const webhook = await this.webhooksService.getWebhookById(webhookId);

    if (webhook.userId !== user.id) {
      return user.isSystemAdmin;
    }

    request.webhook = webhook;

    return true;
  }
}
