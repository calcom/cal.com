import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

export interface OrganizationEventTypeContext {
  orgSlug?: string;
  eventTypeSlug: string;
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
    const organization = await this.organizationsRepository.findById({ id: orgId });
    const eventType = await this.teamsEventTypesRepository.getTeamEventTypeSlug(teamId, eventTypeId);

    if (!eventType?.slug) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found or has no slug`);
    }

    return {
      orgSlug: organization?.slug || undefined,
      eventTypeSlug: eventType.slug,
    };
  }
}
