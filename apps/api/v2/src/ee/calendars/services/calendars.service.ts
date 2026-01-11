import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import {
  CredentialsRepository,
  CredentialsWithUserEmail,
} from "@/modules/credentials/credentials.repository";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { DateTime } from "luxon";
import { z } from "zod";

import { APPS_TYPE_ID_MAPPING } from "@calcom/platform-constants";
import {
  getBusyCalendarTimes,
  getConnectedDestinationCalendarsAndEnsureDefaultsInDb,
  type EventBusyDate,
} from "@calcom/platform-libraries";
import type { Calendar } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User } from "@calcom/prisma/client";

@Injectable()
export class CalendarsService {
  private oAuthCalendarResponseSchema = z.object({ client_id: z.string(), client_secret: z.string() });

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly credentialsRepository: CredentialsRepository,
    private readonly appsRepository: AppsRepository,
    private readonly calendarsRepository: CalendarsRepository,
    private readonly dbWrite: PrismaWriteService,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly calendarsCacheService: CalendarsCacheService
  ) {}

  private buildNonDelegationCredentials<TCredential>(credentials: TCredential[]) {
    return credentials
      .map((credential) => ({
        ...credential,
        delegatedTo: null,
        delegatedToId: null,
        delegationCredentialId: null,
      }))
      .filter((credential) => !!credential);
  }

  async getCalendars(userId: number) {
    const cachedResult = await this.calendarsCacheService.getConnectedAndDestinationCalendarsCache(userId);

    if (cachedResult) {
      return cachedResult;
    }

    const userWithCalendars = await this.usersRepository.findByIdWithCalendars(userId);
    if (!userWithCalendars) {
      throw new NotFoundException("User not found");
    }
    const result = await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
      user: {
        ...userWithCalendars,
        allSelectedCalendars: userWithCalendars.selectedCalendars,
        userLevelSelectedCalendars: userWithCalendars.selectedCalendars.filter(
          (calendar) => !calendar.eventTypeId
        ),
      },
      onboarding: false,
      eventTypeId: null,
      prisma: this.dbWrite.prisma as unknown as PrismaClient,
    });
    console.log("saving cache", JSON.stringify(result));
    await this.calendarsCacheService.setConnectedAndDestinationCalendarsCache(userId, result);

    return result;
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
    const calendarBusyTimesQuery = await getBusyCalendarTimes(
      this.buildNonDelegationCredentials(credentials),
      dateFrom,
      dateTo,
      composedSelectedCalendars
    );
    if (!calendarBusyTimesQuery.success) {
      throw new InternalServerErrorException(
        "Unable to fetch connected calendars events. Please try again later."
      );
    }
    const calendarBusyTimesConverted = calendarBusyTimesQuery.data.map(
      (busyTime: EventBusyDate & { timeZone?: string }) => {
        const busyTimeStart = DateTime.fromJSDate(new Date(busyTime.start)).setZone(timezone);
        const busyTimeEnd = DateTime.fromJSDate(new Date(busyTime.end)).setZone(timezone);
        const busyTimeStartDate = busyTimeStart.toJSDate();
        const busyTimeEndDate = busyTimeEnd.toJSDate();
        return {
          ...busyTime,
          start: busyTimeStartDate,
          end: busyTimeEndDate,
        };
      }
    );
    return calendarBusyTimesConverted;
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

  async createAndLinkCalendarEntry(
    userId: number,
    externalId: string,
    key: Prisma.InputJsonValue,
    calendarType: keyof typeof APPS_TYPE_ID_MAPPING,
    credentialId?: number | null
  ) {
    const credential = await this.credentialsRepository.upsertUserAppCredential(
      calendarType,
      key,
      userId,
      credentialId
    );

    await this.selectedCalendarsRepository.upsertSelectedCalendar(
      externalId,
      credential.id,
      userId,
      calendarType
    );

    await this.calendarsCacheService.deleteConnectedAndDestinationCalendarsCache(userId);
  }

  async checkCalendarCredentialValidity(userId: number, credentialId: number, type: string) {
    const credential = await this.credentialsRepository.getUserCredentialById(userId, credentialId, type);

    return !credential?.invalid;
  }
}
