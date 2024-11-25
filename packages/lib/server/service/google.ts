import type { calendar_v3 } from "@googleapis/calendar";
import { oauth2_v2 } from "@googleapis/oauth2";
import type { Prisma } from "@prisma/client";
import type { Credentials } from "google-auth-library";
import type { OAuth2Client } from "google-auth-library";

import logger from "@calcom/lib/logger";

import { CredentialRepository } from "../repository/credential";
import { SelectedCalendarRepository } from "../repository/selectedCalendar";
import { UserRepository } from "../repository/user";

export class GoogleService {
  static async createGoogleCalendarCredential({ userId, key }: { userId: number; key: Credentials }) {
    return await CredentialRepository.create({
      type: "google_calendar",
      key,
      userId,
      appId: "google-calendar",
    });
  }

  static async createGoogleMeetsCredential({ userId }: { userId: number }) {
    return await CredentialRepository.create({
      type: "google_video",
      key: {},
      userId,
      appId: "google-meet",
    });
  }

  static async createSelectedCalendar(
    data: Omit<Prisma.SelectedCalendarUncheckedCreateInput, "integration">
  ) {
    return await SelectedCalendarRepository.create({
      ...data,
      integration: "google_calendar",
    });
  }

  static async upsertSelectedCalendar(
    data: Omit<Prisma.SelectedCalendarUncheckedCreateInput, "integration">
  ) {
    return await SelectedCalendarRepository.upsert({
      ...data,
      integration: "google_calendar",
    });
  }

  static async findGoogleMeetCredential({ userId }: { userId: number }) {
    return await CredentialRepository.findFirstByUserIdAndType({
      userId,
      type: "google_video",
    });
  }

  static async findFirstGoogleCalendarCredential({ userId }: { userId: number }) {
    return await CredentialRepository.findFirstByAppIdAndUserId({
      appId: "google-calendar",
      userId,
    });
  }

  static async getAllCalendars(
    calendar: calendar_v3.Calendar,
    fields: string[] = ["id", "summary", "primary", "accessRole"]
  ): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    let allCalendars: calendar_v3.Schema$CalendarListEntry[] = [];
    let pageToken: string | undefined;

    try {
      do {
        const response: any = await calendar.calendarList.list({
          fields: `items(${fields.join(",")}),nextPageToken`,
          pageToken,
          maxResults: 250, // 250 is max
        });

        allCalendars = [...allCalendars, ...(response.data.items ?? [])];
        pageToken = response.data.nextPageToken;
      } while (pageToken);

      return allCalendars;
    } catch (error) {
      logger.error("Error fetching all Google Calendars", { error });
      throw error;
    }
  }

  static async getPrimaryCalendar(
    calendar: calendar_v3.Calendar,
    fields: string[] = ["id", "summary", "primary", "accessRole"]
  ): Promise<calendar_v3.Schema$CalendarListEntry | null> {
    let pageToken: string | undefined;
    let firstCalendar: calendar_v3.Schema$CalendarListEntry | undefined;

    try {
      do {
        const response: any = await calendar.calendarList.list({
          fields: `items(${fields.join(",")}),nextPageToken`,
          pageToken,
          maxResults: 250, // 250 is max
        });

        const cals = response.data.items ?? [];
        const primaryCal = cals.find((cal: calendar_v3.Schema$CalendarListEntry) => cal.primary);
        if (primaryCal) {
          return primaryCal;
        }

        // Store the first calendar in case no primary is found
        if (cals.length > 0 && !firstCalendar) {
          firstCalendar = cals[0];
        }

        pageToken = response.data.nextPageToken;
      } while (pageToken);

      // should not be reached because Google Cal always has a primary cal
      return firstCalendar ?? null;
    } catch (error) {
      logger.error("Error in `getPrimaryCalendar`", { error });
      throw error;
    }
  }

  static async updateProfilePhoto(oAuth2Client: OAuth2Client, userId: number) {
    try {
      const oauth2 = new oauth2_v2.Oauth2({ auth: oAuth2Client });
      const userDetails = await oauth2.userinfo.get();
      if (userDetails.data?.picture) {
        await UserRepository.updateAvatar({ id: userId, avatarUrl: userDetails.data.picture });
      }
    } catch (error) {
      logger.error("Error updating avatarUrl from google calendar connect", error);
    }
  }
}
