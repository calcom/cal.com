import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizations-routing-forms.repository";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses-output.service";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";

import { getRoutedUrl } from "@calcom/platform-libraries";
import { ById_2024_09_04_type } from "@calcom/platform-types";

import type { CreateRoutingFormResponseInput } from "../inputs/create-routing-form-response.input";
import type { CreateRoutingFormResponseOutputData } from "../outputs/create-routing-form-response.output";

@Injectable()
export class OrganizationsRoutingFormsResponsesService {
  constructor(
    private readonly organizationsRoutingFormsRepository: OrganizationsRoutingFormsRepository,
    private readonly outputService: OrganizationsTeamsRoutingFormsResponsesOutputService,
    private readonly slotsService: SlotsService_2024_09_04,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository
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

  async createRoutingFormResponseWithSlots(
    orgId: number,
    routingFormId: string,
    body: CreateRoutingFormResponseInput,
    request: Request
  ): Promise<CreateRoutingFormResponseOutputData> {
    const { queueResponse, ...slotsQuery } = body;
    // Use getRoutedUrl to handle routing logic and CRM processing
    const routingUrlData = await this.getRoutingUrl(request, routingFormId, queueResponse ?? false, body);

    // Extract event type information from the routed URL
    const { eventTypeId, crmParams } = await this.extractEventTypeAndCrmParams(routingUrlData);

    const paramsForGetAvailableSlots = {
      type: ById_2024_09_04_type,
      eventTypeId,
      ...slotsQuery,
      ...crmParams,
    } as const;

    // Get available slots using the slots service with CRM parameters
    const slots = await this.slotsService.getAvailableSlots(paramsForGetAvailableSlots);

    if (!crmParams.routingFormResponseId && !crmParams.queuedFormResponseId) {
      throw new NotFoundException("No routing form response ID or queued form response ID could be found.");
    }
    return {
      responseId: crmParams.routingFormResponseId ?? null,
      queuedResponseId: crmParams.queuedFormResponseId ?? null,
      eventTypeId,
      routedTeamMemberIds: crmParams.routedTeamMemberIds ?? null,
      teamMemberEmail: crmParams.teamMemberEmail ?? null,
      slots,
    };
  }

  private async getRoutingUrl(
    request: Request,
    formId: string,
    queueResponse: boolean,
    formResponseData: any
  ) {
    const routedUrlData = await getRoutedUrl({
      req: request,
      query: { ...formResponseData, form: formId, ...(queueResponse && { "cal.queueFormResponse": "true" }) },
    });

    const destination = routedUrlData?.redirect?.destination;

    if (!destination) {
      throw new NotFoundException("Route to which the form response should be redirected not found.");
    }

    return new URL(destination);
  }

  private async extractEventTypeAndCrmParams(routingUrl: URL) {
    // Check if it's an event type redirect URL
    if (!this.isEventTypeRedirectUrl(routingUrl)) {
      throw new NotFoundException("Routed to a non cal.com event type URL.");
    }

    // Extract team and event type information
    const { teamId, eventTypeSlug } = this.extractTeamIdAndEventTypeSlugFromRedirectUrl(routingUrl);
    const eventType = await this.teamsEventTypesRepository.getEventTypeByTeamIdAndSlug(teamId, eventTypeSlug);

    if (!eventType?.id) {
      throw new NotFoundException("Event type not found.");
    }

    // Extract CRM parameters from URL
    const urlParams = routingUrl.searchParams;
    const crmParams = {
      teamMemberEmail: urlParams.get("cal.crmContactOwnerEmail") || undefined,
      routedTeamMemberIds: urlParams.get("cal.routedTeamMemberIds")
        ? urlParams
            .get("cal.routedTeamMemberIds")!
            .split(",")
            .map((id) => parseInt(id))
        : undefined,
      routingFormResponseId: urlParams.get("cal.routingFormResponseId")
        ? parseInt(urlParams.get("cal.routingFormResponseId")!)
        : undefined,
      queuedFormResponseId: urlParams.get("cal.queuedFormResponseId")
        ? (urlParams.get("cal.queuedFormResponseId") as string)
        : undefined,
    };

    return {
      eventTypeId: eventType.id,
      crmParams,
    };
  }

  private isEventTypeRedirectUrl(routingUrl: URL) {
    const routingSearchParams = routingUrl.searchParams;
    return routingSearchParams.get("cal.action") === "eventTypeRedirectUrl";
  }

  private extractTeamIdAndEventTypeSlugFromRedirectUrl(routingUrl: URL) {
    const eventTypeSlug = this.extractEventTypeFromRoutedUrl(routingUrl);
    const teamId = this.extractTeamIdFromRoutedUrl(routingUrl);

    if (!teamId) {
      throw new NotFoundException("Team ID not found in the routed URL.");
    }

    if (!eventTypeSlug) {
      throw new NotFoundException("Event type slug not found in the routed URL.");
    }

    return { teamId, eventTypeSlug };
  }

  private extractTeamIdFromRoutedUrl(routingUrl: URL) {
    const routingSearchParams = routingUrl.searchParams;
    return Number(routingSearchParams.get("cal.teamId"));
  }

  private extractEventTypeFromRoutedUrl(routingUrl: URL) {
    const pathNameParams = routingUrl.pathname.split("/");
    return pathNameParams[pathNameParams.length - 1];
  }
}
