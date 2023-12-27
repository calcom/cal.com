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

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiRedirectResponseType, ApiResponse } from "@calcom/platform-types";

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
    const scopes = [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ];
    const app = await this.appRepository.getAppBySlug("google-calendar");
    if (!app) {
      throw new NotFoundException();
    }
    const keys = app.keys as { client_id?: string; client_secret?: string };
    if (!keys.client_id) throw new BadRequestException("Missing google calendar client_id.");
    if (!keys.client_secret) throw new BadRequestException("Missing google calendar secret.");
    const redirect_uri = `${this.config.get("api.url")}/apps/gcal/oauth/save`;
    const oAuth2Client = new google.auth.OAuth2(keys.client_id, keys.client_secret, redirect_uri);
    const accessToken = req.get("Authorization")?.replace("Bearer ", "");
    const origin = req.get("origin") ?? req.get("host");
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: `accessToken=${accessToken}&origin=${origin}`,
    });
    console.log(authUrl);
    return { url: authUrl };
  }

  @Get("/oauth/save")
  @Redirect(undefined, 301)
  @HttpCode(HttpStatus.OK)
  async save(@Query("state") state: string, @Query("code") code: string): Promise<ApiRedirectResponseType> {
    const stateParams = new URLSearchParams(state);
    const accessToken = stateParams.get("accessToken");
    const origin = stateParams.get("origin");

    if (!code || typeof code !== "string") {
      throw new BadRequestException("Code must be a valid string");
    }

    if (!accessToken) {
      throw new UnauthorizedException("Access token missing.");
    }

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException("Access token invalid.");
    }

    if (!origin) {
      throw new BadRequestException("Missing request origin.");
    }

    const app = await this.appRepository.getAppBySlug("google-calendar");

    if (!app) {
      throw new NotFoundException();
    }

    const keys = app.keys as { client_id?: string; client_secret?: string };

    if (!keys.client_id) throw new BadRequestException("Missing google calendar client_id.");
    if (!keys.client_secret) throw new BadRequestException("Missing google calendar secret.");

    const redirect_uri = `${this.config.get("api.url")}/apps/gcal/oauth/save`;
    const oAuth2Client = new google.auth.OAuth2(keys.client_id, keys.client_secret, redirect_uri);
    const token = await oAuth2Client.getToken(code);
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

  @Get("/oauth/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async check(@GetUser("id") userId: number): Promise<ApiResponse> {
    const gcalCredentials = await this.credentialRepository.getByTypeAndUserId("google_calendar", userId);

    if (!gcalCredentials) {
      throw new BadRequestException();
    }

    return { status: SUCCESS_STATUS, data: undefined };
  }
}
