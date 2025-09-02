import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UpdateUnifiedCalendarEventInput } from "@/modules/cal-unified-calendars/inputs/update-unified-calendar-event.input";
import { GetUnifiedCalendarEventOutput } from "@/modules/cal-unified-calendars/outputs/get-unified-calendar-event.output";
import { GoogleCalendarEventOutputPipe } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { GoogleCalendarService } from "@/modules/cal-unified-calendars/services/google-calendar.service";
import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Patch,
  Body,
} from "@nestjs/common";
import { ApiTags as DocsTags, ApiParam, ApiHeader, ApiOperation } from "@nestjs/swagger";

import { GOOGLE_CALENDAR, SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Cal Unified Calendars")
export class CalUnifiedCalendarsController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @ApiParam({
    name: "calendar",
    enum: [GOOGLE_CALENDAR],
    type: String,
  })
  @ApiParam({
    name: "eventUid",
    description:
      "The Google Calendar event ID. You can retrieve this by getting booking references from the following endpoints:\n\n- For team events: https://cal.com/docs/api-reference/v2/orgs-teams-bookings/get-booking-references-for-a-booking\n\n- For user events: https://cal.com/docs/api-reference/v2/bookings/get-booking-references-for-a-booking",
    type: String,
  })
  @Get("/:calendar/event/:eventUid")
  @Get("/:calendar/events/:eventUid")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get meeting details from calendar",
    description: "Returns detailed information about a meeting including attendance metrics",
  })
  async getCalendarEventDetails(
    @Param("calendar") calendar: string,
    @Param("eventUid") eventUid: string
  ): Promise<GetUnifiedCalendarEventOutput> {
    if (calendar !== GOOGLE_CALENDAR) {
      throw new BadRequestException("Meeting details are currently only available for Google Calendar");
    }

    const eventDetails = await this.googleCalendarService.getEventDetails(eventUid);

    const transformedEvent = new GoogleCalendarEventOutputPipe().transform(eventDetails);

    return {
      status: SUCCESS_STATUS,
      data: transformedEvent,
    };
  }

  @ApiParam({
    name: "calendar",
    enum: [GOOGLE_CALENDAR],
    type: String,
  })
  @ApiParam({
    name: "eventUid",
    description:
      "The Google Calendar event ID. You can retrieve this by getting booking references from the following endpoints:\n\n- For team events: https://cal.com/docs/api-reference/v2/orgs-teams-bookings/get-booking-references-for-a-booking\n\n- For user events: https://cal.com/docs/api-reference/v2/bookings/get-booking-references-for-a-booking",
    type: String,
  })
  @Patch("/:calendar/events/:eventUid")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Update meeting details in calendar",
    description: "Updates event information in the specified calendar provider",
  })
  async updateCalendarEvent(
    @Param("calendar") calendar: string,
    @Param("eventUid") eventUid: string,
    @Body() updateData: UpdateUnifiedCalendarEventInput
  ): Promise<GetUnifiedCalendarEventOutput> {
    if (calendar !== GOOGLE_CALENDAR) {
      throw new BadRequestException("Event updates are currently only available for Google Calendar");
    }

    const updatedEvent = await this.googleCalendarService.updateEventDetails(eventUid, updateData);

    const transformedEvent = new GoogleCalendarEventOutputPipe().transform(updatedEvent);

    return {
      status: SUCCESS_STATUS,
      data: transformedEvent,
    };
  }
}
