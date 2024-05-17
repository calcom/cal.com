import { AppsRepository } from "@/modules/apps/apps.repository";
import {
  CredentialsRepository,
  CredentialsWithUserEmail,
} from "@/modules/credentials/credentials.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersRepository } from "@/modules/users/users.repository";
import type { Calendar as OfficeCalendar } from "@microsoft/microsoft-graph-types-beta";
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { DateTime } from "luxon";
import { stringify } from "querystring";
import { z } from "zod";

import { getConnectedDestinationCalendars } from "@calcom/platform-libraries";
import { getBusyCalendarTimes } from "@calcom/platform-libraries";
import { Calendar } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class CalendarsService {
  private oAuthCalendarResponseSchema = z.object({ client_id: z.string(), client_secret: z.string() });
  private redirectUri = `${this.config.get("api.url")}/calendars/office365/save`;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly credentialsRepository: CredentialsRepository,
    private readonly appsRepository: AppsRepository,
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly config: ConfigService
  ) {}

  async getCalendars(userId: number) {
    const userWithCalendars = await this.usersRepository.findByIdWithCalendars(userId);
    if (!userWithCalendars) {
      throw new NotFoundException("User not found");
    }

    return getConnectedDestinationCalendars(
      userWithCalendars,
      false,
      this.dbWrite.prisma as unknown as PrismaClient
    );
  }

  async getBusyTimes(
    calendarsToLoad: Calendar[],
    userId: User["id"],
    dateFrom: string,
    dateTo: string,
    timezone: string
  ) {
    const credentials = await this.getUniqCalendarCredentials(calendarsToLoad, userId);
    const composedSelectedCalendars = await this.getCalendarsWithCredentials(
      credentials,
      calendarsToLoad,
      userId
    );
    try {
      const calendarBusyTimes = await getBusyCalendarTimes(
        "",
        credentials,
        dateFrom,
        dateTo,
        composedSelectedCalendars
      );
      const calendarBusyTimesConverted = calendarBusyTimes.map((busyTime) => {
        const busyTimeStart = DateTime.fromJSDate(new Date(busyTime.start)).setZone(timezone);
        const busyTimeEnd = DateTime.fromJSDate(new Date(busyTime.end)).setZone(timezone);
        const busyTimeStartDate = busyTimeStart.toJSDate();
        const busyTimeEndDate = busyTimeEnd.toJSDate();
        return {
          ...busyTime,
          start: busyTimeStartDate,
          end: busyTimeEndDate,
        };
      });
      return calendarBusyTimesConverted;
    } catch (error) {
      throw new InternalServerErrorException(
        "Unable to fetch connected calendars events. Please try again later."
      );
    }
  }

  async getUniqCalendarCredentials(calendarsToLoad: Calendar[], userId: User["id"]) {
    const uniqueCredentialIds = Array.from(new Set(calendarsToLoad.map((item) => item.credentialId)));
    const credentials = await this.credentialsRepository.getUserCredentialsByIds(userId, uniqueCredentialIds);

    if (credentials.length !== uniqueCredentialIds.length) {
      throw new UnauthorizedException("These credentials do not belong to you");
    }

    return credentials;
  }

  async getCalendarsWithCredentials(
    credentials: CredentialsWithUserEmail,
    calendarsToLoad: Calendar[],
    userId: User["id"]
  ) {
    const composedSelectedCalendars = calendarsToLoad.map((calendar) => {
      const credential = credentials.find((item) => item.id === calendar.credentialId);
      if (!credential) {
        throw new UnauthorizedException("These credentials do not belong to you");
      }
      return {
        ...calendar,
        userId,
        integration: credential.type,
      };
    });
    return composedSelectedCalendars;
  }

  async getAppKeys(appName: string) {
    const app = await this.appsRepository.getAppBySlug(appName);

    if (!app) {
      throw new NotFoundException();
    }

    const { client_id, client_secret } = this.oAuthCalendarResponseSchema.parse(app.keys);

    if (!client_id) {
      throw new NotFoundException();
    }

    if (!client_secret) {
      throw new NotFoundException();
    }

    return { client_id, client_secret };
  }

  async getOffice365CalendarRedirectUrl(accessToken: string, origin: string) {
    const { client_id } = await this.getAppKeys("office365-calendar");

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

  async getOffice365OAuthCredentials(code: string) {
    const scopes = ["offline_access", "Calendars.Read", "Calendars.ReadWrite"];
    const { client_id, client_secret } = await this.getAppKeys("office365-calendar");

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

  async getOffice365DefaultCalendar(accessToken: string): Promise<OfficeCalendar> {
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
