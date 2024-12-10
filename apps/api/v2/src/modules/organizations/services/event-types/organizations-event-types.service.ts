import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { DatabaseTeamEventType } from "@/modules/organizations/services/event-types/output.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException, Logger } from "@nestjs/common";

import { createEventType, updateEventType } from "@calcom/platform-libraries";
import { InputTeamEventTransformed_2024_06_14 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsEventTypesService {
  private readonly logger = new Logger("OrganizationsEventTypesService");

  constructor(
    private readonly eventTypesService: EventTypesService_2024_06_14,
    private readonly dbWrite: PrismaWriteService,
    private readonly organizationEventTypesRepository: OrganizationsEventTypesRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersService: UsersService
  ) {}

  async createTeamEventType(
    user: UserWithProfile,
    teamId: number,
    orgId: number,
    body: InputTeamEventTransformed_2024_06_14
  ): Promise<DatabaseTeamEventType | DatabaseTeamEventType[]> {
    const eventTypeUser = await this.getUserToCreateTeamEvent(user, orgId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hosts, children, destinationCalendar, ...rest } = body;

    const { eventType: eventTypeCreated } = await createEventType({
      input: { teamId: teamId, ...rest },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    return this.updateTeamEventType(eventTypeCreated.id, teamId, body, user);
  }

  async validateEventTypeExists(teamId: number, eventTypeId: number) {
    const eventType = await this.organizationEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
  }

  async getUserToCreateTeamEvent(user: UserWithProfile, organizationId: number) {
    const isOrgAdmin = await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId);
    const profileId =
      this.usersService.getUserProfileByOrgId(user, organizationId)?.id ||
      this.usersService.getUserMainProfile(user)?.id;
    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
      organization: { isOrgAdmin },
      profile: { id: profileId || null },
      metadata: user.metadata,
    };
  }

  async getTeamEventType(teamId: number, eventTypeId: number): Promise<DatabaseTeamEventType | null> {
    const eventType = await this.organizationEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!eventType) {
      return null;
    }

    return eventType;
  }

  async getTeamEventTypeBySlug(teamId: number, eventTypeSlug: string): Promise<DatabaseTeamEventType | null> {
    const eventType = await this.organizationEventTypesRepository.getTeamEventTypeBySlug(
      teamId,
      eventTypeSlug
    );

    if (!eventType) {
      return null;
    }

    return eventType;
  }

  async getTeamEventTypes(teamId: number): Promise<DatabaseTeamEventType[]> {
    return await this.organizationEventTypesRepository.getTeamEventTypes(teamId);
  }

  async getTeamsEventTypes(orgId: number, skip = 0, take = 250): Promise<DatabaseTeamEventType[]> {
    return await this.organizationEventTypesRepository.getTeamsEventTypes(orgId, skip, take);
  }

  async updateTeamEventType(
    eventTypeId: number,
    teamId: number,
    body: InputTeamEventTransformed_2024_06_14,
    user: UserWithProfile
  ): Promise<DatabaseTeamEventType | DatabaseTeamEventType[]> {
    await this.validateEventTypeExists(teamId, eventTypeId);
    const eventTypeUser = await this.eventTypesService.getUserToUpdateEvent(user);

    await updateEventType({
      input: { id: eventTypeId, ...body },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    const eventType = await this.organizationEventTypesRepository.getEventTypeById(eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    if (eventType.schedulingType !== "MANAGED") {
      return eventType;
    }

    const childrenEventTypes = await this.organizationEventTypesRepository.getEventTypeChildren(eventType.id);

    return [eventType, ...childrenEventTypes];
  }

  async deleteTeamEventType(teamId: number, eventTypeId: number) {
    const existingEventType = await this.organizationEventTypesRepository.getTeamEventType(
      teamId,
      eventTypeId
    );

    if (!existingEventType) {
      throw new NotFoundException(`Event type with ID=${eventTypeId} does not exist.`);
    }

    return this.eventTypesRepository.deleteEventType(eventTypeId);
  }

  async deleteUserTeamEventTypesAndHosts(userId: number, teamId: number) {
    try {
      await this.organizationEventTypesRepository.deleteUserManagedTeamEventTypes(userId, teamId);
      await this.organizationEventTypesRepository.removeUserFromTeamEventTypesHosts(userId, teamId);
    } catch (err) {
      this.logger.error("Could not remove user from all team event-types.", {
        error: err,
        userId,
        teamId,
      });
    }
  }
}
