import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";

import { getRoutedUrl } from "@calcom/platform-libraries";
import { ById_2024_09_04_type, GetAvailableSlotsInput_2024_09_04 } from "@calcom/platform-types";

@Injectable()
export class RoutingFormsService {
  constructor(
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository,
    private readonly slotsService: SlotsService_2024_09_04
  ) {}

  async calculateSlotsBasedOnRoutingFormResponse(
    request: Request,
    formId: string,
    slotsQuery: GetAvailableSlotsInput_2024_09_04
  ) {
    const eventTypeId = await this.getRoutedEventTypeId(request, formId);

    if (!eventTypeId) {
      throw new NotFoundException("Event type not found.");
    }
    const slots = await this.slotsService.getAvailableSlots({
      type: ById_2024_09_04_type,
      eventTypeId,
      ...slotsQuery,
    });

    return {
      eventTypeId,
      slots,
    };
  }

  private async getRoutedEventTypeId(request: Request, formId: string) {
    const routingUrl = await this.getRoutingUrl(request, formId);
    if (!this.isEventTypeRedirectUrl(routingUrl)) {
      throw new NotFoundException("Routed to a non cal.com event type URL.");
    }

    const { teamId, eventTypeSlug } = this.extractTeamIdAndEventTypeSlugFromRedirectUrl(routingUrl);

    const eventType = await this.teamsEventTypesRepository.getEventTypeByTeamIdAndSlug(teamId, eventTypeSlug);
    return eventType?.id;
  }

  private async getRoutingUrl(request: Request, formId: string) {
    const params = Object.fromEntries(new URLSearchParams(request.body));
    const routedUrlData = await getRoutedUrl({
      req: request,
      query: { ...params, "cal.isBookingDryRun": "true", form: formId },
    });

    const destination = routedUrlData?.redirect?.destination;

    if (!destination) {
      throw new NotFoundException("Route to which the form response should be redirected not found.");
    }

    return new URL(destination);
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

  private isEventTypeRedirectUrl(routingUrl: URL) {
    const routingSearchParams = routingUrl.searchParams;
    return routingSearchParams.get("cal.action") === "eventTypeRedirectUrl";
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
