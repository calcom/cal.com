import { GetBusyTimesOutput } from "@/ee/calendars/outputs/busy-times.output";
import { ConnectedCalendarsOutput } from "@/ee/calendars/outputs/connected-calendars.output";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GoogleCalendarService } from "@/ee/calendars/services/gcal.service";
import { OutlookService } from "@/ee/calendars/services/outlook.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Request } from "express";
import { z } from "zod";

import { OFFICE_365_CALENDAR_TYPE, APPS_READ } from "@calcom/platform-constants";
import {
  SUCCESS_STATUS,
  CALENDARS,
  GOOGLE_CALENDAR,
  MICROSOFT_OUTLOOK_CALENDAR,
} from "@calcom/platform-constants";
import { CalendarBusyTimesInput } from "@calcom/platform-types";

@Controller({
  path: "/calendars",
  version: "2",
})
@DocsTags("Calendars")
export class CalendarsController {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly outlookService: OutlookService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly tokensRepository: TokensRepository,
    private readonly credentialRepository: CredentialsRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository
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
    @Param("calendar") calendar: string
  ): Promise<{ status: string; data: { authUrl: string } }> {
    switch (calendar) {
      case MICROSOFT_OUTLOOK_CALENDAR:
        return await this.outlookService.connect(authorization, req);
      case GOOGLE_CALENDAR:
        return await this.googleCalendarService.connect(authorization, req);
      default:
        throw new BadRequestException(
          "Invalid calendar type, available calendars are: ",
          CALENDARS.join(", ")
        );
    }
  }

  @Get("/office365/save")
  @HttpCode(HttpStatus.OK)
  @Redirect(undefined, 301)
  async save(@Query("state") state: string, @Query("code") code: string): Promise<{ url: string }> {
    // state params contains our user access token
    const stateParams = new URLSearchParams(state);
    const { accessToken, origin } = z
      .object({ accessToken: z.string(), origin: z.string() })
      .parse({ accessToken: stateParams.get("accessToken"), origin: stateParams.get("origin") });

    // if code is not defined, user denied to authorize office 365 app, just redirect straight away
    if (!code) {
      return { url: origin };
    }

    const parsedCode = z.string().parse(code);

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException("Invalid Access token.");
    }

    const office365OAuthCredentials = await this.calendarsService.getOffice365OAuthCredentials(parsedCode);

    const defaultCalendar = await this.calendarsService.getOffice365DefaultCalendar(accessToken);

    if (defaultCalendar?.id) {
      const credential = await this.credentialRepository.createAppCredential(
        OFFICE_365_CALENDAR_TYPE,
        office365OAuthCredentials,
        ownerId
      );

      await this.selectedCalendarsRepository.createSelectedCalendar(
        defaultCalendar.id,
        credential.id,
        ownerId,
        OFFICE_365_CALENDAR_TYPE
      );
    }

    return {
      url: origin,
    };
  }

  @Get("/office365/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard, PermissionsGuard)
  @Permissions([APPS_READ])
  async check(@GetUser("id") userId: number): Promise<{ status: "success" }> {
    const office365CalendarCredentials = await this.credentialRepository.getByTypeAndUserId(
      "office365_calendar",
      userId
    );

    if (!office365CalendarCredentials) {
      throw new BadRequestException("Credentials for office_365_calendar not found.");
    }

    if (office365CalendarCredentials.invalid) {
      throw new BadRequestException("Invalid office 365 calendar credentials.");
    }

    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const office365Calendar = connectedCalendars.find(
      (cal: { integration: { type: string } }) => cal.integration.type === OFFICE_365_CALENDAR_TYPE
    );
    if (!office365Calendar) {
      throw new UnauthorizedException("Office 365 calendar not connected.");
    }
    if (office365Calendar.error?.message) {
      throw new UnauthorizedException(office365Calendar.error?.message);
    }

    return {
      status: SUCCESS_STATUS,
    };
  }
}
