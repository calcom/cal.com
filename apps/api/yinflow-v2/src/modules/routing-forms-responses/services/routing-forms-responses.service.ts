import { Injectable } from "@nestjs/common";

import { RoutingFormsResponsesOutputService } from "../../routing-forms-responses/services/routing-forms-responses-output.service";
import { RoutingFormsResponsesRepository } from "../routing-forms-responses.repository";

@Injectable()
export class RoutingFormsResponsesService {
  constructor(
    private readonly routingFormsRepository: RoutingFormsResponsesRepository,
    private readonly routingFormsResponsesOutputService: RoutingFormsResponsesOutputService
  ) {}

  async getRoutingFormResponses(routingFormId: string) {
    const responses = await this.routingFormsRepository.getRoutingFormResponses(routingFormId);
    return this.routingFormsResponsesOutputService.getRoutingFormResponses(responses);
  }
}
