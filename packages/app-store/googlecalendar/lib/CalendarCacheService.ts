import type { calendar_v3 } from "@googleapis/calendar";

import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import { AxiosLikeResponseToFetchResponse } from "../../_utils/oauth/AxiosLikeResponseToFetchResponse";
import { CalendarAuth } from "./CalendarAuth";

const log = logger.getSubLogger({ prefix: ["CalendarCacheService"] });

export class CalendarCacheService {
  private auth: CalendarAuth;
  private credential: CredentialForCalendarServiceWithEmail;

  constructor(credential: CredentialForCalendarServiceWithEmail) {
    this.credential = credential;
    this.auth = new CalendarAuth(credential);
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

    const { CalendarCache } = await import("@calcom/features/calendar-cache/calendar-cache");
    const calendarCache = await CalendarCache.init(null);
    const cached = await calendarCache.getCachedAvailability({
      credentialId: this.credential.id,
      userId: this.credential.userId,
      args: {
        timeMin: getTimeMin(args.timeMin),
        timeMax: getTimeMax(args.timeMax),
        items: args.items,
      },
    });

    if (cached) {
      log.debug("[Cache Hit] Returning cached freebusy result", safeStringify({ cached, args }));
      return cached as calendar_v3.Schema$FreeBusyResponse;
    }

    log.debug("[Cache Miss] Fetching availability from Google Calendar", safeStringify({ args }));
    const result = await this.fetchAvailability(args);
    await this.setAvailabilityInCache(args, result);
    return result;
  }

  async setAvailabilityInCache(args: FreeBusyArgs, data: calendar_v3.Schema$FreeBusyResponse): Promise<void> {
    log.debug("setAvailabilityInCache", safeStringify({ args, data }));
    const { CalendarCache } = await import("@calcom/features/calendar-cache/calendar-cache");
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: this.credential.id,
      userId: this.credential.userId,
      args,
      value: JSON.parse(JSON.stringify(data)),
    });
  }
}
