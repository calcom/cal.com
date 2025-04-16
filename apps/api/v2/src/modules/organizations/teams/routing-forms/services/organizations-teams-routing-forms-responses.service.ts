import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses-output.service";
import { Injectable } from "@nestjs/common";

import { OrganizationsTeamsRoutingFormsResponsesRepository } from "../repositories/organizations-teams-routing-forms-responses.repository";

@Injectable()
export class OrganizationsTeamsRoutingFormsResponsesService {
  constructor(
    private readonly routingFormsRepository: OrganizationsTeamsRoutingFormsResponsesRepository,
    private readonly routingFormsResponsesOutputService: OrganizationsTeamsRoutingFormsResponsesOutputService
  ) {}

  async getTeamRoutingFormResponses(
    teamId: number,
    routingFormId: string,
    skip: number,
    take: number,
    options?: {
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: string;
      beforeCreatedAt?: string;
      afterUpdatedAt?: string;
      beforeUpdatedAt?: string;
      routedToBookingUid?: string;
    }
  ) {
    const responses = await this.routingFormsRepository.getTeamRoutingFormResponses(
      teamId,
      routingFormId,
      skip,
      take,
      options
    );

    return this.routingFormsResponsesOutputService.getRoutingFormResponses(responses);
  }

  async updateTeamRoutingFormResponse(
    teamId: number,
    routingFormId: string,
    responseId: number,
    data: {
      response?: Record<string, any>;
    }
  ) {
    const updatedResponse = await this.routingFormsRepository.updateTeamRoutingFormResponse(
      teamId,
      routingFormId,
      responseId,
      data
    );

    return this.routingFormsResponsesOutputService.getRoutingFormResponses([updatedResponse])[0];
  }
}
