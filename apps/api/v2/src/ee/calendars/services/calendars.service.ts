import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { AppsRepository } from "@/modules/apps/apps.repository";
import {
  CredentialsRepository,
  CredentialsWithUserEmail,
} from "@/modules/credentials/credentials.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersRepository } from "@/modules/users/users.repository";
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { DateTime } from "luxon";
import { z } from "zod";

import { getConnectedDestinationCalendars, getBusyCalendarTimes } from "@calcom/platform-libraries-0.0.22";
import { Calendar } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class CalendarsService {
  private oAuthCalendarResponseSchema = z.object({ client_id: z.string(), client_secret: z.string() });

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly credentialsRepository: CredentialsRepository,
    private readonly appsRepository: AppsRepository,
    private readonly calendarsRepository: CalendarsRepository,
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

  async checkCalendarCredentials(credentialId: number, userId: number) {
    const credential = await this.calendarsRepository.getCalendarCredentials(credentialId, userId);
    if (!credential) {
      throw new NotFoundException("Calendar credentials not found");
    }
  }
}
