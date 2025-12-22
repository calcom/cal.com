import logger from "@calcom/lib/logger";
import {
  Calendar,
  CalendarEvent,
  CalendarServiceEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendarEventTypeIds,
} from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["CalendarBatchWrapper"] });

type DelegatedGroups = Record<string, IntegrationCalendar[]>;

/**
 * CalendarBatchWrapper wraps original calendar to process availability in
 * batches instead of individual calls.
 */
export class CalendarBatchWrapper implements Calendar {
  static CALENDAR_BATCH_MAX_SIZE = 50;

  constructor(
    private deps: {
      originalCalendar: Calendar;
    }
  ) {}

  /**
   * Splits selected calendars into two independent credential flows.
   *
   * - ownCredentials:
   *   Calendars without delegationCredentialId.
   *   Each one may represent a different underlying token,
   *   so they must be processed one-by-one.
   *
   * - delegatedCredentials:
   *   Calendars grouped by delegationCredentialId.
   *   Calendars in the same group share the same delegated credential
   *   and can be safely batched.
   */
  private splitCalendars(selectedCalendars: IntegrationCalendar[]) {
    const ownCredentials: IntegrationCalendar[] = [];
    const delegatedCredentials: DelegatedGroups = {};

    for (const selectedCalendar of selectedCalendars) {
      const delegationCredentialId = selectedCalendar.delegationCredentialId;

      if (!delegationCredentialId) {
        ownCredentials.push(selectedCalendar);
        continue;
      }

      if (!delegatedCredentials[delegationCredentialId]) {
        delegatedCredentials[delegationCredentialId] = [];
      }

      delegatedCredentials[delegationCredentialId].push(selectedCalendar);
    }

    return { ownCredentials, delegatedCredentials };
  }

