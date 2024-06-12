import { GetBusyTimesOutput } from "@/ee/calendars/outputs/busy-times.output";
import { ConnectedCalendarsOutput } from "@/ee/calendars/outputs/connected-calendars.output";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GoogleCalendarService } from "@/ee/calendars/services/gcal.service";
import { OutlookService } from "@/ee/calendars/services/outlook.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
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
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Request } from "express";
import { z } from "zod";

import { APPS_READ } from "@calcom/platform-constants";
import { SUCCESS_STATUS, CALENDARS, GOOGLE_CALENDAR, OFFICE_365_CALENDAR } from "@calcom/platform-constants";
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
    private readonly googleCalendarService: GoogleCalendarService
  ) {}

  @UseGuards(AccessTokenGuard)
  @Get("/busy-times")
  async getBusyTimes(
    @Query() queryParams: CalendarBusyTimesInput,
    @GetUser() user: UserWithProfile
  ): Promise<GetBusyTimesOutput> {
    const { loggedInUsersTz, dateFrom, dateTo, calendarsToLoad } = queryParams;
    if (!dateFrom || !dateTo) {
      return {
        status: SUCCESS_STATUS,
        data: [],
      };
    }

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
  @UseGuards(AccessTokenGuard)
  async getCalendars(@GetUser("id") userId: number): Promise<ConnectedCalendarsOutput> {
    const calendars = await this.calendarsService.getCalendars(userId);

    return {
      status: SUCCESS_STATUS,
      data: calendars,
    };
  }

  @UseGuards(AccessTokenGuard)
  @Get("/:calendar/connect")
  @HttpCode(HttpStatus.OK)
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

  @Get("/:calendar/save")
  @HttpCode(HttpStatus.OK)
  @Redirect(undefined, 301)
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

  @Get("/:calendar/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard, PermissionsGuard)
  @Permissions([APPS_READ])
  async check(@GetUser("id") userId: number, @Param("calendar") calendar: string): Promise<ApiResponse> {
    switch (calendar) {
      case OFFICE_365_CALENDAR:
        return await this.outlookService.check(userId);
      case GOOGLE_CALENDAR:
        return await this.googleCalendarService.check(userId);
      default:
        throw new BadRequestException(
          "Invalid calendar type, available calendars are: ",
          CALENDARS.join(", ")
        );
    }
  }
}
