import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizationsRoutingFormsRepository";
import { SharedRoutingFormResponseService } from "@/modules/organizations/routing-forms/services/sharedRoutingFormResponseService";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizationsTeamsRoutingFormsResponsesOutputService";
import { Injectable } from "@nestjs/common";
import { Request } from "express";

import type { CreateRoutingFormResponseInput } from "../inputs/create-routing-form-response.input";
import type { CreateRoutingFormResponseOutputData } from "../outputs/create-routing-form-response.output";

@Injectable()
export class OrganizationsRoutingFormsResponsesService {
  constructor(
    private readonly organizationsRoutingFormsRepository: OrganizationsRoutingFormsRepository,
    private readonly outputService: OrganizationsTeamsRoutingFormsResponsesOutputService,
    private readonly sharedRoutingFormResponseService: SharedRoutingFormResponseService
  ) {}

  async getOrganizationRoutingFormResponses(
    orgId: number,
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
    const responses = await this.organizationsRoutingFormsRepository.getOrganizationRoutingFormResponses(
      orgId,
      routingFormId,
      skip,
      take,
      options
    );

    return this.outputService.getRoutingFormResponses(responses);
  }

  async createRoutingFormResponseWithSlots(
    routingFormId: string,
    query: CreateRoutingFormResponseInput,
    request: Request
  ): Promise<CreateRoutingFormResponseOutputData> {
    return this.sharedRoutingFormResponseService.createRoutingFormResponseWithSlots(
      routingFormId,
      query,
      request
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

    return this.outputService.getRoutingFormResponses([updatedResponse])[0];
  }
}