  /**
   * Partitions items into fixed-size batches.
   * Google Calendar freebusy enforces a hard limit of CalendarBatchWrapper.CALENDAR_BATCH_MAX_SIZE
   */
  private partition<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }

  getCredentialId?(): number {
    return this.deps.originalCalendar.getCredentialId?.() ?? -1;
  }

  createEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    return this.deps.originalCalendar.createEvent(event, credentialId, externalCalendarId);
  }

  updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    return this.deps.originalCalendar.updateEvent(uid, event, externalCalendarId);
  }

  deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    return this.deps.originalCalendar.deleteEvent(uid, event, externalCalendarId);
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean,
    fallbackToPrimary?: boolean
  ): Promise<EventBusyDate[]> {
    const { ownCredentials, delegatedCredentials } = this.splitCalendars(selectedCalendars);

    log.info("Loading free/busy from Google Calendar", {
      ownCredentials: ownCredentials.length,
      delegatedCredentials: Object.values(delegatedCredentials).reduce(
        (sum, calendars) => sum + calendars.length,
        0
      ),
    });

    const tasks: Promise<EventBusyDate[]>[] = [];

    /**
     * Own credentials are processed one-by-one because we cannot
     * safely assume they share the same underlying token.
     */
    for (let i = 0; i < ownCredentials.length; i++) {
      const selectedCalendar = ownCredentials[i];
      tasks.push(
        this.deps.originalCalendar.getAvailability(
          dateFrom,
          dateTo,
          [selectedCalendar],
          shouldServeCache,
          fallbackToPrimary
        )
      );
    }

    /**
     * Delegated credentials are grouped by delegationCredentialId.
     * Each group can be batched up to the Google API limit.
     */
    const delegationIds = Object.keys(delegatedCredentials);
    for (let i = 0; i < delegationIds.length; i++) {
      const delegationCredentialId = delegationIds[i];
      const delegationCredentialCalendars = delegatedCredentials[delegationCredentialId];
      const partition = this.partition(
        delegationCredentialCalendars,
        CalendarBatchWrapper.CALENDAR_BATCH_MAX_SIZE
      );

      for (let j = 0; j < partition.length; j++) {
        tasks.push(
          this.deps.originalCalendar.getAvailability(
            dateFrom,
            dateTo,
            partition[j],
            shouldServeCache,
            fallbackToPrimary
          )
        );
      }
    }

    /**
     * When no calendars are provided, perform a single call
     * so fallbackToPrimary can be honored.
     */
    if (tasks.length === 0) {
      tasks.push(
        this.deps.originalCalendar.getAvailability(dateFrom, dateTo, [], shouldServeCache, fallbackToPrimary)
      );
    }

    const results = await Promise.allSettled(tasks);

    // Log any failed batches but continue with successful ones
    const failedResults = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (failedResults.length > 0) {
      log.warn("Some calendar availability batches failed", {
        failedCount: failedResults.length,
        totalCount: results.length,
        errors: failedResults.map((r) => r.reason),
      });
    }

    // Return only successful results
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<EventBusyDate[]> => result.status === "fulfilled")
      .map((result) => result.value);

    return successfulResults.flat();
  }

  async getAvailabilityWithTimeZones(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    fallbackToPrimary?: boolean
  ): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]> {
    const { ownCredentials, delegatedCredentials } = this.splitCalendars(selectedCalendars);
    const tasks: Promise<{ start: Date | string; end: Date | string; timeZone: string }[]>[] = [];

    const calendar = this.deps.originalCalendar;

    /**
     * Timezone-aware availability is optional.
     * If not implemented by the underlying calendar, fail fast.
     */
    if (!calendar.getAvailabilityWithTimeZones) {
      log.warn("getAvailabilityWithTimeZones is not implemented on underlying calendar");
      return [];
    }

    /**
     * Own credentials are processed one-by-one for the same reason
     * as in getAvailability.
     */
    for (let i = 0; i < ownCredentials.length; i++) {
      const selectedCalendar = ownCredentials[i];
      tasks.push(
        calendar.getAvailabilityWithTimeZones(dateFrom, dateTo, [selectedCalendar], fallbackToPrimary)
      );
    }

    /**
     * Delegated credentials are processed in isolated batches.
     */
    const delegationIds = Object.keys(delegatedCredentials);
    for (let i = 0; i < delegationIds.length; i++) {
      const delegationCredentialId = delegationIds[i];
      const delegationCredentialCalendars = delegatedCredentials[delegationCredentialId];
      const partition = this.partition(
        delegationCredentialCalendars,
        CalendarBatchWrapper.CALENDAR_BATCH_MAX_SIZE
      );

      for (let j = 0; j < partition.length; j++) {
        tasks.push(calendar.getAvailabilityWithTimeZones(dateFrom, dateTo, partition[j], fallbackToPrimary));
      }
    }

    /**
     * Ensures fallbackToPrimary is honored even when
     * no calendars were explicitly selected.
     */
    if (tasks.length === 0) {
      tasks.push(calendar.getAvailabilityWithTimeZones(dateFrom, dateTo, [], fallbackToPrimary));
    }

    const results = await Promise.allSettled(tasks);

    // Log any failed batches but continue with successful ones
    const failedResults = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (failedResults.length > 0) {
      log.warn("Some calendar availability with timezones batches failed", {
        failedCount: failedResults.length,
        totalCount: results.length,
        errors: failedResults.map((r) => r.reason),
      });
    }

    // Return only successful results
    type AvailabilityWithTimeZone = { start: Date | string; end: Date | string; timeZone: string };
    const successfulResults = results
      .filter(
        (result): result is PromiseFulfilledResult<AvailabilityWithTimeZone[]> => result.status === "fulfilled"
      )
      .map((result) => result.value);

    return successfulResults.flat();
  }

  fetchAvailabilityAndSetCache?(selectedCalendars: IntegrationCalendar[]): Promise<unknown> {
    return this.deps.originalCalendar.fetchAvailabilityAndSetCache?.(selectedCalendars) || Promise.resolve();
  }

  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return this.deps.originalCalendar.listCalendars(event);
  }

  testDelegationCredentialSetup?(): Promise<boolean> {
    return this.deps.originalCalendar.testDelegationCredentialSetup?.() || Promise.resolve(false);
  }

  watchCalendar?(options: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }): Promise<unknown> {
    return this.deps.originalCalendar.watchCalendar?.(options) || Promise.resolve();
  }

  unwatchCalendar?(options: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }): Promise<void> {
    return this.deps.originalCalendar.unwatchCalendar?.(options) || Promise.resolve();
  }
}
