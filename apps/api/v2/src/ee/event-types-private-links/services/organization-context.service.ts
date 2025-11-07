import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { Injectable } from "@nestjs/common";

export interface OrganizationEventTypeContext {
  orgSlug?: string;
  eventTypeSlug?: string;
}

@Injectable()
export class OrganizationContextService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository
  ) {}

  async getOrganizationEventTypeContext(
    orgId: number,
    teamId: number,
    eventTypeId: number
  ): Promise<OrganizationEventTypeContext> {
    const organization = await this.organizationsRepository.findById(orgId);
    const eventType = await this.teamsEventTypesRepository.getTeamEventTypeSlug(teamId, eventTypeId);

    return {
      orgSlug: organization?.slug || undefined,
      eventTypeSlug: eventType?.slug || undefined,
    };
  }
}
