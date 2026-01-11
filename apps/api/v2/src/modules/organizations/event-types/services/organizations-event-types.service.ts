import { MembershipsRepository } from "@/modules/memberships/memberships.repository";

import type { SortOrderType } from "@calcom/platform-types";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/event-types/organizations-event-types.repository";
import {
  TransformedCreateTeamEventTypeInput,
  TransformedUpdateTeamEventTypeInput,
} from "@/modules/organizations/event-types/services/input.service";
import { DatabaseTeamEventType } from "@/modules/organizations/event-types/services/output.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, Logger } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { createEventType } from "@calcom/platform-libraries/event-types";

@Injectable()
export class OrganizationsEventTypesService {
  private readonly logger = new Logger("OrganizationsEventTypesService");

  constructor(
    private readonly dbWrite: PrismaWriteService,
    private readonly organizationEventTypesRepository: OrganizationsEventTypesRepository,
    private readonly teamsEventTypesService: TeamsEventTypesService,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly usersService: UsersService
  ) {}

  async createOrganizationTeamEventType(
    user: UserWithProfile,
    teamId: number,
    orgId: number,
    body: TransformedCreateTeamEventTypeInput
  ): Promise<DatabaseTeamEventType | DatabaseTeamEventType[]> {
    const eventTypeUser = await this.getUserToCreateTeamEvent(user, orgId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hosts, children, destinationCalendar, ...rest } = body;
    const { eventType: eventTypeCreated } = await createEventType({
      input: {
        teamId: teamId,
        ...rest,
      },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });
    this.logger.debug(
      "nl debug - create org team event type - eventTypeCreated",
      JSON.stringify(eventTypeCreated, null, 2)
    );

    return this.teamsEventTypesService.updateTeamEventType(eventTypeCreated.id, teamId, body, user, true);
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
      email: user.email,
    };
  }

  async getTeamEventType(teamId: number, eventTypeId: number): Promise<DatabaseTeamEventType | null> {
    return this.teamsEventTypesService.getTeamEventType(teamId, eventTypeId);
  }

  async getTeamEventTypeBySlug(
    teamId: number,
    eventTypeSlug: string,
    hostsLimit?: number
  ): Promise<DatabaseTeamEventType | null> {
    return this.teamsEventTypesService.getTeamEventTypeBySlug(teamId, eventTypeSlug, hostsLimit);
  }

  async getTeamEventTypes(teamId: number, sortCreatedAt?: SortOrderType): Promise<DatabaseTeamEventType[]> {
    return await this.teamsEventTypesService.getTeamEventTypes(teamId, sortCreatedAt);
  }

  async getOrganizationsTeamsEventTypes(
    orgId: number,
    skip = 0,
    take = 250,
    sortCreatedAt?: SortOrderType
  ): Promise<DatabaseTeamEventType[]> {
    return await this.organizationEventTypesRepository.getOrganizationTeamsEventTypes(
      orgId,
      skip,
      take,
      sortCreatedAt
    );
  }

  async updateOrganizationTeamEventType(
    eventTypeId: number,
    teamId: number,
    body: TransformedUpdateTeamEventTypeInput,
    user: UserWithProfile
  ): Promise<DatabaseTeamEventType | DatabaseTeamEventType[]> {
    return this.teamsEventTypesService.updateTeamEventType(eventTypeId, teamId, body, user, true);
  }

  async deleteTeamEventType(teamId: number, eventTypeId: number) {
    return this.teamsEventTypesService.deleteTeamEventType(teamId, eventTypeId);
  }
}
