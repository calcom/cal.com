import { OrganizationsTeamsRoutingFormsRepository } from "@/modules/organizations/teams/routing-forms/organizations-teams-routing-forms.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsRoutingFormsService {
  constructor(
    private readonly organizationsTeamsRoutingFormsRepository: OrganizationsTeamsRoutingFormsRepository
  ) {}

  async getRoutingFormWithResponses(routingFormId: string) {
    return await this.organizationsTeamsRoutingFormsRepository.getRoutingFormWithResponses(routingFormId);
  }
}
