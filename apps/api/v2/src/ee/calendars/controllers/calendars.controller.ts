import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CreateIcsFeedInputDto } from "@/ee/calendars/input/create-ics.input";
import { CreateIcsFeedOutputResponseDto } from "@/ee/calendars/input/create-ics.output";
import { DeleteCalendarCredentialsInputBodyDto } from "@/ee/calendars/input/delete-calendar-credentials.input";
import { GetBusyTimesOutput } from "@/ee/calendars/outputs/busy-times.output";
import { ConnectedCalendarsOutput } from "@/ee/calendars/outputs/connected-calendars.output";
import {
  DeletedCalendarCredentialsOutputResponseDto,
  DeletedCalendarCredentialsOutputDto,
} from "@/ee/calendars/outputs/delete-calendar-credentials.output";
import { AppleCalendarService } from "@/ee/calendars/services/apple-calendar.service";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GoogleCalendarService } from "@/ee/calendars/services/gcal.service";
import { IcsFeedService } from "@/ee/calendars/services/ics-feed.service";
import { OutlookService } from "@/ee/calendars/services/outlook.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  Req,
  Param,
  Headers,
  Redirect,
  BadRequestException,
  Post,
  Body,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { plainToClass } from "class-transformer";
import { Request } from "express";
import { z } from "zod";

import { APPS_READ } from "@calcom/platform-constants";
import {
  SUCCESS_STATUS,
  CALENDARS,
  GOOGLE_CALENDAR,
  OFFICE_365_CALENDAR,
  APPLE_CALENDAR,
  CREDENTIAL_CALENDARS,
} from "@calcom/platform-constants";
import { ApiResponse, CalendarBusyTimesInput } from "@calcom/platform-types";

