import { RoutingFormsResponsesOutputService } from "@/modules/routing-forms-responses/services/routing-forms-responses-output.service";
import { Injectable } from "@nestjs/common";

import { OrganizationsTeamsRoutingFormsResponsesRepository } from "../repositories/organizations-teams-routing-forms-responses.repository";

@Injectable()
export class OrganizationsTeamsRoutingFormsResponsesService {
  constructor(
    private readonly routingFormsRepository: OrganizationsTeamsRoutingFormsResponsesRepository,
    private readonly routingFormsResponsesOutputService: RoutingFormsResponsesOutputService
  ) {}

  async getRoutingFormResponses(routingFormId: string) {
    const responses = await this.routingFormsRepository.getRoutingFormResponses(routingFormId);
    return this.routingFormsResponsesOutputService.getRoutingFormResponses(responses);
  }
}
