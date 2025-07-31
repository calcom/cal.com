import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { EventBusyDate, SelectedCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { ICalendarCacheReadService } from "./CalendarCacheReadService.interface";
import { CalendarCacheSqlService } from "./CalendarCacheSqlService";
import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";
import type { ISelectedCalendarRepository } from "./SelectedCalendarRepository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheReadService"] });

export interface CalendarCacheReadServiceDependencies {
  subscriptionRepo: ICalendarSubscriptionRepository;
  eventRepo: ICalendarEventRepository;
  selectedCalendarRepo: ISelectedCalendarRepository;
  getCalendarsEvents: (
    credentials: CredentialForCalendarService[],
    startDate: string,
    endDate: string,
    selectedCalendars: SelectedCalendar[],
    shouldServeCache?: boolean
  ) => Promise<EventBusyDate[][]>;
}

export class CalendarCacheReadService implements ICalendarCacheReadService {
  constructor(private dependencies: CalendarCacheReadServiceDependencies) {}

  async getBusyCalendarTimes(
    credentials: CredentialForCalendarService[],
    startDate: string,
    endDate: string,
    selectedCalendars: SelectedCalendar[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[][]> {
    const { subscriptionRepo, eventRepo, selectedCalendarRepo, getCalendarsEvents } = this.dependencies;

    try {
      const calendarCacheService = new CalendarCacheSqlService(subscriptionRepo, eventRepo);

      const fullSelectedCalendars = await selectedCalendarRepo.findManyBySelectedCalendars(selectedCalendars);

      const credentialsWithSubscription: CredentialForCalendarService[] = [];
      const credentialsWithoutSubscription: CredentialForCalendarService[] = [];

      for (const credential of credentials) {
        const credentialSelectedCalendars = fullSelectedCalendars.filter(
          (sc) => sc.credentialId !== null && sc.credentialId === credential.id
        );

        let hasAnySubscription = false;

        for (const fullSelectedCalendar of credentialSelectedCalendars) {
          try {
            const subscription = await subscriptionRepo.findBySelectedCalendar(fullSelectedCalendar.id);
            if (subscription) {
              hasAnySubscription = true;
              break;
            }
          } catch (error) {
            log.warn(
              `Failed to check CalendarSubscription for selectedCalendar ${fullSelectedCalendar.id}:`,
              error
            );
          }
        }

        if (hasAnySubscription) {
          credentialsWithSubscription.push(credential);
        } else {
          credentialsWithoutSubscription.push(credential);
        }
      }

      const sqlCacheResults: EventBusyDate[][] = [];
      for (const credential of credentialsWithSubscription) {
        const credentialSelectedCalendars = fullSelectedCalendars.filter(
          (sc) => sc.credentialId !== null && sc.credentialId === credential.id
        );

        const credentialResults: EventBusyDate[] = [];

        for (const fullSelectedCalendar of credentialSelectedCalendars) {
          try {
            const subscription = await subscriptionRepo.findBySelectedCalendar(fullSelectedCalendar.id);
            if (subscription) {
              const events = await calendarCacheService.getAvailability(
                fullSelectedCalendar.id,
                new Date(startDate),
                new Date(endDate)
              );
              credentialResults.push(
                ...events.map((event) => ({
                  start: event.start,
                  end: event.end,
                  source: event.source,
                }))
              );
            }
          } catch (error) {
            log.warn(`Failed to get SQL cache for selectedCalendar ${fullSelectedCalendar.id}:`, error);
          }
        }

        sqlCacheResults.push(credentialResults);
      }

      let googleCalendarResults: EventBusyDate[][] = [];
      if (credentialsWithoutSubscription.length > 0) {
        googleCalendarResults = await getCalendarsEvents(
          credentialsWithoutSubscription,
          startDate,
          endDate,
          selectedCalendars.filter(
            (sc) =>
              sc.credentialId !== null &&
              credentialsWithoutSubscription.some((cred) => cred.id === sc.credentialId)
          ),
          shouldServeCache
        );
      }

      return [...sqlCacheResults, ...googleCalendarResults];
    } catch (error) {
      log.warn("CalendarCacheReadService error:", safeStringify(error));
      return await getCalendarsEvents(credentials, startDate, endDate, selectedCalendars, shouldServeCache);
    }
  }
}
