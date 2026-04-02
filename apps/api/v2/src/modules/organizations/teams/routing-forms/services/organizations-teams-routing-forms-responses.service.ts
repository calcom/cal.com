import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { OrganizationsTeamsRoutingFormsResponsesRepository } from "../repositories/organizations-teams-routing-forms-responses.repository";
import { CreateRoutingFormResponseInput } from "@/modules/organizations/routing-forms/inputs/create-routing-form-response.input";
import { CreateRoutingFormResponseOutputData } from "@/modules/organizations/routing-forms/outputs/create-routing-form-response.output";
import { SharedRoutingFormResponseService } from "@/modules/organizations/routing-forms/services/shared-routing-form-response.service";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses-output.service";

@Injectable()
export class OrganizationsTeamsRoutingFormsResponsesService {
  constructor(
    private readonly routingFormsRepository: OrganizationsTeamsRoutingFormsResponsesRepository,
    private readonly routingFormsResponsesOutputService: OrganizationsTeamsRoutingFormsResponsesOutputService,
    private readonly sharedRoutingFormResponseService: SharedRoutingFormResponseService
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
