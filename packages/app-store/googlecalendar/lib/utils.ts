import type { calendar_v3 } from "googleapis";

import logger from "@calcom/lib/logger";

export async function getAllCalendars(
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

      logger.error("Google Calendar pagination failed in the middle", {
        totalSoFar: allCalendars.length,
        hasMorePages: !!pageToken,
      });
    } while (pageToken);

    return allCalendars;
  } catch (error) {
    logger.error("Error fetching all Google Calendars", { error });
    throw error;
  }
}
