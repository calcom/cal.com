import { OAuthCalendarApp } from "@/ee/calendars/calendars.interface";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Logger, NotFoundException } from "@nestjs/common";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { Request } from "express";
import { google } from "googleapis";
import { z } from "zod";

import { SUCCESS_STATUS, GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

@Injectable()
export class GoogleCalendarService implements OAuthCalendarApp {
  private redirectUri = `${this.config.get("api.url")}/gcal/oauth/save`;
  private gcalResponseSchema = z.object({ client_id: z.string(), client_secret: z.string() });
  private logger = new Logger("GcalService");

  constructor(
    private readonly config: ConfigService,
    private readonly appsRepository: AppsRepository,
    private readonly credentialRepository: CredentialsRepository,
    private readonly calendarsService: CalendarsService,
    private readonly tokensRepository: TokensRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository
  ) {}

  async connect(
    authorization: string,
    req: Request,
    redir?: string
  ): Promise<{ status: typeof SUCCESS_STATUS; data: { authUrl: string } }> {
    const accessToken = authorization.replace("Bearer ", "");
    const origin = req.get("origin") ?? req.get("host");
    const redirectUrl = await await this.getCalendarRedirectUrl(accessToken, origin ?? "", redir);

    return { status: SUCCESS_STATUS, data: { authUrl: redirectUrl } };
  }

  async save(code: string, accessToken: string, origin: string, redir?: string): Promise<{ url: string }> {
    return await this.saveCalendarCredentialsAndRedirect(code, accessToken, origin, redir);
  }

  async check(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    return await this.checkIfCalendarConnected(userId);
  }

  async getCalendarRedirectUrl(accessToken: string, origin: string, redir?: string) {
    const oAuth2Client = await this.getOAuthClient(this.redirectUri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CALENDAR_SCOPES,
      prompt: "consent",
      state: `accessToken=${accessToken}&origin=${origin}&redir=${redir ?? ""}`,
    });

    return authUrl;
  }

  async getOAuthClient(redirectUri: string) {
    this.logger.log("Getting Google Calendar OAuth Client");
    const app = await this.appsRepository.getAppBySlug("google-calendar");

    if (!app) {
      throw new NotFoundException();
    }

    const { client_id, client_secret } = this.gcalResponseSchema.parse(app.keys);

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    return oAuth2Client;
  }

  async checkIfCalendarConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
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

  async saveCalendarCredentialsAndRedirect(
    code: string,
    accessToken: string,
    origin: string,
    redir?: string
  ) {
    // User chose not to authorize your app or didn't authorize your app
    // redirect directly without oauth code
    if (!code) {
      return { url: redir || origin };
    }

    const parsedCode = z.string().parse(code);

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException("Invalid Access token.");
    }

    const oAuth2Client = await this.getOAuthClient(this.redirectUri);
    const token = await oAuth2Client.getToken(parsedCode);
    // Google oAuth Credentials are stored in token.tokens
    const key = token.tokens;
    const credential = await this.credentialRepository.createAppCredential(
      GOOGLE_CALENDAR_TYPE,
      key as Prisma.InputJsonValue,
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
        GOOGLE_CALENDAR_TYPE
      );
    }

    return { url: redir || origin };
  }
}
