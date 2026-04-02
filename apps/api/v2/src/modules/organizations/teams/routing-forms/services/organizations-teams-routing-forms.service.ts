import { Injectable } from "@nestjs/common";
import { OrganizationsTeamsRoutingFormsRepository } from "../repositories/organizations-teams-routing-forms.repository";

@Injectable()
export class OrganizationsTeamsRoutingFormsService {
  constructor(private readonly routingFormsRepository: OrganizationsTeamsRoutingFormsRepository) {}

  async getTeamRoutingForms(
    teamId: number,
    skip: number,
    take: number,
    options?: {
      disabled?: boolean;
      name?: string;
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: string;
      beforeCreatedAt?: string;
      afterUpdatedAt?: string;
      beforeUpdatedAt?: string;
    }
  ) {
    return this.routingFormsRepository.getTeamRoutingForms(teamId, skip, take, options);
  }
}
