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
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";

type WebhookRequest = Request & { webhook: Webhook; eventType: EventType };

@Injectable()
export class IsTeamEventTypeWebhookGuard implements CanActivate {
  constructor(
    private readonly webhooksRepository: WebhooksRepository,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WebhookRequest>();
    const user = request.user as ApiAuthGuardUser;
    const { webhookId, eventTypeId, teamId } = request.params;

    this.validateInitialRequest(user, teamId, eventTypeId);

    await this.validateTeamMembership(user.id, Number(teamId));

    request.eventType = await this.validateAndGetEventType(Number(teamId), Number(eventTypeId));

    if (webhookId) {
      request.webhook = await this.validateAndGetWebhook(webhookId, Number(eventTypeId));
    }

    return true;
  }

  private validateInitialRequest(user: ApiAuthGuardUser, teamId: string, eventTypeId: string): void {
    if (!user) {
      throw new ForbiddenException("IsTeamEventTypeWebhookGuard - No user associated with the request.");
    }
    if (!teamId) {
      throw new BadRequestException("IsTeamEventTypeWebhookGuard - Team ID is required.");
    }
    if (!eventTypeId) {
      throw new BadRequestException("IsTeamEventTypeWebhookGuard - Event Type ID is required.");
    }
  }

  private async validateTeamMembership(userId: number, teamId: number): Promise<void> {
    const membership = await this.membershipsRepository.getUserAdminOrOwnerTeamMembership(userId, teamId);
    if (!membership) {
      throw new ForbiddenException(
        `IsTeamEventTypeWebhookGuard - User (${userId}) is not an admin/owner of team (${teamId})`
      );
    }
  }

  private async validateAndGetEventType(teamId: number, eventTypeId: number): Promise<EventType> {
    const eventType = await this.teamsEventTypesRepository.getTeamEventType(teamId, eventTypeId);
    if (!eventType) {
      throw new NotFoundException(
        `IsTeamEventTypeWebhookGuard - Event type (${eventTypeId}) not found for team (${teamId})`
      );
    }
    return eventType;
  }

  private async validateAndGetWebhook(webhookId: string, eventTypeId: number): Promise<Webhook> {
    const webhook = await this.webhooksRepository.getWebhookById(webhookId);

    if (!webhook) {
      throw new NotFoundException(`IsTeamEventTypeWebhookGuard - Webhook (${webhookId}) not found`);
    }
    if (!webhook.eventTypeId) {
      throw new BadRequestException(`IsTeamEventTypeWebhookGuard - Webhook (${webhookId}) no event type`);
    }
    if (webhook.eventTypeId !== eventTypeId) {
      throw new ForbiddenException(`IsTeamEventTypeWebhookGuard - Webhook mismatch with event type`);
    }

    return webhook;
  }
}
