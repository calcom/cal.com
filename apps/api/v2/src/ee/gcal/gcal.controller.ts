import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GcalAuthUrlOutput } from "@/ee/gcal/outputs/auth-url.output";
import { GcalCheckOutput } from "@/ee/gcal/outputs/check.output";
import { GcalSaveRedirectOutput } from "@/ee/gcal/outputs/save-redirect.output";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GCalService } from "@/modules/apps/services/gcal.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  Redirect,
  Req,
  UnauthorizedException,
  UseGuards,
  Headers,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import { ApiOperation } from "@nestjs/swagger";
import { Request } from "express";

import { APPS_READ, GOOGLE_CALENDAR_TYPE, SUCCESS_STATUS } from "@calcom/platform-constants";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// Controller for the GCalConnect Atom
@Controller({
  path: "/v2/gcal",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
export class GcalController {
  private readonly logger = new Logger("Platform Gcal Provider");

  constructor(
    private readonly credentialRepository: CredentialsRepository,
    private readonly config: ConfigService,
    private readonly gcalService: GCalService,
    private readonly calendarsService: CalendarsService
  ) {}

  private redirectUri = `${this.config.get("api.url")}/gcal/oauth/save`;

  @Get("/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Get auth URL" })
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
  @ApiOperation({ summary: "Connect a calendar" })
  async save(@Query("state") state: string, @Query("code") code: string): Promise<GcalSaveRedirectOutput> {
    const url = new URL(this.config.get("api.url") + "/calendars/google/save");
    url.searchParams.append("code", code);
    url.searchParams.append("state", state);
    return { url: url.href };
  }

  @Get("/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @Permissions([APPS_READ])
  @ApiOperation({ summary: "Check a calendar connection status" })
  async check(@GetUser("id") userId: number): Promise<GcalCheckOutput> {
    const gcalCredentials = await this.credentialRepository.findCredentialByTypeAndUserId(
      "google_calendar",
      userId
    );

    if (!gcalCredentials) {
      throw new BadRequestException("Credentials for google_calendar not found.");
    }

    if (gcalCredentials.invalid) {
      throw new BadRequestException("Invalid google OAuth credentials.");
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
