import type { calendar_v3 } from "@googleapis/calendar";

import type { ICalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository.interface";
import type { ICalendarEventRepository } from "@calcom/features/calendar-cache-sql/calendar-event.repository.interface";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import { AxiosLikeResponseToFetchResponse } from "../../_utils/oauth/AxiosLikeResponseToFetchResponse";
import { CalendarAuth } from "./CalendarAuth";

const log = logger.getSubLogger({ prefix: ["CalendarCacheService"] });

export interface FreeBusyArgs {
  timeMin: string;
  timeMax: string;
  items?: { id: string }[];
}

export class CalendarCacheService {
  private auth: CalendarAuth;
  private credential: CredentialForCalendarServiceWithEmail;
  private subscriptionRepo: ICalendarSubscriptionRepository;
  private eventRepo: ICalendarEventRepository;

  constructor(
    credential: CredentialForCalendarServiceWithEmail,
    subscriptionRepo: ICalendarSubscriptionRepository,
    eventRepo: ICalendarEventRepository
  ) {
    this.credential = credential;
    this.auth = new CalendarAuth(credential);
    this.subscriptionRepo = subscriptionRepo;
    this.eventRepo = eventRepo;
  }

  public async getClient(): Promise<calendar_v3.Calendar> {
    return this.auth.getClient();
  }

  async fetchAvailability(requestBody: FreeBusyArgs): Promise<calendar_v3.Schema$FreeBusyResponse> {
    log.debug("fetchAvailability", safeStringify({ requestBody }));
    const calendar = await this.getClient();
    const apiResponse = await this.auth.authManager.request(
      async () => new AxiosLikeResponseToFetchResponse(await calendar.freebusy.query({ requestBody }))
    );
    return apiResponse.json as calendar_v3.Schema$FreeBusyResponse;
  }

  async getFreeBusyResult(
    args: FreeBusyArgs,
    shouldServeCache?: boolean
  ): Promise<calendar_v3.Schema$FreeBusyResponse> {
    if (shouldServeCache === false) return await this.fetchAvailability(args);

    const calendarId = args.items?.[0]?.id;
    if (!calendarId) {
      log.debug("No calendar ID provided, fetching live data");
      return await this.fetchAvailability(args);
    }

    const subscription = await this.subscriptionRepo.findBySelectedCalendar(calendarId);
    if (!subscription) {
      log.debug("[Cache Miss] No subscription found, fetching live data", safeStringify({ calendarId }));
      return await this.fetchAvailability(args);
    }

    const start = new Date(args.timeMin);
    const end = new Date(args.timeMax);
    const cachedEvents = await this.eventRepo.getEventsForAvailability(subscription.id, start, end);

    if (cachedEvents && cachedEvents.length > 0) {
      log.debug(
        "[SQL Cache Hit] Returning cached events from SQL",
        safeStringify({ cachedEvents: cachedEvents.length, args })
      );

      const freeBusyResponse: calendar_v3.Schema$FreeBusyResponse = {
        calendars: {
          [calendarId]: {
            busy: cachedEvents.map((event) => ({
              start: event.start.toISOString(),
              end: event.end.toISOString(),
            })),
          },
        },
      };
      return freeBusyResponse;
    }

    log.debug("[SQL Cache Miss] No cached events found, fetching live data", safeStringify({ args }));
    return await this.fetchAvailability(args);
  }

  async setAvailabilityInCache(args: FreeBusyArgs, data: calendar_v3.Schema$FreeBusyResponse): Promise<void> {
    log.debug(
      "setAvailabilityInCache - SQL cache handles this through webhook events",
      safeStringify({ args })
    );
  }
}
