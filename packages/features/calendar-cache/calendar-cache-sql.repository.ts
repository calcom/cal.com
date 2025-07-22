import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import prisma from "@calcom/prisma";
import type { Calendar, SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";
import type { EventBusyDate } from "@calcom/types/Calendar";

import type { ICalendarCacheRepository, FreeBusyArgs } from "./calendar-cache.repository.interface";

export class CalendarCacheSqlRepository implements ICalendarCacheRepository {
  private credentialId: number;
  private userId: number | null;
  private teamId: number | null;
  private calendar: Calendar | null;

  constructor(
    calendar: Calendar | null,
    credentialId: number,
    userId: number | null,
    teamId?: number | null
  ) {
    this.calendar = calendar;
    this.credentialId = credentialId;
    this.userId = userId;
    this.teamId = teamId || null;
  }

  async shouldUseSqlCacheForReading(): Promise<boolean> {
    const featureRepo = new FeaturesRepository();
    if (this.teamId) {
      return await featureRepo.checkIfTeamHasFeature(this.teamId, "calendar-cache-sql-read");
    }
    return await featureRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-read");
  }

  async shouldUseSqlCacheForWriting(): Promise<boolean> {
    const featureRepo = new FeaturesRepository();
    if (this.teamId) {
      return await featureRepo.checkIfTeamHasFeature(this.teamId, "calendar-cache-sql-write");
    }
    return await featureRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-write");
  }

  async watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }) {
    if (typeof this.calendar?.watchCalendar !== "function") return;
    return await this.calendar.watchCalendar(args);
  }

  async unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }) {
    if (typeof this.calendar?.unwatchCalendar !== "function") return;
    return await this.calendar.unwatchCalendar(args);
  }

  async getCachedAvailability(args: { credentialId: number; userId: number | null; args: FreeBusyArgs }) {
    const events = await prisma.calendarEvent.findMany({
      where: {
        credentialId: args.credentialId,
        calendarId: { in: args.args.items.map((item) => item.id) },
        status: { not: "cancelled" },
        startTime: { lt: new Date(args.args.timeMax) },
        endTime: { gt: new Date(args.args.timeMin) },
      },
      select: {
        startTime: true,
        endTime: true,
        googleEventId: true,
        calendarId: true,
      },
      orderBy: { startTime: "asc" },
    });

    if (!events.length) return null;

    const calendars: Record<string, { busy: EventBusyDate[] }> = {};

    events.forEach((event) => {
      if (!calendars[event.calendarId]) {
        calendars[event.calendarId] = { busy: [] };
      }
      calendars[event.calendarId].busy.push({
        start: event.startTime,
        end: event.endTime,
        id: event.googleEventId,
        source: null,
      });
    });

    return {
      id: null,
      key: JSON.stringify(args.args),
      value: JSON.parse(JSON.stringify({ calendars })),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      credentialId: args.credentialId,
      userId: args.userId,
      nextSyncToken: await this.getLatestSyncToken(args.args.items[0]?.id),
    };
  }

  async upsertCachedAvailability(args: {
    credentialId: number;
    userId: number | null;
    args: FreeBusyArgs;
    value: any;
    nextSyncToken?: string | null;
  }) {
    const events = this.extractEventsFromValue(args.value, args.args.items);

    if (events.length > 0) {
      await this.upsertEvents(events, args.args.items[0]?.id);
    }

    if (args.nextSyncToken && args.args.items[0]?.id) {
      await this.upsertSyncToken(args.args.items[0].id, args.nextSyncToken);
    }
  }

  private async upsertEvents(
    events: Array<{
      id: string;
      status?: string;
      summary?: string;
      start?: { dateTime?: string } | string;
      end?: { dateTime?: string } | string;
      created?: string;
      updated?: string;
    }>,
    calendarId: string
  ) {
    const operations = events.map((event) =>
      prisma.calendarEvent.upsert({
        where: {
          credentialId_calendarId_googleEventId: {
            credentialId: this.credentialId,
            calendarId,
            googleEventId: event.id,
          },
        },
        update: {
          status: event.status || "confirmed",
          summary: event.summary,
          startTime: new Date(typeof event.start === "string" ? event.start : event.start?.dateTime || ""),
          endTime: new Date(typeof event.end === "string" ? event.end : event.end?.dateTime || ""),
          googleUpdatedAt: event.updated ? new Date(event.updated) : undefined,
          updatedAt: new Date(),
        },
        create: {
          credentialId: this.credentialId,
          userId: this.userId,
          calendarId,
          googleEventId: event.id,
          status: event.status || "confirmed",
          summary: event.summary,
          startTime: new Date(typeof event.start === "string" ? event.start : event.start?.dateTime || ""),
          endTime: new Date(typeof event.end === "string" ? event.end : event.end?.dateTime || ""),
          googleCreatedAt: event.created ? new Date(event.created) : undefined,
          googleUpdatedAt: event.updated ? new Date(event.updated) : undefined,
        },
      })
    );

    await prisma.$transaction(operations);
  }

  private async upsertSyncToken(calendarId: string, syncToken: string) {
    await prisma.calendarSyncToken.upsert({
      where: {
        credentialId_calendarId: {
          credentialId: this.credentialId,
          calendarId,
        },
      },
      update: {
        syncToken,
        lastSyncAt: new Date(),
      },
      create: {
        credentialId: this.credentialId,
        calendarId,
        syncToken,
      },
    });
  }

  private async getLatestSyncToken(calendarId?: string): Promise<string | null> {
    if (!calendarId) return null;

    const tokenRecord = await prisma.calendarSyncToken.findUnique({
      where: {
        credentialId_calendarId: {
          credentialId: this.credentialId,
          calendarId,
        },
      },
    });

    return tokenRecord?.syncToken || null;
  }

  private extractEventsFromValue(
    value: unknown,
    items: { id: string }[]
  ): Array<{
    id: string;
    start: { dateTime: string };
    end: { dateTime: string };
    status?: string;
  }> {
    const events: Array<{
      id: string;
      start: { dateTime: string };
      end: { dateTime: string };
      status?: string;
    }> = [];

    if (value && typeof value === "object" && "calendars" in value && value.calendars) {
      items.forEach((item) => {
        const calendars = value.calendars as Record<
          string,
          { busy?: Array<{ start: string; end: string; id?: string; source?: string }> }
        >;
        const calendarData = calendars[item.id];
        if (calendarData?.busy) {
          calendarData.busy.forEach((busyTime) => {
            if (busyTime.id) {
              events.push({
                id: busyTime.id,
                start: { dateTime: busyTime.start },
                end: { dateTime: busyTime.end },
                status: busyTime.source === "cancelled" ? "cancelled" : "confirmed",
              });
            }
          });
        }
      });
    }

    return events;
  }

  async cleanupOldEvents(olderThanDays = 90) {
    await prisma.calendarEvent.deleteMany({
      where: {
        credentialId: this.credentialId,
        endTime: { lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) },
      },
    });
  }

  async getCacheStatusByCredentialIds(
    credentialIds: number[]
  ): Promise<{ credentialId: number; updatedAt: Date | null }[]> {
    const results = await prisma.calendarEvent.groupBy({
      by: ["credentialId"],
      where: {
        credentialId: { in: credentialIds },
      },
      _max: {
        updatedAt: true,
      },
    });

    return results.map((result) => ({
      credentialId: result.credentialId,
      updatedAt: result._max.updatedAt,
    }));
  }
}
