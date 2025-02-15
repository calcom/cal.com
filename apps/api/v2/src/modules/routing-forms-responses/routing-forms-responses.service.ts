import { Injectable } from "@nestjs/common";

import { RoutingFormsResponsesRepository } from "./routing-forms-responses.repository";

@Injectable()
export class RoutingFormsResponsesService {
  constructor(private readonly routingFormsRepository: RoutingFormsResponsesRepository) {}

  async getRoutingFormResponses(formId: string) {
    return await this.routingFormsRepository.getRoutingFormResponses(formId);
  }
}
