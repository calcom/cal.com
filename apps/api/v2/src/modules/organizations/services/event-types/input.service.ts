import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
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
    private readonly organizationsTeamsRepository: OrganizationsTeamsRepository
  ) {}
  async transformInputCreateTeamEventType(
    teamId: number,
    inputEventType: CreateTeamEventTypeInput_2024_06_14
  ) {
    const { hosts, assignAllTeamMembers, ...rest } = inputEventType;

    const eventType = this.inputEventTypesService.transformInputCreateEventType(rest);

    const teamEventType = {
      ...eventType,
      hosts: assignAllTeamMembers ? await this.getAllTeamMembers(teamId) : this.transformInputHosts(hosts),
      assignAllTeamMembers,
    };

    return teamEventType;
  }

  async transformInputUpdateTeamEventType(
    teamId: number,
    inputEventType: UpdateTeamEventTypeInput_2024_06_14
  ) {
    const { hosts, assignAllTeamMembers, ...rest } = inputEventType;

    const eventType = this.inputEventTypesService.transformInputUpdateEventType(rest);

    const teamEventType = {
      ...eventType,
      hosts: assignAllTeamMembers ? await this.getAllTeamMembers(teamId) : this.transformInputHosts(hosts),
      assignAllTeamMembers,
    };

    return teamEventType;
  }

  async getAllTeamMembers(teamId: number) {
    const membersIds = await this.organizationsTeamsRepository.getTeamMembersIds(teamId);

    return membersIds.map((id) => ({
      userId: id,
      isFixed: false,
      priority: 2,
    }));
  }

  transformInputHosts(inputHosts: CreateTeamEventTypeInput_2024_06_14["hosts"]) {
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
