import { AppsRepository } from "@/modules/apps/apps.repository";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
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
  NotFoundException,
  Query,
  Redirect,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { google } from "googleapis";
import { z } from "zod";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiRedirectResponseType, ApiResponse } from "@calcom/platform-types";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

@Controller({
  path: "apps/gcal",
  version: "2",
})
export class GoogleCalendarOAuthController {
  private readonly logger = new Logger("Apps: Gcal Controller");

  constructor(
    private readonly appRepository: AppsRepository,
    private readonly credentialRepository: CredentialsRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly config: ConfigService
  ) {}

  @Get("/oauth/redirect")
  @Redirect(undefined, 301)
  @UseGuards(AccessTokenGuard)
  async redirect(@Req() req: Request): Promise<ApiRedirectResponseType> {
    const app = await this.appRepository.getAppBySlug("google-calendar");

    if (!app) {
      throw new NotFoundException();
    }

    const { client_id, client_secret } = z
      .object({ client_id: z.string(), client_secret: z.string() })
      .parse(app.keys);
    const redirect_uri = `${this.config.get("api.url")}/apps/gcal/oauth/save`;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    const accessToken = req.get("Authorization")?.replace("Bearer ", "");
    const origin = req.get("origin") ?? req.get("host");
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CALENDAR_SCOPES,
      prompt: "consent",
      state: `accessToken=${accessToken}&origin=${origin}`,
    });
    return { url: authUrl };
  }

  @Get("/oauth/save")
  @Redirect(undefined, 301)
  @HttpCode(HttpStatus.OK)
  async save(@Query("state") state: string, @Query("code") code: string): Promise<ApiRedirectResponseType> {
    const stateParams = new URLSearchParams(state);
    const { accessToken, origin } = z
      .object({ accessToken: z.string(), origin: z.string() })
      .parse(stateParams);
    const parsedCode = z.string().parse(code);

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException("Invalid Access token.");
    }

    const app = await this.appRepository.getAppBySlug("google-calendar");

    if (!app) {
      throw new NotFoundException();
    }

    const { client_id, client_secret } = z
      .object({ client_id: z.string(), client_secret: z.string() })
      .parse(app.keys);
    const redirect_uri = `${this.config.get("api.url")}/apps/gcal/oauth/save`;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    const token = await oAuth2Client.getToken(parsedCode);
    const key = token.res?.data;
    const credential = await this.credentialRepository.createAppCredential(
      "google_calendar",
      key,
      ownerId,
      "google-calendar"
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
        "google_calendar"
      );
    }

    return { url: origin };
  }
}
