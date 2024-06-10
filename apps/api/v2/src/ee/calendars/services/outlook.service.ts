import { OAuthCalendarApp } from "@/ee/calendars/calendars.interface";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import type { Calendar as OfficeCalendar } from "@microsoft/microsoft-graph-types-beta";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { stringify } from "querystring";
import { z } from "zod";

import {
  SUCCESS_STATUS,
  OFFICE_365_CALENDAR,
  OFFICE_365_CALENDAR_ID,
  OFFICE_365_CALENDAR_TYPE,
} from "@calcom/platform-constants";

@Injectable()
export class OutlookService implements OAuthCalendarApp {
  private redirectUri = `${this.config.get("api.url")}/calendars/${OFFICE_365_CALENDAR}/save`;

  constructor(
    private readonly config: ConfigService,
    private readonly calendarsService: CalendarsService,
    private readonly credentialRepository: CredentialsRepository,
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
    const { client_id } = await this.calendarsService.getAppKeys(OFFICE_365_CALENDAR_ID);

    const scopes = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "offline_access"];
    const params = {
      response_type: "code",
      scope: scopes.join(" "),
      client_id,
      prompt: "select_account",
      redirect_uri: this.redirectUri,
      state: `accessToken=${accessToken}&origin=${origin}&redir=${redir ?? ""}`,
    };

    const query = stringify(params);

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;

    return url;
  }

  async checkIfCalendarConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
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

  async getOAuthCredentials(code: string) {
    const scopes = ["offline_access", "Calendars.Read", "Calendars.ReadWrite"];
    const { client_id, client_secret } = await this.calendarsService.getAppKeys(OFFICE_365_CALENDAR_ID);

    const toUrlEncoded = (payload: Record<string, string>) =>
      Object.keys(payload)
        .map((key) => `${key}=${encodeURIComponent(payload[key])}`)
        .join("&");

    const body = toUrlEncoded({
      client_id,
      grant_type: "authorization_code",
      code,
      scope: scopes.join(" "),
      redirect_uri: this.redirectUri,
      client_secret,
    });

    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });

    const responseBody = await response.json();

    return responseBody;
  }

  async getDefaultCalendar(accessToken: string): Promise<OfficeCalendar> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const responseBody = await response.json();

    return responseBody as OfficeCalendar;
  }

  async saveCalendarCredentialsAndRedirect(
    code: string,
    accessToken: string,
    origin: string,
    redir?: string
  ) {
    // if code is not defined, user denied to authorize office 365 app, just redirect straight away
    if (!code) {
      return { url: redir || origin };
    }

    const parsedCode = z.string().parse(code);

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException("Invalid Access token.");
    }

    const office365OAuthCredentials = await this.getOAuthCredentials(parsedCode);

    const defaultCalendar = await this.getDefaultCalendar(office365OAuthCredentials.access_token);

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
      url: redir || origin,
    };
  }
}