@Controller({
  path: "/v2/calendars",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Calendars")
export class CalendarsController {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly outlookService: OutlookService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly appleCalendarService: AppleCalendarService,
    private readonly icsFeedService: IcsFeedService,
    private readonly calendarsRepository: CalendarsRepository
  ) {}

  @Post("/ics-feed/save")
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Save an ICS feed" })
  async createIcsFeed(
    @GetUser("id") userId: number,
    @GetUser("email") userEmail: string,
    @Body() body: CreateIcsFeedInputDto
  ): Promise<CreateIcsFeedOutputResponseDto> {
    return await this.icsFeedService.save(userId, userEmail, body.urls, body.readOnly);
  }

  @Get("/ics-feed/check")
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Check an ICS feed" })
  async checkIcsFeed(@GetUser("id") userId: number): Promise<ApiResponse> {
    return await this.icsFeedService.check(userId);
  }

  @UseGuards(ApiAuthGuard)
  @Get("/busy-times")
  @ApiOperation({
    summary: "Get busy times",
    description:
      "Get busy times from a calendar. Example request URL is `https://api.cal.com/v2/calendars/busy-times?loggedInUsersTz=Europe%2FMadrid&dateFrom=2024-12-18&dateTo=2024-12-18&calendarsToLoad[0][credentialId]=135&calendarsToLoad[0][externalId]=skrauciz%40gmail.com`",
  })
  async getBusyTimes(
    @Query() queryParams: CalendarBusyTimesInput,
    @GetUser() user: UserWithProfile
  ): Promise<GetBusyTimesOutput> {
    const { loggedInUsersTz, dateFrom, dateTo, calendarsToLoad } = queryParams;

    const busyTimes = await this.calendarsService.getBusyTimes(
      calendarsToLoad,
      user.id,
      dateFrom,
      dateTo,
      loggedInUsersTz
    );

    return {
      status: SUCCESS_STATUS,
      data: busyTimes,
    };
  }

  @Get("/")
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Get all calendars" })
  async getCalendars(@GetUser("id") userId: number): Promise<ConnectedCalendarsOutput> {
    const calendars = await this.calendarsService.getCalendars(userId);

    return {
      status: SUCCESS_STATUS,
      data: calendars,
    };
  }

  @ApiParam({
    enum: [OFFICE_365_CALENDAR, GOOGLE_CALENDAR],
    type: String,
    name: "calendar",
  })
  @UseGuards(ApiAuthGuard)
  @Get("/:calendar/connect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get oAuth connect URL" })
  async redirect(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
    @Param("calendar") calendar: string,
    @Query("redir") redir?: string | null
  ): Promise<ApiResponse<{ authUrl: string }>> {
    switch (calendar) {
      case OFFICE_365_CALENDAR:
        return await this.outlookService.connect(authorization, req, redir ?? "");
      case GOOGLE_CALENDAR:
        return await this.googleCalendarService.connect(authorization, req, redir ?? "");
      default:
        throw new BadRequestException(
          "Invalid calendar type, available calendars are: ",
          CALENDARS.join(", ")
        );
    }
  }

  @ApiParam({
    enum: [OFFICE_365_CALENDAR, GOOGLE_CALENDAR],
    type: String,
    name: "calendar",
  })
  @Get("/:calendar/save")
  @HttpCode(HttpStatus.OK)
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "Save an oAuth calendar credentials" })
  async save(
    @Query("state") state: string,
    @Query("code") code: string,
    @Param("calendar") calendar: string
  ): Promise<{ url: string }> {
    // state params contains our user access token
    const stateParams = new URLSearchParams(state);
    const { accessToken, origin, redir } = z
      .object({ accessToken: z.string(), origin: z.string(), redir: z.string().nullish().optional() })
      .parse({
        accessToken: stateParams.get("accessToken"),
        origin: stateParams.get("origin"),
        redir: stateParams.get("redir"),
      });
    switch (calendar) {
      case OFFICE_365_CALENDAR:
        return await this.outlookService.save(code, accessToken, origin, redir ?? "");
      case GOOGLE_CALENDAR:
        return await this.googleCalendarService.save(code, accessToken, origin, redir ?? "");
      default:
        throw new BadRequestException(
          "Invalid calendar type, available calendars are: ",
          CALENDARS.join(", ")
        );
    }
  }

  @ApiParam({
    enum: [APPLE_CALENDAR],
    type: String,
    name: "calendar",
  })
  @UseGuards(ApiAuthGuard)
  @Post("/:calendar/credentials")
  @ApiOperation({ summary: "Sync credentials" })
  async syncCredentials(
    @GetUser() user: User,
    @Param("calendar") calendar: string,
    @Body() body: { username: string; password: string }
  ): Promise<{ status: string }> {
    const { username, password } = body;

    switch (calendar) {
      case APPLE_CALENDAR:
        return await this.appleCalendarService.save(user.id, user.email, username, password);
      default:
        throw new BadRequestException(
          "Invalid calendar type, available calendars are: ",
          CREDENTIAL_CALENDARS.join(", ")
        );
    }
  }

  @ApiParam({
    enum: [APPLE_CALENDAR, GOOGLE_CALENDAR, OFFICE_365_CALENDAR],
    type: String,
    name: "calendar",
  })
  @Get("/:calendar/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @Permissions([APPS_READ])
  @ApiOperation({ summary: "Check a calendar connection" })
  async check(@GetUser("id") userId: number, @Param("calendar") calendar: string): Promise<ApiResponse> {
    switch (calendar) {
      case OFFICE_365_CALENDAR:
        return await this.outlookService.check(userId);
      case GOOGLE_CALENDAR:
        return await this.googleCalendarService.check(userId);
      case APPLE_CALENDAR:
        return await this.appleCalendarService.check(userId);
      default:
        throw new BadRequestException(
          "Invalid calendar type, available calendars are: ",
          CALENDARS.join(", ")
        );
    }
  }

  @ApiParam({
    enum: [APPLE_CALENDAR, GOOGLE_CALENDAR, OFFICE_365_CALENDAR],
    type: String,
    name: "calendar",
  })
  @UseGuards(ApiAuthGuard)
  @Post("/:calendar/disconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect a calendar" })
  async deleteCalendarCredentials(
    @Param("calendar") calendar: string,
    @Body() body: DeleteCalendarCredentialsInputBodyDto,
    @GetUser() user: UserWithProfile
  ): Promise<DeletedCalendarCredentialsOutputResponseDto> {
    const { id: credentialId } = body;
    await this.calendarsService.checkCalendarCredentials(credentialId, user.id);

    const { id, type, userId, teamId, appId, invalid } = await this.calendarsRepository.deleteCredentials(
      credentialId
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(
        DeletedCalendarCredentialsOutputDto,
        { id, type, userId, teamId, appId, invalid },
        { strategy: "excludeAll" }
      ),
    };
  }
}
