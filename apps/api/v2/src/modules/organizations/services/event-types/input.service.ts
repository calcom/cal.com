import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, Injectable } from "@nestjs/common";

import {
  CreateTeamEventTypeInput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
  HostPriority,
  SchedulingType,
} from "@calcom/platform-types";

@Injectable()
export class InputOrganizationsEventTypesService {
  constructor(
    private readonly inputEventTypesService: InputEventTypesService_2024_06_14,
    private readonly organizationsTeamsRepository: OrganizationsTeamsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly orgEventTypesRepository: OrganizationsEventTypesRepository
  ) {}
  async transformInputCreateTeamEventType(
    teamId: number,
    inputEventType: CreateTeamEventTypeInput_2024_06_14
  ) {
    const { hosts, assignAllTeamMembers, ...rest } = inputEventType;

    const eventType = this.inputEventTypesService.transformInputCreateEventType(rest);

    const metadata = rest.schedulingType === "MANAGED" ? { managedEventConfig: {} } : undefined;

    const teamEventType = {
      ...eventType,
      hosts: assignAllTeamMembers
        ? await this.getAllTeamMembers(teamId, inputEventType.schedulingType)
        : this.transformInputHosts(hosts, inputEventType.schedulingType),
      assignAllTeamMembers,
      metadata,
    };

    return teamEventType;
  }

  async transformInputUpdateTeamEventType(
    eventTypeId: number,
    teamId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14
  ) {
    const { hosts, assignAllTeamMembers, ...rest } = inputEventType;

    const eventType = this.inputEventTypesService.transformInputUpdateEventType(rest);
    const dbEventType = await this.orgEventTypesRepository.getTeamEventType(teamId, eventTypeId);

    if (!dbEventType) {
      throw new BadRequestException("Event type to update not found");
    }

    const children = await this.getChildEventTypesForManagedEventType(eventTypeId, inputEventType, teamId);
    const teamEventType = {
      ...eventType,
      // note(Lauris): we don't populate hosts for managed event-types because they are handled by the children
      hosts: !children
        ? assignAllTeamMembers
          ? await this.getAllTeamMembers(teamId, dbEventType.schedulingType)
          : this.transformInputHosts(hosts, dbEventType.schedulingType)
        : undefined,
      assignAllTeamMembers,
      children,
    };

    return teamEventType;
  }

  async getChildEventTypesForManagedEventType(
    eventTypeId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14,
    teamId: number
  ) {
    const eventType = await this.orgEventTypesRepository.getEventTypeByIdWithChildren(eventTypeId);

    if (!eventType || eventType.schedulingType !== "MANAGED") {
      return undefined;
    }

    const ownersIds = await this.getOwnersIdsForManagedEventType(teamId, inputEventType, eventType);
    const owners = await this.getOwnersForManagedEventType(ownersIds);

    return owners.map((owner) => {
      return {
        hidden: false,
        owner,
      };
    });
  }

  async getOwnersIdsForManagedEventType(
    teamId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14,
    eventType: { children: { userId: number | null }[] }
  ) {
    if (inputEventType.assignAllTeamMembers) {
      return await this.organizationsTeamsRepository.getTeamMembersIds(teamId);
    }

    // note(Lauris): when API user updates managed event type users
    if (inputEventType.hosts) {
      return inputEventType.hosts.map((host) => host.userId);
    }

    // note(Lauris): when API user DOES NOT update managed event type users, but we still need existing managed event type users to know which event-types to update
    return eventType.children.map((child) => child.userId).filter((id) => !!id) as number[];
  }

  async getOwnersForManagedEventType(userIds: number[]) {
    const users = await this.usersRepository.findByIdsWithEventTypes(userIds);

    return users.map((user) => {
      const nonManagedEventTypes = user.eventTypes.filter((eventType) => !eventType.parentId);
      return {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        // note(Lauris): managed event types slugs have to be excluded otherwise checkExistentEventTypes within handleChildrenEventTypes.ts will incorrectly delete managed user event type.
        eventTypeSlugs: nonManagedEventTypes.map((eventType) => eventType.slug),
      };
    });
  }

  async getAllTeamMembers(teamId: number, schedulingType: SchedulingType | null) {
    const membersIds = await this.organizationsTeamsRepository.getTeamMembersIds(teamId);
    const isFixed = schedulingType === "COLLECTIVE" ? true : false;

    return membersIds.map((id) => ({
      userId: id,
      isFixed,
      priority: 2,
    }));
  }

  transformInputHosts(
    inputHosts: CreateTeamEventTypeInput_2024_06_14["hosts"] | undefined,
    schedulingType: SchedulingType | null
  ) {
    if (!inputHosts) {
      return undefined;
    }

    const defaultPriority = "medium";
    const defaultIsFixed = false;

    return inputHosts.map((host) => ({
      userId: host.userId,
      isFixed: schedulingType === "COLLECTIVE" ? true : host.mandatory || defaultIsFixed,
      priority: getPriorityValue(
        schedulingType === "COLLECTIVE" ? "medium" : host.priority || defaultPriority
      ),
    }));
  }
}

function getPriorityValue(priority: keyof typeof HostPriority): number {
  switch (priority) {
    case "lowest":
      return 0;
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "highest":
      return 4;
    default:
      throw new Error("Invalid HostPriority label");
  }
}
