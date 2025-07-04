import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizations-routing-forms.repository";
import { OrganizationsTeamsRoutingFormsResponsesOutputService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses-output.service";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from "@nestjs/common";
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
    query: CreateRoutingFormResponseInput,
    request: Request
  ): Promise<CreateRoutingFormResponseOutputData> {
    const { queueResponse, ...slotsQuery } = query;
    
    this.validateDateRange(slotsQuery.start, slotsQuery.end);
    
    const { redirectUrl, customMessage } = await this.getRoutingUrl(request, routingFormId, queueResponse ?? false);

    // If there is no redirect URL, then we have to show the message as that would be custom page message to be shown as per the route chosen
    if (!redirectUrl) {
      return {
        routingCustomMessage: customMessage,
      };
    }

    if (!this.isEventTypeRedirectUrl(redirectUrl)) {
      return {
        routingExternalRedirectUrl: redirectUrl.toString(),
      }
    }

    // Extract event type information from the routed URL
    const { eventTypeId, crmParams } = await this.extractEventTypeAndCrmParams(redirectUrl);

    const paramsForGetAvailableSlots = {
      type: ById_2024_09_04_type,
      eventTypeId,
      ...slotsQuery,
      ...crmParams,
    } as const;

    // Get available slots using the slots service with CRM parameters
    const slots = await this.slotsService.getAvailableSlots(paramsForGetAvailableSlots);
    const teamMemberIds = crmParams.routedTeamMemberIds ?? [];
    const teamMemberEmail = crmParams.teamMemberEmail ?? undefined;
    const skipContactOwner = crmParams.skipContactOwner ?? undefined;
    const queuedResponseId = crmParams.queuedFormResponseId ?? null;
    const responseId = crmParams.routingFormResponseId ?? null;
    const crmAppSlug = crmParams.crmAppSlug ?? undefined;
    const crmOwnerRecordType = crmParams.crmOwnerRecordType ?? undefined;

    if (responseId) {
      return {
        routing: {
          responseId,
          teamMemberEmail,
          teamMemberIds,
          skipContactOwner,
          crmAppSlug,
          crmOwnerRecordType,
        },
        eventTypeId,
        slots,
      };
    }
    
    if (!queuedResponseId) {
      throw new InternalServerErrorException("No routing form response ID or queued form response ID could be found.");
    }

    return {
      routing: {
        queuedResponseId,
        teamMemberEmail,
        teamMemberIds,
        skipContactOwner,
        crmAppSlug,
        crmOwnerRecordType,
      },
      eventTypeId,
      slots,
    };
  }

  private validateDateRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (endDate < startDate) {
      throw new BadRequestException("End date cannot be before start date.");
    }
  }

  private async getRoutingUrl(request: Request, formId: string, queueResponse: boolean) {
    const params = Object.fromEntries(new URLSearchParams(request.body));
    const routedUrlData = await getRoutedUrl({
      req: request,
      query: { ...params, form: formId, ...(queueResponse && { "cal.queueFormResponse": "true" }) },
    }, true);

    if (routedUrlData.notFound) {
      throw new NotFoundException("Routing form not found.");
    }

    if (routedUrlData?.props?.errorMessage) {
      throw new BadRequestException(routedUrlData.props.errorMessage);
    }

    const destination = routedUrlData?.redirect?.destination;

    if (!destination) {
      if (routedUrlData?.props?.message) {
        return {
          redirectUrl: null,
          customMessage: routedUrlData.props.message,
        };
      }
      // This should never happen because there is always a fallback route
      throw new InternalServerErrorException("No route found.");
    }

    return {
      redirectUrl: new URL(destination),
      customMessage: null,
    };
  }

  private async extractEventTypeAndCrmParams(routingUrl: URL) {


    // Extract team and event type information
    const { teamId, eventTypeSlug } = this.extractTeamIdAndEventTypeSlugFromRedirectUrl(routingUrl);
    const eventType = await this.teamsEventTypesRepository.getEventTypeByTeamIdAndSlug(teamId, eventTypeSlug);

    if (!eventType?.id) {
      // This could only happen if the event-type earlier selected as route action was deleted
      throw new InternalServerErrorException("Chosen event type not found.");
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
      skipContactOwner: urlParams.get("cal.skipContactOwner") === "true" ? true : false,
      crmAppSlug: urlParams.get("cal.crmAppSlug") || undefined,
      crmOwnerRecordType: urlParams.get("cal.crmContactOwnerRecordType") || undefined,
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
