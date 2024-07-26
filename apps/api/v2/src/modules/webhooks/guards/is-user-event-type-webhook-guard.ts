import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { GetUserReturnType } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventType, Webhook } from "@prisma/client";
import { Request } from "express";

@Injectable()
export class IsUserEventTypeWebhookGuard implements CanActivate {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly eventtypesRepository: EventTypesRepository_2024_06_14
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { webhook: Webhook } & { eventType: EventType }>();
    const user = request.user as GetUserReturnType;
    const webhookId = request.params.webhookId;
    const eventTypeId = request.params.eventTypeId;

    if (!user) {
      return false;
    }

    if (eventTypeId) {
      const eventType = await this.eventtypesRepository.getEventTypeById(parseInt(eventTypeId));
      if (!eventType) {
        throw new NotFoundException(`Event type (${eventTypeId}) not found`);
      }
      if (eventType.userId !== user.id && !user.isSystemAdmin) {
        throw new BadRequestException(`User (${user.id}) is not the owner of event type (${eventTypeId})`);
      }
      request.eventType = eventType;
    }

    if (webhookId) {
      const webhook = await this.webhooksService.getWebhookById(webhookId);
      if (!webhook.eventTypeId || webhook.eventTypeId !== parseInt(eventTypeId)) {
        throw new BadRequestException(
          `Webhook (${webhookId}) is not associated with event type (${eventTypeId})`
        );
      }
      if (webhook.userId !== user.id) {
        return user.isSystemAdmin;
      }
      request.webhook = webhook;
    }

    return true;
  }
}
