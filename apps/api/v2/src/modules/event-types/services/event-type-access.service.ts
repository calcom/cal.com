import type { EventType } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";

@Injectable()
export class EventTypeAccessService {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly membershipsService: MembershipsService,
    private readonly teamsRepository: TeamsRepository
  ) {}

  async userIsEventTypeAdminOrOwner(authUser: ApiAuthGuardUser, eventType: EventType): Promise<boolean> {
    const authUserId = authUser.id;
    const eventTypeId = eventType.id;
    const teamId = eventType.teamId;
    const eventTypeOwnerId = eventType.userId || null;

    if (authUser.isSystemAdmin) return true;

    if (eventTypeOwnerId === authUserId) return true;

    if (eventTypeId) {
      const isHostOrAssigned = await this.isUserHostOrAssignedToEventType(authUserId, eventTypeId);
      if (isHostOrAssigned) return true;
    }

    if (teamId) {
      const isTeamOrParentOrgAdmin = await this.isUserTeamAdminOrParentOrgAdmin(authUserId, teamId);
      if (isTeamOrParentOrgAdmin) return true;
    }

    if (eventTypeOwnerId) {
      const isOrgAdminOrOwnerOfEventOwner = await this.isUserOrgAdminOrOwnerOfEventOwner(
        authUserId,
        eventTypeOwnerId
      );
      if (isOrgAdminOrOwnerOfEventOwner) return true;
    }

    return false;
  }

  private async isUserHostOrAssignedToEventType(authUserId: number, eventTypeId: number): Promise<boolean> {
    const [isUserHost, isUserAssigned] = await Promise.all([
      this.eventTypesRepository.isUserHostOfEventType(authUserId, eventTypeId),
      this.eventTypesRepository.isUserAssignedToEventType(authUserId, eventTypeId),
    ]);
    return isUserHost || isUserAssigned;
  }

  private async isUserTeamAdminOrParentOrgAdmin(authUserId: number, teamId: number): Promise<boolean> {
    const membership = await this.membershipsRepository.getUserAdminOrOwnerTeamMembership(authUserId, teamId);
    if (membership) return true;

    const team = await this.teamsRepository.getById(teamId);
    const parentOrgId = team?.parentId ?? null;
    if (parentOrgId) {
      const isOrgAdmin = await this.membershipsRepository.isUserOrganizationAdmin(authUserId, parentOrgId);
      if (isOrgAdmin) return true;
    }

    return false;
  }

  private async isUserOrgAdminOrOwnerOfEventOwner(
    authUserId: number,
    eventTypeOwnerId: number
  ): Promise<boolean> {
    return this.membershipsService.isUserOrgAdminOrOwnerOfAnotherUser(authUserId, eventTypeOwnerId);
  }
}
