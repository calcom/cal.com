import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { CreateUnifiedCalendarEventInput } from "@/modules/cal-unified-calendars/inputs/create-unified-calendar-event.input";
import { FreebusyUnifiedInput } from "@/modules/cal-unified-calendars/inputs/freebusy-unified.input";
import { ListUnifiedCalendarEventsInput } from "@/modules/cal-unified-calendars/inputs/list-unified-calendar-events.input";
import { UpdateUnifiedCalendarEventInput } from "@/modules/cal-unified-calendars/inputs/update-unified-calendar-event.input";
import {
  GetUnifiedCalendarEventOutput,
  ListUnifiedCalendarEventsOutput,
} from "@/modules/cal-unified-calendars/outputs/get-unified-calendar-event.output";
import {
  ListConnectionsOutput,
  CalendarConnectionItem,
} from "@/modules/cal-unified-calendars/outputs/list-connections.output";
import { GoogleCalendarEventOutputPipe } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { GoogleCalendarService } from "@/modules/cal-unified-calendars/services/google-calendar.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiTags as DocsTags } from "@nestjs/swagger";

import {
  GOOGLE_CALENDAR,
  SUCCESS_STATUS,
  APPLE_CALENDAR,
  OFFICE_365_CALENDAR,
  GOOGLE_CALENDAR_TYPE,
  OFFICE_365_CALENDAR_TYPE,
  APPLE_CALENDAR_TYPE,
} from "@calcom/platform-constants";

import { GetBusyTimesOutput } from "@/ee/calendars/outputs/busy-times.output";

const UNIFIED_CALENDAR_PARAM = [GOOGLE_CALENDAR, OFFICE_365_CALENDAR, APPLE_CALENDAR] as const;

const INTEGRATION_TYPE_TO_API: Record<string, "google" | "office365" | "apple"> = {
  [GOOGLE_CALENDAR_TYPE]: GOOGLE_CALENDAR,
  [OFFICE_365_CALENDAR_TYPE]: OFFICE_365_CALENDAR,
  [APPLE_CALENDAR_TYPE]: APPLE_CALENDAR,
};

