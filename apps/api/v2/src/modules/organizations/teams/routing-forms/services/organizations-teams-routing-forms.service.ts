import { RoutingFormsResponsesOutputService } from "@/modules/routing-forms-responses/services/routing-forms-responses-output.service";
import { Injectable } from "@nestjs/common";

import { OrganizationsTeamsRoutingFormsRepository } from "../repositories/organizations-teams-routing-forms.repository";

@Injectable()
export class OrganizationsTeamsRoutingFormsService {
  constructor(
    private readonly routingFormsRepository: OrganizationsTeamsRoutingFormsRepository,
    private readonly routingFormsResponsesOutputService: RoutingFormsResponsesOutputService
  ) {}

  async getTeamRoutingForms(
    orgId: number,
    teamId: number,
    skip: number,
    take: number,
    options?: {
      disabled?: boolean;
      name?: string;
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: Date;
      beforeCreatedAt?: Date;
      afterUpdatedAt?: Date;
      beforeUpdatedAt?: Date;
    }
  ) {
    return this.routingFormsRepository.getTeamRoutingForms(orgId, teamId, skip, take, options);
  }
}
