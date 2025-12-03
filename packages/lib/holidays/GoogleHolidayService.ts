import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import { GOOGLE_HOLIDAY_CALENDARS, getHolidayCacheDays } from "./constants";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEvent[];
  error?: {
    code: number;
    message: string;
  };
}

export interface CachedHoliday {
  id: string;
  countryCode: string;
  eventId: string;
  name: string;
  date: Date;
  year: number;
}

class GoogleHolidayServiceClass {
  private apiKey: string | null = null;

  private getApiKey(): string {
    if (this.apiKey) return this.apiKey;

    const key = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_CALENDAR_API_KEY environment variable is not set");
    }
    this.apiKey = key;
    return key;
  }

  async fetchHolidaysFromGoogle(countryCode: string, year: number): Promise<CachedHoliday[]> {
    const calendarConfig = GOOGLE_HOLIDAY_CALENDARS[countryCode];
    if (!calendarConfig) {
      return [];
    }

    const apiKey = this.getApiKey();
    const calendarId = encodeURIComponent(calendarConfig.calendarId);

    const timeMin = dayjs(`${year}-01-01`).startOf("day").toISOString();
    const timeMax = dayjs(`${year}-12-31`).endOf("day").toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url);
    const data: GoogleCalendarEventsResponse = await response.json();

    if (data.error) {
      console.error(`Google Calendar API error for ${countryCode}:`, data.error);
      throw new Error(`Google Calendar API error: ${data.error.message}`);
    }

    if (!data.items) {
      return [];
    }

    return data.items
      .filter((event) => {
        const desc = event.description?.toLowerCase() || "";
        return desc.includes("public holiday");
      })
      .map((event) => {
        const dateStr = event.start.date || event.start.dateTime?.split("T")[0];
        const date = dateStr ? dayjs(dateStr).toDate() : new Date();

        return {
          id: `${countryCode}_${event.id}`,
          countryCode,
          eventId: event.id,
          name: event.summary,
          date,
          year,
        };
      });
  }

  async isCacheStale(countryCode: string, year: number): Promise<boolean> {
    const cacheDays = getHolidayCacheDays();
    const staleDate = dayjs().subtract(cacheDays, "days").toDate();

    const cachedEntry = await prisma.holidayCache.findFirst({
      where: {
        countryCode,
        year,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!cachedEntry) {
      return true;
    }

    return cachedEntry.updatedAt < staleDate;
  }

  async getHolidaysForCountry(countryCode: string, year: number): Promise<CachedHoliday[]> {
    const isStale = await this.isCacheStale(countryCode, year);

    if (isStale) {
      await this.refreshCache(countryCode, year);
    }

    const cached = await prisma.holidayCache.findMany({
      where: {
        countryCode,
        year,
      },
      orderBy: {
        date: "asc",
      },
    });

    return cached.map((h) => ({
      id: h.id,
      countryCode: h.countryCode,
      eventId: h.eventId,
      name: h.name,
      date: h.date,
      year: h.year,
    }));
  }

  async refreshCache(countryCode: string, year: number): Promise<void> {
    const calendarConfig = GOOGLE_HOLIDAY_CALENDARS[countryCode];
    if (!calendarConfig) {
      return;
    }

    try {
      const holidays = await this.fetchHolidaysFromGoogle(countryCode, year);

      await prisma.$transaction(async (tx) => {
        await tx.holidayCache.deleteMany({
          where: {
            countryCode,
            year,
          },
        });

        if (holidays.length > 0) {
          await tx.holidayCache.createMany({
            data: holidays.map((h) => ({
              countryCode: h.countryCode,
              calendarId: calendarConfig.calendarId,
              eventId: h.eventId,
              name: h.name,
              date: h.date,
              year: h.year,
            })),
            skipDuplicates: true,
          });
        }
      });
    } catch (error) {
      console.error(`Failed to refresh holiday cache for ${countryCode}:`, error);
    }
  }

  async getHolidaysInRange(countryCode: string, startDate: Date, endDate: Date): Promise<CachedHoliday[]> {
    const startYear = dayjs(startDate).year();
    const endYear = dayjs(endDate).year();

    for (let year = startYear; year <= endYear; year++) {
      const isStale = await this.isCacheStale(countryCode, year);
      if (isStale) {
        await this.refreshCache(countryCode, year);
      }
    }

    const cached = await prisma.holidayCache.findMany({
      where: {
        countryCode,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return cached.map((h) => ({
      id: h.id,
      countryCode: h.countryCode,
      eventId: h.eventId,
      name: h.name,
      date: h.date,
      year: h.year,
    }));
  }
}

export const GoogleHolidayService = new GoogleHolidayServiceClass();