@Controller({
  path: "/v2/calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Cal Unified Calendars")
export class CalUnifiedCalendarsController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly calendarsService: CalendarsService
  ) {}

  @Get("connections")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "List calendar connections",
    description:
      "Returns all calendar connections for the authenticated user. Use connectionId in connection-scoped endpoints.",
  })
  async listConnections(@GetUser("id") userId: number): Promise<ListConnectionsOutput> {
    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const connections: CalendarConnectionItem[] = connectedCalendars
      .filter(
        (c: { integration: { type: string } }) =>
          c.integration.type === GOOGLE_CALENDAR_TYPE ||
          c.integration.type === OFFICE_365_CALENDAR_TYPE ||
          c.integration.type === APPLE_CALENDAR_TYPE
      )
      .map(
        (c: {
          credentialId: number;
          integration: { type: string };
          primary?: { externalId?: string; email?: string };
        }) => {
          const apiType = INTEGRATION_TYPE_TO_API[c.integration.type];
          const email = c.primary?.externalId ?? c.primary?.email ?? "";
          return {
            connectionId: String(c.credentialId),
            type: apiType ?? GOOGLE_CALENDAR,
            email: email || "unknown",
          };
        }
      );
    return {
      status: SUCCESS_STATUS,
      data: { connections },
    };
  }

  @ApiParam({ name: "connectionId", description: "Calendar connection ID from GET /connections", type: String })
  @Get("connections/:connectionId/events")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "List events for a connection",
    description: "List events in a date range for a specific calendar connection.",
  })
  @ApiQuery({ name: "from", required: true, type: String })
  @ApiQuery({ name: "to", required: true, type: String })
  @ApiQuery({ name: "timeZone", required: false, type: String })
  @ApiQuery({ name: "calendarId", required: false, type: String })
  async listConnectionEvents(
    @Param("connectionId") connectionId: string,
    @GetUser("id") userId: number,
    @Query() query: ListUnifiedCalendarEventsInput
  ): Promise<ListUnifiedCalendarEventsOutput> {
    const credentialId = parseInt(connectionId, 10);
    if (Number.isNaN(credentialId)) {
      throw new BadRequestException("Invalid connectionId");
    }
    const timeMin = query.from.includes("T") ? query.from : `${query.from}T00:00:00.000Z`;
    const timeMax = query.to.includes("T") ? query.to : `${query.to}T23:59:59.999Z`;
    const events = await this.googleCalendarService.listEventsForUserByConnectionId(
      userId,
      credentialId,
      query.calendarId ?? "primary",
      timeMin,
      timeMax
    );
    const pipe = new GoogleCalendarEventOutputPipe();
    const data = events.map((e) => pipe.transform(e));
    return { status: SUCCESS_STATUS, data };
  }

  @ApiParam({ name: "connectionId", type: String })
  @Post("connections/:connectionId/events")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Create event on a connection",
    description: "Create a new event on the specified calendar connection.",
  })
  async createConnectionEvent(
    @Param("connectionId") connectionId: string,
    @GetUser("id") userId: number,
    @Body() body: CreateUnifiedCalendarEventInput
  ): Promise<GetUnifiedCalendarEventOutput> {
    const credentialId = parseInt(connectionId, 10);
    if (Number.isNaN(credentialId)) {
      throw new BadRequestException("Invalid connectionId");
    }
    const event = await this.googleCalendarService.createEventForUserByConnectionId(
      userId,
      credentialId,
      "primary",
      body
    );
    const transformedEvent = new GoogleCalendarEventOutputPipe().transform(event);
    return { status: SUCCESS_STATUS, data: transformedEvent };
  }

  @ApiParam({ name: "connectionId", type: String })
  @ApiParam({ name: "eventId", type: String })
  @Get("connections/:connectionId/events/:eventId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get event for a connection",
    description: "Get a single event by ID for the specified calendar connection.",
  })
  async getConnectionEvent(
    @Param("connectionId") connectionId: string,
    @Param("eventId") eventId: string,
    @GetUser("id") userId: number,
    @Query("calendarId") calendarId?: string
  ): Promise<GetUnifiedCalendarEventOutput> {
    const credentialId = parseInt(connectionId, 10);
    if (Number.isNaN(credentialId)) {
      throw new BadRequestException("Invalid connectionId");
    }
    const event = await this.googleCalendarService.getEventByConnectionId(
      userId,
      credentialId,
      calendarId ?? "primary",
      eventId
    );
    const transformedEvent = new GoogleCalendarEventOutputPipe().transform(event);
    return { status: SUCCESS_STATUS, data: transformedEvent };
  }

  @ApiParam({ name: "connectionId", type: String })
  @ApiParam({ name: "eventId", type: String })
  @Patch("connections/:connectionId/events/:eventId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Update event for a connection",
    description: "Update an event on the specified calendar connection.",
  })
  async updateConnectionEvent(
    @Param("connectionId") connectionId: string,
    @Param("eventId") eventId: string,
    @GetUser("id") userId: number,
    @Body() updateData: UpdateUnifiedCalendarEventInput,
    @Query("calendarId") calendarId?: string
  ): Promise<GetUnifiedCalendarEventOutput> {
    const credentialId = parseInt(connectionId, 10);
    if (Number.isNaN(credentialId)) {
      throw new BadRequestException("Invalid connectionId");
    }
    const updatedEvent = await this.googleCalendarService.updateEventByConnectionId(
      userId,
      credentialId,
      calendarId ?? "primary",
      eventId,
      updateData
    );
    const transformedEvent = new GoogleCalendarEventOutputPipe().transform(updatedEvent);
    return { status: SUCCESS_STATUS, data: transformedEvent };
  }

  @ApiParam({ name: "connectionId", type: String })
  @ApiParam({ name: "eventId", type: String })
  @Delete("connections/:connectionId/events/:eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Delete event for a connection",
    description: "Delete/cancel an event on the specified calendar connection.",
  })
  async deleteConnectionEvent(
    @Param("connectionId") connectionId: string,
    @Param("eventId") eventId: string,
    @GetUser("id") userId: number,
    @Query("calendarId") calendarId?: string
  ): Promise<void> {
    const credentialId = parseInt(connectionId, 10);
    if (Number.isNaN(credentialId)) {
      throw new BadRequestException("Invalid connectionId");
    }
    await this.googleCalendarService.deleteEventForUserByConnectionId(
      userId,
      credentialId,
      calendarId ?? "primary",
      eventId
    );
  }

  @ApiParam({ name: "connectionId", type: String })
  @Get("connections/:connectionId/freebusy")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get free/busy for a connection",
    description: "Get busy time slots for the specified calendar connection.",
  })
  @ApiQuery({ name: "from", required: true, type: String })
  @ApiQuery({ name: "to", required: true, type: String })
  @ApiQuery({ name: "timeZone", required: false, type: String })
  async getConnectionFreeBusy(
    @Param("connectionId") connectionId: string,
    @GetUser("id") userId: number,
    @Query() query: FreebusyUnifiedInput
  ): Promise<GetBusyTimesOutput> {
    const credentialId = parseInt(connectionId, 10);
    if (Number.isNaN(credentialId)) {
      throw new BadRequestException("Invalid connectionId");
    }
    const timezone = query.timeZone ?? "UTC";
    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const conn = connectedCalendars.find(
      (c: { credentialId: number }) => c.credentialId === credentialId
    ) as
      | {
          credentialId: number;
          calendars?: Array<{ credentialId: number; externalId: string; isSelected: boolean }>;
          primary?: { externalId: string };
        }
      | undefined;
    if (!conn) {
      throw new BadRequestException("Calendar connection not found");
    }
    let calendarsToLoad = (conn.calendars ?? [])
      .filter((cal: { isSelected: boolean }) => cal.isSelected)
      .map((cal: { credentialId: number; externalId: string }) => ({
        credentialId: cal.credentialId,
        externalId: cal.externalId,
      }));
    if (calendarsToLoad.length === 0 && conn.primary?.externalId) {
      calendarsToLoad = [{ credentialId: conn.credentialId, externalId: conn.primary.externalId }];
    }
    if (calendarsToLoad.length === 0) {
      return { status: SUCCESS_STATUS, data: [] };
    }
    const busyTimes = await this.calendarsService.getBusyTimes(
      calendarsToLoad,
      userId,
      query.from,
      query.to,
      timezone
    );
    return { status: SUCCESS_STATUS, data: busyTimes };
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
  @Get("/:calendar/event/:eventUid")
  @Get("/:calendar/events/:eventUid")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get meeting details from calendar",
    description:
      "Returns detailed information about a meeting including attendance metrics. Prefer the plural path /events/ (singular /event/ is deprecated). For connection-scoped access use GET /connections/{connectionId}/events/{eventId}.",
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

  @ApiParam({ name: "calendar", enum: UNIFIED_CALENDAR_PARAM, type: String })
  @Get("/:calendar/events")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "List calendar events",
    description: "List events in a date range for the authenticated user's calendar. Currently only Google Calendar is supported.",
  })
  @ApiQuery({ name: "from", required: true, type: String })
  @ApiQuery({ name: "to", required: true, type: String })
  @ApiQuery({ name: "timeZone", required: false, type: String })
  @ApiQuery({ name: "calendarId", required: false, type: String })
  async listCalendarEvents(
    @Param("calendar") calendar: string,
    @GetUser("id") userId: number,
    @Query() query: ListUnifiedCalendarEventsInput
  ): Promise<ListUnifiedCalendarEventsOutput> {
    if (calendar !== GOOGLE_CALENDAR) {
      throw new BadRequestException(
        "List events is currently only available for Google Calendar. Office 365 and Apple support is coming soon."
      );
    }
    const timeMin = query.from.includes("T") ? query.from : `${query.from}T00:00:00.000Z`;
    const timeMax = query.to.includes("T") ? query.to : `${query.to}T23:59:59.999Z`;
    const events = await this.googleCalendarService.listEventsForUser(
      userId,
      query.calendarId ?? "primary",
      timeMin,
      timeMax
    );
    const pipe = new GoogleCalendarEventOutputPipe();
    const data = events.map((e) => pipe.transform(e));
    return { status: SUCCESS_STATUS, data };
  }

  @ApiParam({ name: "calendar", enum: UNIFIED_CALENDAR_PARAM, type: String })
  @Post("/:calendar/events")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Create a calendar event",
    description: "Create a new event on the authenticated user's calendar. Currently only Google Calendar is supported.",
  })
  async createCalendarEvent(
    @Param("calendar") calendar: string,
    @GetUser("id") userId: number,
    @Body() body: CreateUnifiedCalendarEventInput
  ): Promise<GetUnifiedCalendarEventOutput> {
    if (calendar !== GOOGLE_CALENDAR) {
      throw new BadRequestException(
        "Create event is currently only available for Google Calendar. Office 365 and Apple support is coming soon."
      );
    }
    const event = await this.googleCalendarService.createEventForUser(
      userId,
      "primary",
      body
    );
    const transformedEvent = new GoogleCalendarEventOutputPipe().transform(event);
    return { status: SUCCESS_STATUS, data: transformedEvent };
  }

  @ApiParam({ name: "calendar", enum: UNIFIED_CALENDAR_PARAM, type: String })
  @ApiParam({ name: "eventUid", description: "The calendar provider's event ID (e.g. Google Calendar event ID)", type: String })
  @Delete("/:calendar/events/:eventUid")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Delete a calendar event",
    description: "Delete/cancel an event on the authenticated user's calendar. Currently only Google Calendar is supported.",
  })
  async deleteCalendarEvent(
    @Param("calendar") calendar: string,
    @Param("eventUid") eventUid: string,
    @GetUser("id") userId: number
  ): Promise<void> {
    if (calendar !== GOOGLE_CALENDAR) {
      throw new BadRequestException(
        "Delete event is currently only available for Google Calendar. Office 365 and Apple support is coming soon."
      );
    }
    await this.googleCalendarService.deleteEventForUser(userId, "primary", eventUid);
  }

  @ApiParam({ name: "calendar", enum: UNIFIED_CALENDAR_PARAM, type: String })
  @Get("/:calendar/freebusy")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get free/busy times",
    description:
      "Get busy time slots for the authenticated user's selected calendars in the given date range. Currently only Google Calendar is supported.",
  })
  @ApiQuery({ name: "from", required: true, type: String })
  @ApiQuery({ name: "to", required: true, type: String })
  @ApiQuery({ name: "timeZone", required: false, type: String })
  async getFreeBusy(
    @Param("calendar") calendar: string,
    @GetUser("id") userId: number,
    @Query() query: FreebusyUnifiedInput
  ): Promise<GetBusyTimesOutput> {
    if (calendar !== GOOGLE_CALENDAR) {
      throw new BadRequestException(
        "Free/busy is currently only available for Google Calendar. Office 365 and Apple support is coming soon."
      );
    }
    const timezone = query.timeZone ?? "UTC";
    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const googleCalendars = connectedCalendars.filter(
      (c: { integration: { type: string } }) => c.integration.type === GOOGLE_CALENDAR_TYPE
    );
    const calendarsToLoad = googleCalendars.flatMap(
      (conn: { credentialId: number; calendars?: Array<{ credentialId: number; externalId: string; isSelected: boolean }> }) =>
        (conn.calendars ?? []).filter((cal) => cal.isSelected).map((cal) => ({ credentialId: cal.credentialId, externalId: cal.externalId }))
    );
    if (calendarsToLoad.length === 0) {
      return { status: SUCCESS_STATUS, data: [] };
    }
    const busyTimes = await this.calendarsService.getBusyTimes(
      calendarsToLoad,
      userId,
      query.from,
      query.to,
      timezone
    );
    return { status: SUCCESS_STATUS, data: busyTimes };
  }
}
