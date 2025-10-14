import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import dayjs from "@calcom/dayjs";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import { getUserSession } from "@calcom/trpc/server/middlewares/sessionMiddleware";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  const schedule = await availableSlotsService.getAvailableSlots({ ctx, input });

  // Optionally enrich with busy details
  if (input.includeBusyDetails && input.overlayCalendars && input.overlayCalendars.length > 0) {
    // Get user from session if not already in context (publicProcedure doesn't populate user)
    const { user } = await getUserSession(ctx as unknown as { req: unknown; res: unknown });

    if (user) {
      try {
        // Inline fetch of calendar overlay events (Google only) to avoid external import
        const loggedInUsersTz = input.timeZone || dayjs.tz.guess();
        const dateFrom = input.startTime;
        const dateTo = input.endTime;
        const calendarsToLoad = input.overlayCalendars;

        if (!dateFrom || !dateTo) return schedule as typeof schedule & { busyDetails?: unknown };

        const uniqueCredentialIds = Array.from(
          new Set(calendarsToLoad.map((c: { credentialId: number }) => c.credentialId))
        );

        const nonDelegationCredentials = await prisma.credential.findMany({
          where: { id: { in: uniqueCredentialIds }, userId: user.id },
          select: { id: true, type: true, key: true, invalid: true },
        });

        const googleCreds = (nonDelegationCredentials || []).filter(
          (c) => c.type === "google_calendar" && !c.invalid
        );
        const googleCalendarIds = new Map<number, string[]>();
        for (const cal of calendarsToLoad) {
          googleCalendarIds.set(cal.credentialId, [
            ...(googleCalendarIds.get(cal.credentialId) || []),
            cal.externalId,
          ]);
        }

        const startIso = dayjs(dateFrom).toISOString();
        const endIso = dayjs(dateTo).toISOString();

        const results: { start: Date; end: Date; title: string; source: string; userId: number }[] = [];
        for (const cred of googleCreds) {
          const service = new GoogleCalendarService(cred as unknown as CredentialForCalendarServiceWithEmail);
          const gcal = await service.authedCalendar();
          const ids = googleCalendarIds.get(cred.id) || ["primary"];

          for (const calendarId of ids) {
            const resp = await gcal.events.list({
              calendarId,
              timeMin: startIso,
              timeMax: endIso,
              singleEvents: true,
              orderBy: "startTime",
              maxResults: 2500,
            });
            const items = resp.data.items || [];
            for (const evt of items) {
              const start = evt.start?.dateTime || evt.start?.date;
              const end = evt.end?.dateTime || evt.end?.date;
              if (!start || !end) continue;
              const startLocal = dayjs(start).tz(loggedInUsersTz).toDate();
              const endLocal = dayjs(end).tz(loggedInUsersTz).toDate();
              results.push({
                start: startLocal,
                end: endLocal,
                title: evt.summary || "Busy",
                source: "google_calendar",
                userId: user.id,
              });
            }
          }
        }
        const busyDetails = results;
        // attach to response in a backward-compatible way
        return { ...schedule, busyDetails } as typeof schedule & { busyDetails: typeof busyDetails };
      } catch {
        // Do not fail schedule if busy details fetch fails
        return { ...schedule, busyDetails: [] } as typeof schedule & { busyDetails: [] };
      }
    }
  }

  return schedule;
};
