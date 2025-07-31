import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizations-routing-forms.repository";
import { SharedRoutingFormResponseService } from "@/modules/organizations/routing-forms/services/shared-routing-form-response.service";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses-output.service";
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import type { CreateRoutingFormResponseFromQueuedInput } from "../inputs/create-routing-form-response-from-queued.input";

import type { CreateRoutingFormResponseInput } from "../inputs/create-routing-form-response.input";
import type { CreateRoutingFormResponseFromQueuedOutputData } from "../outputs/create-routing-form-response-from-queued.output";
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

  async createRoutingFormResponseFromQueued(
    orgId: number,
    routingFormId: string,
    queuedResponseId: string,
    input: CreateRoutingFormResponseFromQueuedInput
  ): Promise<CreateRoutingFormResponseFromQueuedOutputData> {
    // Use the existing queuedResponseHandler to process the queued response
    const result = await queuedResponseHandler({
      queuedFormResponseId: queuedResponseId,
      params: input.response || {},
    });

    return {
      formResponseId: result.formResponseId,
    };
  }
}
