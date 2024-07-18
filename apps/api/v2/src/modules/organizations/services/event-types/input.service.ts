import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import {
  CreateTeamEventTypeInput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
  HostPriority,
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
      hosts: assignAllTeamMembers ? await this.getAllTeamMembers(teamId) : this.transformInputHosts(hosts),
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

    const children = await this.getChildEventTypesForManagedEventType(eventTypeId, inputEventType);
    const teamEventType = {
      ...eventType,
      hosts: !children
        ? assignAllTeamMembers
          ? await this.getAllTeamMembers(teamId)
          : this.transformInputHosts(hosts)
        : undefined,
      assignAllTeamMembers,
      children,
    };

    return teamEventType;
  }

  async getChildEventTypesForManagedEventType(
    eventTypeId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14
  ) {
    const eventType = await this.orgEventTypesRepository.getEventTypeByIdWithChildren(eventTypeId);

    if (!eventType || eventType.schedulingType !== "MANAGED") {
      return undefined;
    }

    const hostsIds = inputEventType.hosts
      ? inputEventType.hosts.map((host) => host.userId)
      : (eventType.children.map((child) => child.userId).filter((id) => !!id) as number[]);
    const owners = await this.getOwnersForManagedEventType(hostsIds);

    return owners.map((owner) => {
      return {
        hidden: false,
        owner,
      };
    });
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

  async getAllTeamMembers(teamId: number) {
    const membersIds = await this.organizationsTeamsRepository.getTeamMembersIds(teamId);

    return membersIds.map((id) => ({
      userId: id,
      isFixed: false,
      priority: 2,
    }));
  }

  transformInputHosts(inputHosts: CreateTeamEventTypeInput_2024_06_14["hosts"] | undefined) {
    if (!inputHosts) {
      return undefined;
    }

    const defaultMandatory = false;
    const defaultPriority = "medium";

    return inputHosts.map((host) => ({
      userId: host.userId,
      isFixed: host.mandatory || defaultMandatory,
      priority: getPriorityValue(host.priority || defaultPriority),
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
