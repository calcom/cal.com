import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import type { Calendar as OfficeCalendar } from "@microsoft/microsoft-graph-types-beta";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { stringify } from "querystring";

import { OFFICE_365_CALENDAR_ID } from "@calcom/platform-constants";

@Injectable()
export class MicrosoftOutlookService {
  private redirectUri = `${this.config.get("api.url")}/calendars/office365/save`;

  constructor(private readonly config: ConfigService, private readonly calendarsService: CalendarsService) {}

  async getCalendarRedirectUrl(accessToken: string, origin: string) {
    const { client_id } = await this.calendarsService.getAppKeys(OFFICE_365_CALENDAR_ID);

    const scopes = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "offline_access"];
    const params = {
      response_type: "code",
      scope: scopes.join(" "),
      client_id,
      prompt: "select_account",
      redirect_uri: this.redirectUri,
      state: `accessToken=${accessToken}&origin=${origin}`,
    };

    const query = stringify(params);

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;

    return url;
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
}
