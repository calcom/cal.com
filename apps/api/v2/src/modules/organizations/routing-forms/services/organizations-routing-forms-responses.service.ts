import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizations-routing-forms.repository";
import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { RoutingFormResponseOutput } from "../outputs/update-routing-form-response.output";

@Injectable()
export class OrganizationsRoutingFormsResponsesService {
  constructor(private readonly organizationsRoutingFormsRepository: OrganizationsRoutingFormsRepository) {}

  async getOrganizationRoutingFormResponses(
    orgId: number,
    routingFormId: string,
    skip: number,
    take: number,
    options?: {
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: Date;
      beforeCreatedAt?: Date;
      routedToBookingUid?: string;
    }
  ) {
    const responses = await this.organizationsRoutingFormsRepository.getOrganizationRoutingFormResponses(
      orgId,
      routingFormId,
      skip,
      take,
      options
    );

    return responses.map((response) =>
      plainToClass(RoutingFormResponseOutput, response, { strategy: "excludeAll" })
    );
  }

  async updateRoutingFormResponse(
    orgId: number,
    routingFormId: string,
    responseId: number,
    data: {
      response?: Record<string, any>;
    }
  ) {
    const updatedResponse = await this.organizationsRoutingFormsRepository.updateRoutingFormResponse(
      orgId,
      routingFormId,
      responseId,
      data
    );

    return plainToClass(RoutingFormResponseOutput, updatedResponse, { strategy: "excludeAll" });
  }
}
