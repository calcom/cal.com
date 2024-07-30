import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/input.service";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/output.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

import { createEventType, updateEventType } from "@calcom/platform-libraries-0.0.22";
import {
  CreateTeamEventTypeInput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

@Injectable()
export class OrganizationsEventTypesService {
  constructor(
    private readonly inputService: InputOrganizationsEventTypesService,
    private readonly eventTypesService: EventTypesService_2024_06_14,
    private readonly dbWrite: PrismaWriteService,
    private readonly organizationEventTypesRepository: OrganizationsEventTypesRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly outputService: OutputOrganizationsEventTypesService,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly organizationsTeamsRepository: OrganizationsTeamsRepository
  ) {}

  async createTeamEventType(
    user: UserWithProfile,
    teamId: number,
    orgId: number,
    body: CreateTeamEventTypeInput_2024_06_14
  ) {
    await this.validateHosts(teamId, body.hosts);
    const eventTypeUser = await this.getUserToCreateTeamEvent(user, orgId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hosts, assignAllTeamMembers, ...rest } =
      await this.inputService.transformInputCreateTeamEventType(teamId, body);
    const { eventType: eventTypeCreated } = await createEventType({
      input: { teamId: teamId, ...rest },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    return await this.updateTeamEventType(
      eventTypeCreated.id,
      teamId,
      { hosts: body.hosts, assignAllTeamMembers },
      user
    );
  }

  async validateHosts(teamId: number, hosts: CreateTeamEventTypeInput_2024_06_14["hosts"] | undefined) {
    if (hosts && hosts.length) {
      const membersIds = await this.organizationsTeamsRepository.getTeamMembersIds(teamId);
      const invalidHosts = hosts.filter((host) => !membersIds.includes(host.userId));
      if (invalidHosts.length) {
        throw new NotFoundException(`Invalid hosts: ${invalidHosts.join(", ")}`);
      }
    }
  }

  async validateEventTypeExists(teamId: number, eventTypeId: number) {
    const eventType = await this.organizationEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }
  }

  async getUserToCreateTeamEvent(user: UserWithProfile, organizationId: number) {
    const isOrgAdmin = await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId);
    const profileId = user.movedToProfileId || null;
    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
      organization: { isOrgAdmin },
      profile: { id: profileId },
      metadata: user.metadata,
    };
  }

  async getTeamEventType(teamId: number, eventTypeId: number) {
    const eventType = await this.organizationEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!eventType) {
      return null;
    }

    return this.outputService.getResponseTeamEventType(eventType);
  }

  async getTeamEventTypeBySlug(teamId: number, eventTypeSlug: string) {
    const eventType = await this.organizationEventTypesRepository.getTeamEventTypeBySlug(
      teamId,
      eventTypeSlug
    );

    if (!eventType) {
      return null;
    }

    return this.outputService.getResponseTeamEventType(eventType);
  }

  async getTeamEventTypes(teamId: number) {
    const eventTypes = await this.organizationEventTypesRepository.getTeamEventTypes(teamId);

    const eventTypePromises = eventTypes.map(async (eventType) => {
      return await this.outputService.getResponseTeamEventType(eventType);
    });

    return await Promise.all(eventTypePromises);
  }

  async getTeamsEventTypes(orgId: number, skip = 0, take = 250) {
    const eventTypes = await this.organizationEventTypesRepository.getTeamsEventTypes(orgId, skip, take);

    const eventTypePromises = eventTypes.map(async (eventType) => {
      return await this.outputService.getResponseTeamEventType(eventType);
    });

    return await Promise.all(eventTypePromises);
  }

  async updateTeamEventType(
    eventTypeId: number,
    teamId: number,
    body: UpdateTeamEventTypeInput_2024_06_14,
    user: UserWithProfile
  ) {
    await this.validateEventTypeExists(teamId, eventTypeId);
    await this.validateHosts(teamId, body.hosts);
    const eventTypeUser = await this.eventTypesService.getUserToUpdateEvent(user);
    const bodyTransformed = await this.inputService.transformInputUpdateTeamEventType(
      eventTypeId,
      teamId,
      body
    );

    await updateEventType({
      input: { id: eventTypeId, ...bodyTransformed },
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
      return this.outputService.getResponseTeamEventType(eventType);
    }

    const children = await this.organizationEventTypesRepository.getEventTypeChildren(eventType.id);

    const eventTypes = [eventType, ...children];

    const eventTypePromises = eventTypes.map(async (e) => {
      return await this.outputService.getResponseTeamEventType(e);
    });

    return await Promise.all(eventTypePromises);
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
}
