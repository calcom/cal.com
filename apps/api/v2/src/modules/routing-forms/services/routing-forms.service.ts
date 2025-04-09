import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";

import { getRoutedUrl } from "@calcom/platform-libraries";
import { GetAvailableSlotsInput_2024_09_04 } from "@calcom/platform-types";

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
      eventTypeId,
      ...slotsQuery,
    });

    return {
      eventTypeId,
      slots,
    };
  }

  private async getRoutedEventTypeId(request: Request, formId: string) {
    const params = Object.fromEntries(new URLSearchParams(request.body));
    const routedUrlData = await getRoutedUrl({ req: request, query: { ...params, form: formId } });

    if (!routedUrlData?.redirect?.destination) {
      throw new NotFoundException("Route to which the form response should be redirected not found.");
    }

    const destination = routedUrlData.redirect.destination;

    const routingUrl = new URL(destination);
    const routingSearchParams = routingUrl.searchParams;
    if (
      routingSearchParams.get("cal.action") === "eventTypeRedirectUrl" &&
      routingSearchParams.has("email") &&
      routingSearchParams.has("cal.teamId") &&
      !routingSearchParams.has("cal.skipContactOwner")
    ) {
      const pathNameParams = routingUrl.pathname.split("/");
      const eventTypeSlug = pathNameParams[pathNameParams.length - 1];
      const teamId = Number(routingSearchParams.get("cal.teamId"));
      const eventType = await this.teamsEventTypesRepository.getEventTypeByTeamIdAndSlug(
        teamId,
        eventTypeSlug
      );
      return eventType?.id;
    }
  }
}
