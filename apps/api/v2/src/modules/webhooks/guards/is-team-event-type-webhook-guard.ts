import type { EventType, Webhook } from "@calcom/prisma/client";
import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Request } from "express";
import type { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import type { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import type { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import type { WebhooksService } from "@/modules/webhooks/services/webhooks.service";

@Injectable()
export class IsTeamEventTypeWebhookGuard implements CanActivate {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { webhook: Webhook } & { eventType: EventType }>();
    const user = request.user as ApiAuthGuardUser;
    const webhookId = request.params.webhookId;
    const eventTypeId = request.params.eventTypeId;
    const teamId = request.params.teamId;

    if (!user) {
      throw new ForbiddenException("IsTeamEventTypeWebhookGuard - No user associated with the request.");
    }

    if (!teamId) {
      throw new BadRequestException("IsTeamEventTypeWebhookGuard - Team ID is required.");
    }

    const membership = await this.membershipsRepository.findMembershipByTeamId(Number(teamId), user.id);
    if (!membership) {
      throw new ForbiddenException(
        `IsTeamEventTypeWebhookGuard - User (${user.id}) is not a member of team (${teamId})`
      );
    }

    if (eventTypeId) {
      const eventType = await this.teamsEventTypesRepository.getTeamEventType(
        Number(teamId),
        Number(eventTypeId)
      );
      if (!eventType) {
        throw new NotFoundException(
          `IsTeamEventTypeWebhookGuard - Event type (${eventTypeId}) not found for team (${teamId})`
        );
      }
      request.eventType = eventType;
    }

    if (webhookId) {
      const webhook = await this.webhooksService.getWebhookById(webhookId);
      if (!webhook.eventTypeId) {
        throw new BadRequestException(
          `IsTeamEventTypeWebhookGuard - Webhook (${webhookId}) is not associated with an event type`
        );
      }
      if (webhook.eventTypeId !== Number(eventTypeId)) {
        throw new ForbiddenException(
          `IsTeamEventTypeWebhookGuard - Webhook (${webhookId}) is not associated with event type (${eventTypeId})`
        );
      }
      request.webhook = webhook;
    }

    return true;
  }
}
