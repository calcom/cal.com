import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { DatabaseTeamEventType } from "@/modules/organizations/services/event-types/output.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, Logger } from "@nestjs/common";

import { createEventType } from "@calcom/platform-libraries";
import { InputTeamEventTransformed_2024_06_14 } from "@calcom/platform-types";

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

    return this.teamsEventTypesService.updateTeamEventType(eventTypeCreated.id, teamId, body, user);
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
    return this.teamsEventTypesService.getTeamEventType(teamId, eventTypeId);
  }

  async getTeamEventTypeBySlug(
    teamId: number,
    eventTypeSlug: string,
    hostsLimit?: number
  ): Promise<DatabaseTeamEventType | null> {
    return this.teamsEventTypesService.getTeamEventTypeBySlug(teamId, eventTypeSlug, hostsLimit);
  }

  async getTeamEventTypes(teamId: number): Promise<DatabaseTeamEventType[]> {
    return await this.teamsEventTypesService.getTeamEventTypes(teamId);
  }

  async getOrganizationsTeamsEventTypes(
    orgId: number,
    skip = 0,
    take = 250
  ): Promise<DatabaseTeamEventType[]> {
    return await this.organizationEventTypesRepository.getOrganizationTeamsEventTypes(orgId, skip, take);
  }

  async updateTeamEventType(
    eventTypeId: number,
    teamId: number,
    body: InputTeamEventTransformed_2024_06_14,
    user: UserWithProfile
  ): Promise<DatabaseTeamEventType | DatabaseTeamEventType[]> {
    return this.teamsEventTypesService.updateTeamEventType(eventTypeId, teamId, body, user);
  }

  async deleteTeamEventType(teamId: number, eventTypeId: number) {
    return this.teamsEventTypesService.deleteTeamEventType(teamId, eventTypeId);
  }
}
