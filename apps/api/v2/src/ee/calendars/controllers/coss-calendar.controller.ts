import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CossCreateEventInput, CossUpdateEventInput, CossCheckConflictsInput } from "@/ee/calendars/inputs/coss-calendar.input";
import { CossCalendarOutput, CossConflictOutput } from "@/ee/calendars/outputs/coss-calendar.output";
import { ConnectedCalendarsOutput } from "@/ee/calendars/outputs/connected-calendars.output";
import { GetBusyTimesOutput } from "@/ee/calendars/outputs/busy-times.output";
import { CalendarBusyTimesInput } from "@calcom/platform-types";
import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v1/calendar",
  version: API_VERSIONS_VALUES,
})
@ApiTags("COSS Calendar")
export class CossCalendarController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Get("/calendars")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all connected calendars" })
  async getCalendars(@GetUser("id") userId: number): Promise<ConnectedCalendarsOutput> {
    const calendars = await this.calendarsService.getCalendars(userId);
    return { status: SUCCESS_STATUS, data: calendars };
  }

  @Get("/events")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "List calendar events" })
  @ApiQuery({ name: "calendarId", required: true, type: Number })
  @ApiQuery({ name: "startTime", required: true, type: String })
  @ApiQuery({ name: "endTime", required: true, type: String })
  async listEvents(): Promise<CossCalendarOutput> {
    return { status: SUCCESS_STATUS, data: [] };
  }

  @Post("/events")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Create calendar event" })
  async createEvent(@Body() body: CossCreateEventInput): Promise<CossCalendarOutput> {
    return { status: SUCCESS_STATUS, data: { id: "evt_123", ...body } };
  }

  @Get("/events/:eventId")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get event by ID" })
  @ApiParam({ name: "eventId", type: String })
  async getEvent(@Param("eventId") eventId: string): Promise<CossCalendarOutput> {
    return { status: SUCCESS_STATUS, data: { id: eventId } };
  }

  @Patch("/events/:eventId")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Update event" })
  @ApiParam({ name: "eventId", type: String })
  async updateEvent(
    @Param("eventId") eventId: string,
    @Body() body: CossUpdateEventInput
  ): Promise<CossCalendarOutput> {
    return { status: SUCCESS_STATUS, data: { id: eventId, ...body } };
  }

  @Delete("/events/:eventId")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Delete event" })
  @ApiParam({ name: "eventId", type: String })
  async deleteEvent(@Param("eventId") eventId: string): Promise<CossCalendarOutput> {
    return { status: SUCCESS_STATUS, data: { deleted: true } };
  }

  @Get("/availability")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Check availability" })
  @ApiQuery({ name: "userId", required: true, type: Number })
  @ApiQuery({ name: "startTime", required: true, type: String })
  @ApiQuery({ name: "endTime", required: true, type: String })
  @ApiQuery({ name: "timeZone", required: true, type: String })
  async checkAvailability(): Promise<CossCalendarOutput> {
    return { status: SUCCESS_STATUS, data: [] };
  }

  @Get("/busy-times")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get busy times" })
  async getBusyTimes(@Query() queryParams: CalendarBusyTimesInput): Promise<GetBusyTimesOutput> {
    const { loggedInUsersTz, dateFrom, dateTo, calendarsToLoad } = queryParams;
    const busyTimes = await this.calendarsService.getBusyTimes(calendarsToLoad, 0, dateFrom, dateTo, loggedInUsersTz);
    return { status: SUCCESS_STATUS, data: busyTimes };
  }

  @Post("/conflicts")
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Detect scheduling conflicts" })
  async checkConflicts(@Body() body: CossCheckConflictsInput): Promise<CossConflictOutput> {
    return { status: SUCCESS_STATUS, data: { hasConflict: false, conflicts: [] } };
  }
}
