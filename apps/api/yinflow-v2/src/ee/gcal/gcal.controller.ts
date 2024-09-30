import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Query,
  Redirect,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Request } from "express";

import { APPS_READ, GOOGLE_CALENDAR_TYPE, SUCCESS_STATUS } from "@calcom/platform-constants";

import { getEnv } from "../../env";
import { API_VERSIONS_VALUES } from "../../lib/api-versions";
import { GCalService } from "../../modules/apps/services/gcal.service";
import { GetUser } from "../../modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "../../modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "../../modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "../../modules/auth/guards/permissions/permissions.guard";
import { CredentialsRepository } from "../../modules/credentials/credentials.repository";
import { CalendarsService } from "../calendars/services/calendars.service";
import { GcalAuthUrlOutput } from "./outputs/auth-url.output";
import { GcalCheckOutput } from "./outputs/check.output";
import { GcalSaveRedirectOutput } from "./outputs/save-redirect.output";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// Controller for the GCalConnect Atom
@Controller({
  path: "/v2/gcal",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Google Calendar")
export class GcalController {
  constructor(
    private readonly credentialRepository: CredentialsRepository,
    private readonly gcalService: GCalService,
    private readonly calendarsService: CalendarsService
  ) {}

  private apiUrl = getEnv("API_URL");
  private redirectUri = `${this.apiUrl}/gcal/oauth/save`;

  @Get("/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  async redirect(
    @Headers("Authorization") authorization: string,
    @Req() req: Request
  ): Promise<GcalAuthUrlOutput> {
    const oAuth2Client = await this.gcalService.getOAuthClient(this.redirectUri);
    const accessToken = authorization.replace("Bearer ", "");
    const origin = req.get("origin") ?? req.get("host");
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CALENDAR_SCOPES,
      prompt: "consent",
      state: `accessToken=${accessToken}&origin=${origin}`,
    });
    return { status: SUCCESS_STATUS, data: { authUrl } };
  }

  @Get("/oauth/save")
  @Redirect(undefined, 301)
  @HttpCode(HttpStatus.OK)
  async save(@Query("state") state: string, @Query("code") code: string): Promise<GcalSaveRedirectOutput> {
    const url = new URL("/calendars/google/save");
    url.searchParams.append("code", code);
    url.searchParams.append("state", state);
    return { url: url.href };
  }

  @Get("/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @Permissions([APPS_READ])
  async check(@GetUser("id") userId: number): Promise<GcalCheckOutput> {
    const gcalCredentials = await this.credentialRepository.getByTypeAndUserId("google_calendar", userId);

    if (!gcalCredentials) {
      throw new BadRequestException("Credentials for google_calendar not found.");
    }

    if (gcalCredentials.invalid) {
      throw new BadRequestException("Invalid google oauth credentials.");
    }

    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const googleCalendar = connectedCalendars.find(
      (cal: { integration: { type: string } }) => cal.integration.type === GOOGLE_CALENDAR_TYPE
    );
    if (!googleCalendar) {
      throw new UnauthorizedException("Google Calendar not connected.");
    }
    if (googleCalendar.error?.message) {
      throw new UnauthorizedException(googleCalendar.error?.message);
    }

    return { status: SUCCESS_STATUS };
  }
}
