import { Calendar } from "@/ee/calendars/inputs/calendar-busy-times.input";
import {
  CredentialsRepository,
  CredentialsWithUserEmail,
} from "@/modules/credentials/credentials.repository";
import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { User } from "@prisma/client";
import { DateTime } from "luxon";

import { getBusyCalendarTimes } from "@calcom/platform-libraries";

@Injectable()
export class CalendarsService {
  constructor(private readonly credentialsRepository: CredentialsRepository) {}

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
}
