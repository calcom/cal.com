import { OAuthCalendarApp } from "@/ee/calendars/calendars.interface";
import type { CalendarState } from "@/ee/calendars/controllers/calendars.controller";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { calendar_v3 } from "@googleapis/calendar";
import { Logger, NotFoundException } from "@nestjs/common";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { OAuth2Client } from "googleapis-common";
import { z } from "zod";

import { SUCCESS_STATUS, GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
import { Prisma } from "@calcom/prisma/client";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

@Injectable()
export class GoogleCalendarService implements OAuthCalendarApp {
  public readonly redirectUri = `${this.config.get("api.url")}/gcal/oauth/save`;
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
    redir?: string,
    isDryRun?: boolean
  ): Promise<{ status: typeof SUCCESS_STATUS; data: { authUrl: string } }> {
    const accessToken = authorization.replace("Bearer ", "");
    const origin = req.get("origin") ?? req.get("host");
    const redirectUrl = await this.getCalendarRedirectUrl(accessToken, origin ?? "", redir, isDryRun);

    return { status: SUCCESS_STATUS, data: { authUrl: redirectUrl } };
  }

  async save(
    code: string,
    accessToken: string,
    origin: string,
    redir?: string,
    isDryRun?: boolean
  ): Promise<{ url: string }> {
    return await this.saveCalendarCredentialsAndRedirect(code, accessToken, origin, redir, isDryRun);
  }

  async check(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    return await this.checkIfCalendarConnected(userId);
  }

  async getCalendarRedirectUrl(accessToken: string, origin: string, redir?: string, isDryRun?: boolean) {
    const oAuth2Client = await this.getOAuthClient(this.redirectUri);
    const state: CalendarState = {
      accessToken,
      origin,
      redir,
      isDryRun,
    };

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CALENDAR_SCOPES,
      prompt: "consent",
      state: JSON.stringify(state),
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

    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirectUri);
    return oAuth2Client;
  }

  async checkIfCalendarConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
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

  async saveCalendarCredentialsAndRedirect(
    code: string,
    accessToken: string,
    origin: string,
    redir?: string,
    isDryRun?: boolean
  ) {
    // User chose not to authorize your app or didn't authorize your app
    // redirect directly without oauth code
    if (!code || code === "undefined") {
      return { url: redir || origin };
    }

    // if isDryRun is true we know its a dry run so we just redirect straight away
    if (isDryRun) {
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

    oAuth2Client.setCredentials(key);

    const calendar = new calendar_v3.Calendar({
      auth: oAuth2Client,
    });

    const cals = await calendar.calendarList.list({ fields: "items(id,summary,primary,accessRole)" });

    const primaryCal = cals.data.items?.find((cal) => cal.primary);

    if (primaryCal?.id) {
      const alreadyExistingSelectedCalendar = await this.selectedCalendarsRepository.getUserSelectedCalendar(
        ownerId,
        GOOGLE_CALENDAR_TYPE,
        primaryCal.id
      );

      if (alreadyExistingSelectedCalendar) {
        const isCredentialValid = await this.calendarsService.checkCalendarCredentialValidity(
          ownerId,
          alreadyExistingSelectedCalendar.credentialId ?? 0,
          GOOGLE_CALENDAR_TYPE
        );

        // user credential probably got expired in this case
        if (!isCredentialValid) {
          await this.calendarsService.createAndLinkCalendarEntry(
            ownerId,
            alreadyExistingSelectedCalendar.externalId,
            key as Prisma.InputJsonValue,
            GOOGLE_CALENDAR_TYPE,
            alreadyExistingSelectedCalendar.credentialId
          );
        }

        return {
          url: redir || origin,
        };
      }

      await this.calendarsService.createAndLinkCalendarEntry(
        ownerId,
        primaryCal.id,
        key as Prisma.InputJsonValue,
        GOOGLE_CALENDAR_TYPE
      );
    }

    return { url: redir || origin };
  }
}
