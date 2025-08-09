import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class EventTypeOwnershipGuard implements CanActivate {
  constructor(private readonly eventTypesService: EventTypesService_2024_06_14) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ApiAuthGuardUser | undefined;
    const eventTypeIdParam = request.params?.eventTypeId;

    if (!user) {
      throw new ForbiddenException("EventTypeOwnershipGuard - No user associated with the request.");
    }

    if (!eventTypeIdParam) {
      throw new ForbiddenException("EventTypeOwnershipGuard - Missing eventTypeId param.");
    }

    const eventTypeId = parseInt(eventTypeIdParam);
    const eventType = await this.eventTypesService.getUserEventType(user.id, eventTypeId);
    if (!eventType) {
      // Mirrors EventTypesService behavior: NotFound when not owned or not present
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return true;
  }
}


