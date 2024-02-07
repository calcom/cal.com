import { Calendar } from "@/ee/overlay-calendars/inputs/get-overlay-calendars-busy-times.input";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { User } from "@prisma/client";
import { DateTime } from "luxon";

import { getBusyCalendarTimes } from "@calcom/platform-libraries";
import { ValueType } from "@calcom/platform-types";

@Injectable()
export class OverlayCalendarsService {
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
    credentials: ValueType<ReturnType<typeof this.credentialsRepository.getUserCredentialsByIds>>,
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
    credentials: ValueType<ReturnType<typeof this.credentialsRepository.getUserCredentialsByIds>>,
    composedSelectedCalendars: ValueType<ReturnType<typeof this.getCalendarsWithCredentials>>,
    dateFrom: string,
    dateTo: string,
    timezone: string
  ) {
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
