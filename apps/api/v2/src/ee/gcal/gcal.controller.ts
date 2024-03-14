import { AppsRepository } from "@/modules/apps/apps.repository";
import { GcalService } from "@/modules/apps/services/gcal.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
import { Request } from "express";
import { google } from "googleapis";
import { z } from "zod";

import {
  APPS_READ,
  GOOGLE_CALENDAR_ID,
  GOOGLE_CALENDAR_TYPE,
  SUCCESS_STATUS,
} from "@calcom/platform-constants";
import { ApiRedirectResponseType, ApiResponse } from "@calcom/platform-types";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

@Controller({
  path: "platform/gcal",
  version: "2",
})
export class GcalController {
  private readonly logger = new Logger("Platform Gcal Provider");

  constructor(
    private readonly appRepository: AppsRepository,
    private readonly credentialRepository: CredentialsRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly config: ConfigService,
    private readonly gcalService: GcalService
  ) {}

  private redirectUri = `${this.config.get("api.url")}/platform/gcal/oauth/save`;

  @Get("/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async redirect(
    @Headers("Authorization") authorization: string,
    @Req() req: Request
  ): Promise<ApiResponse<{ authUrl: string }>> {
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
  async save(@Query("state") state: string, @Query("code") code: string): Promise<ApiRedirectResponseType> {
    const stateParams = new URLSearchParams(state);
    const { accessToken, origin } = z
      .object({ accessToken: z.string(), origin: z.string() })
      .parse({ accessToken: stateParams.get("accessToken"), origin: stateParams.get("origin") });

    // User chose not to authorize your app or didn't authorize your app
    // redirect directly without oauth code
    if (!code) {
      return { url: origin };
    }

    const parsedCode = z.string().parse(code);

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException("Invalid Access token.");
    }

    const oAuth2Client = await this.gcalService.getOAuthClient(this.redirectUri);
    const token = await oAuth2Client.getToken(parsedCode);
    const key = token.res?.data;
    const credential = await this.credentialRepository.createAppCredential(
      GOOGLE_CALENDAR_TYPE,
      key,
      ownerId
    );

    oAuth2Client.setCredentials(key);

    const calendar = google.calendar({
      version: "v3",
      auth: oAuth2Client,
    });

    const cals = await calendar.calendarList.list({ fields: "items(id,summary,primary,accessRole)" });

    const primaryCal = cals.data.items?.find((cal) => cal.primary);

    if (primaryCal?.id) {
      await this.selectedCalendarsRepository.createSelectedCalendar(
        primaryCal.id,
        credential.id,
        ownerId,
        GOOGLE_CALENDAR_ID
      );
    }

    return { url: origin };
  }

  @Get("/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard, PermissionsGuard)
  @Permissions([APPS_READ])
  async check(@GetUser("id") userId: number): Promise<ApiResponse> {
    const gcalCredentials = await this.credentialRepository.getByTypeAndUserId("google_calendar", userId);

    if (!gcalCredentials) {
      throw new BadRequestException("Credentials for google_calendar not found.");
    }

    if (gcalCredentials.invalid) {
      throw new BadRequestException("Invalid google oauth credentials.");
    }

    return { status: SUCCESS_STATUS };
  }
}
