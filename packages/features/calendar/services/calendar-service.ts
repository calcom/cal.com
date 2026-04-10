import type { CalendarAdapter } from "@calcom/calendar-adapter/calendar-adapter";
import type {
  BusyTimeslot,
  CalendarCredential,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  HealthCheckResult,
} from "@calcom/calendar-adapter/calendar-adapter-types";
import { createCalendarAdapter } from "@calcom/calendar-adapter/create-calendar-adapter";
import { CalendarAdapterError } from "@calcom/calendar-adapter/lib/calendar-adapter-error";
import type { CredentialRepository } from "@calcom/features/calendar/repositories/credential-repository";
import type {
  SelectedCalendarByIdProjection,
  SelectedCalendarRepository,
} from "@calcom/features/calendar/repositories/selected-calendar-repository";
import type { CalendarCacheService } from "@calcom/features/calendar/services/calendar-cache-service";
import type { CalendarSyncService } from "@calcom/features/calendar/services/calendar-sync-service";
import type { FetchBusyTimesParams, ProcessEventsResult } from "@calcom/features/calendar/types";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["CalendarService"] });

const DEFAULT_HOURS_BEFORE = 11;
const DEFAULT_HOURS_AFTER = 14;
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 3;
const DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_MAX_SUBSCRIBE_ERRORS = 3;
const DEFAULT_MAX_SYNC_ERRORS = 3;
const DEFAULT_STALE_SYNC_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

const PROVIDERS_WITH_SUBSCRIPTIONS = [
  "google_calendar",
  "office365_calendar",
  "feishu_calendar",
  "lark_calendar",
] as const;

interface CircuitBreakerEntry {
  failCount: number;
  lastFailedAt: number;
}

export interface CalendarServiceDeps {
  selectedCalendarRepo: SelectedCalendarRepository;
  credentialRepo: CredentialRepository;
  cacheService: CalendarCacheService;
  syncService: CalendarSyncService;
  config?: {
    hoursBeforeExpansion?: number;
    hoursAfterExpansion?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerCooldownMs?: number;
    staleSyncThresholdMs?: number;
    webhookBaseUrl?: string;
    maxSubscribeErrors?: number;
    maxSyncErrors?: number;
    cacheEnabled?: (userId: number) => Promise<boolean>;
    syncEnabled?: (userId: number) => Promise<boolean>;
  };
}

export class CalendarService {
  private readonly hoursBeforeExpansion: number;
  private readonly hoursAfterExpansion: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerCooldownMs: number;
  private readonly staleSyncThresholdMs: number;
  private readonly circuitBreaker = new Map<number, CircuitBreakerEntry>();

  constructor(private readonly deps: CalendarServiceDeps) {
    this.hoursBeforeExpansion = deps.config?.hoursBeforeExpansion ?? DEFAULT_HOURS_BEFORE;
    this.hoursAfterExpansion = deps.config?.hoursAfterExpansion ?? DEFAULT_HOURS_AFTER;
    this.circuitBreakerThreshold = deps.config?.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD;
    this.circuitBreakerCooldownMs =
      deps.config?.circuitBreakerCooldownMs ?? DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS;
    this.staleSyncThresholdMs = deps.config?.staleSyncThresholdMs ?? DEFAULT_STALE_SYNC_THRESHOLD_MS;
  }

  async createEvent(
    credential: CalendarCredential,
    event: CalendarEventInput,
    externalCalendarId?: string | string[]
  ): Promise<CalendarEventResult[]> {
    const calendarIds = toCalendarIdArray(externalCalendarId);
    const adapter = this.createAdapter(credential);

    const results = await Promise.allSettled(calendarIds.map((id) => adapter.createEvent(event, id)));

    return collectResults(results, "createEvent", credential.id, log);
  }

  async updateEvent(
    credential: CalendarCredential,
    uid: string,
    event: CalendarEventInput,
    externalCalendarId?: string | string[]
  ): Promise<CalendarEventResult[]> {
    const calendarIds = toCalendarIdArray(externalCalendarId);
    const adapter = this.createAdapter(credential);

    const results = await Promise.allSettled(
      calendarIds.map(async (id) => {
        const result = await adapter.updateEvent(uid, event, id);
        return Array.isArray(result) ? result : [result];
      })
    );

    return collectResults(results, "updateEvent", credential.id, log).flat();
  }

  async deleteEvent(
    credential: CalendarCredential,
    uid: string,
    event?: CalendarEventInput,
    externalCalendarId?: string | string[]
  ): Promise<void> {
    const calendarIds = toCalendarIdArray(externalCalendarId);
    const adapter = this.createAdapter(credential);

    const results = await Promise.allSettled(calendarIds.map((id) => adapter.deleteEvent(uid, event, id)));

    for (const result of results) {
      if (result.status === "rejected") {
        log.error("deleteEvent failed for a calendar", {
          credentialId: credential.id,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }
  }

  async listCalendars(credential: CalendarCredential): Promise<CalendarInfo[]> {
    const adapter = this.createAdapter(credential);
    return adapter.listCalendars();
  }

  async testDelegation(credential: CalendarCredential): Promise<void> {
    const adapter = this.createAdapter(credential);
    try {
      const calendars = await adapter.listCalendars();
      if (calendars.length === 0) {
        throw ErrorWithCode.Factory.NotFound(
          "No calendars found — delegation credential may not have proper access"
        );
      }
    } catch (err) {
      if (err instanceof CalendarAdapterError) {
        if (err.status === 401) {
          throw ErrorWithCode.Factory.Unauthorized(`Authentication failed: ${err.message}`);
        }
        if (err.status === 403) {
          throw ErrorWithCode.Factory.Forbidden(
            `Access denied — the service account may not have domain-wide delegation enabled: ${err.message}`
          );
        }
      }
      throw err;
    }
  }

  async checkCredentialHealth(credential: CalendarCredential): Promise<HealthCheckResult | null> {
    const adapter = this.createAdapter(credential);
    if (!adapter.healthCheck) return null;
    return adapter.healthCheck();
  }

  async fetchBusyTimes(params: FetchBusyTimesParams): Promise<BusyTimeslot[]> {
    if (this.circuitBreaker.size > 1000) {
      this.pruneCircuitBreaker();
    }

    const { credentials, dateFrom, dateTo, selectedCalendars } = params;

    const expandedFrom = new Date(new Date(dateFrom).getTime() - this.hoursBeforeExpansion * 60 * 60 * 1000);
    const expandedTo = new Date(new Date(dateTo).getTime() + this.hoursAfterExpansion * 60 * 60 * 1000);

    const calendarsByCredentialId = new Map<string, SelectedCalendar[]>();
    for (const cal of selectedCalendars) {
      const credId = cal.credentialId ?? cal.delegationCredentialId;
      if (!credId) continue;
      const key = String(credId);
      const existing = calendarsByCredentialId.get(key) ?? [];
      existing.push(cal);
      calendarsByCredentialId.set(key, existing);
    }

    const allBusyTimes: BusyTimeslot[] = [];

    const adapterCalls = credentials.map(async (credential) => {
      if (this.isCircuitOpen(credential.id)) {
        log.warn("Circuit breaker open, skipping credential", {
          credentialId: credential.id,
          credentialType: credential.type,
        });
        return;
      }

      // For delegation credentials the grouping key is the delegation UUID,
      // which differs from credential.id (an integer). Check both keys.
      const calendarsForCredential =
        calendarsByCredentialId.get(String(credential.id)) ??
        (credential.delegationCredentialId
          ? calendarsByCredentialId.get(credential.delegationCredentialId)
          : undefined) ??
        [];
      if (calendarsForCredential.length === 0) return;

      const userId = calendarsForCredential[0]?.userId;
      const cacheEnabled = userId
        ? await (this.deps.config?.cacheEnabled?.(userId) ?? Promise.resolve(true))
        : true;
      const cacheCalendars: SelectedCalendar[] = [];
      const adapterCalendars: SelectedCalendar[] = [];

      const now = Date.now();
      for (const cal of calendarsForCredential) {
        // Only route to cache if caching is enabled AND the calendar was
        // synced recently enough that the cached data is trustworthy.
        // Stale calendars go through the adapter path where circuit breaker
        // and credential invalidation logic live.
        if (cacheEnabled && cal.syncedAt && now - cal.syncedAt.getTime() < this.staleSyncThresholdMs) {
          cacheCalendars.push(cal);
        } else {
          adapterCalendars.push(cal);
        }
      }

      if (cacheCalendars.length > 0) {
        try {
          const cached = await this.deps.cacheService.fetchFromCache({
            selectedCalendarIds: cacheCalendars.map((c) => c.id),
            dateFrom: expandedFrom,
            dateTo: expandedTo,
          });

          for (const bt of cached) {
            allBusyTimes.push({
              start: bt.start,
              end: bt.end,
              ...(bt.timeZone ? { timeZone: bt.timeZone } : {}),
            } as BusyTimeslot);
          }
        } catch (err) {
          log.error("Cache fetch failed, falling back to adapter", {
            credentialId: credential.id,
            error: err instanceof Error ? err.message : String(err),
          });
          adapterCalendars.push(...cacheCalendars);
        }
      }

      if (adapterCalendars.length > 0) {
        const adapter = this.createAdapter(credential);
        try {
          const busyTimes = await adapter.fetchBusyTimes({
            dateFrom: expandedFrom.toISOString(),
            dateTo: expandedTo.toISOString(),
            calendars: adapterCalendars.map((c) => ({
              externalId: c.externalId,
              integration: c.integration,
              credentialId: c.credentialId,
            })),
          });
          allBusyTimes.push(...busyTimes);
          this.recordSuccess(credential.id);
        } catch (err) {
          if (err instanceof CalendarAdapterError && err.transient) {
            // Intentionally neither recordFailure (don't penalise) nor recordSuccess
            // (don't clear legitimate prior failures). A transient error (429/503)
            // means "try again later" — it doesn't prove the credential is healthy.
            // Only a real successful response resets the circuit breaker.
            log.warn("Transient error fetching busy times, will retry next time", {
              credentialId: credential.id,
              credentialType: credential.type,
              error: err.message,
            });
          } else {
            this.recordFailure(credential.id, err);
            log.error("Failed to fetch busy times", {
              credentialId: credential.id,
              credentialType: credential.type,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    });

    await Promise.allSettled(adapterCalls);
    return allBusyTimes;
  }

  async subscribe(selectedCalendarId: string): Promise<void> {
    log.info("subscribe", { selectedCalendarId });

    const selectedCalendar = await this.deps.selectedCalendarRepo.findById(selectedCalendarId);
    if (!selectedCalendar) {
      log.info("Selected calendar not found", { selectedCalendarId });
      return;
    }

    if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
      log.info("Selected calendar has no credentials", { selectedCalendarId });
      return;
    }

    const maxErrors = this.deps.config?.maxSubscribeErrors ?? DEFAULT_MAX_SUBSCRIBE_ERRORS;
    const subscribeErrorCount = selectedCalendar.syncSubscribedErrorCount ?? 0;
    if (subscribeErrorCount >= maxErrors) {
      log.info("Subscribe error threshold exceeded", { selectedCalendarId });
      return;
    }

    const adapter = await this.createAdapterFromCalendar(selectedCalendar);
    if (!adapter.subscribe) {
      log.info("Adapter does not support subscriptions", { integration: selectedCalendar.integration });
      return;
    }

    const webhookUrl = this.deps.config?.webhookBaseUrl
      ? `${this.deps.config.webhookBaseUrl}/calendars/${selectedCalendar.integration}/webhook`
      : "";

    try {
      const result = await adapter.subscribe({
        calendarId: selectedCalendar.externalId,
        webhookUrl,
      });

      await this.deps.selectedCalendarRepo.updateSubscription(selectedCalendarId, {
        channelId: result.channelId,
        channelResourceId: result.resourceId,
        channelResourceUri: result.resourceUri,
        channelExpiration: result.expiration,
        syncSubscribedAt: new Date(),
        syncSubscribedErrorAt: null,
        syncSubscribedErrorCount: 0,
      });
    } catch (error) {
      const nextErrorCount = Math.min(maxErrors, subscribeErrorCount + 1);

      await this.deps.selectedCalendarRepo.updateSubscription(selectedCalendarId, {
        syncSubscribedAt: null,
        syncSubscribedErrorAt: new Date(),
        syncSubscribedErrorCount: nextErrorCount,
      });

      throw error;
    }

    await this.processEvents(selectedCalendar);
  }

  async unsubscribe(selectedCalendarId: string): Promise<void> {
    log.info("unsubscribe", { selectedCalendarId });

    const selectedCalendar = await this.deps.selectedCalendarRepo.findById(selectedCalendarId);
    if (!selectedCalendar) {
      log.info("Selected calendar not found for unsubscribe", { selectedCalendarId });
      return;
    }

    const adapter = await this.createAdapterFromCalendar(selectedCalendar);
    if (!adapter.unsubscribe || !selectedCalendar.channelId) return;

    // Unsubscribe from the provider first — if this throws, we keep the
    // channel metadata intact so a retry can still reference it.
    await adapter.unsubscribe({
      channelId: selectedCalendar.channelId,
      resourceId: selectedCalendar.channelResourceId,
    });

    // Atomically clear all channel metadata AND reset sync state in a single
    // transaction.  This ensures processWebhook can no longer route incoming
    // webhooks to this calendar AND fetchBusyTimes routes through the adapter
    // (not the now-empty cache).  Without a transaction, a failure between the
    // two updates would leave the calendar in an inconsistent state.
    await this.deps.selectedCalendarRepo.clearUnsubscribeState(selectedCalendarId);

    await this.deps.cacheService.cleanupCache(selectedCalendarId);
  }

  async processWebhook(provider: string, channelId: string): Promise<ProcessEventsResult | null> {
    log.info("processWebhook", { provider, channelId });

    const selectedCalendar = await this.deps.selectedCalendarRepo.findByChannelId(channelId);
    if (!selectedCalendar) {
      log.info("Webhook: calendar not found for channelId", { channelId, provider });
      return null;
    }

    await this.deps.selectedCalendarRepo.updateLastWebhookReceivedAt(selectedCalendar.id);
    return this.processEvents(selectedCalendar);
  }

  async processEvents(selectedCalendar: SelectedCalendarByIdProjection): Promise<ProcessEventsResult> {
    const result: ProcessEventsResult = { eventsFetched: 0, eventsCached: 0, eventsSynced: 0 };

    const adapter = await this.createAdapterFromCalendar(selectedCalendar);
    if (!adapter.fetchEvents) {
      log.info("Adapter does not support fetchEvents", { integration: selectedCalendar.integration });
      return result;
    }

    const maxSyncErrors = this.deps.config?.maxSyncErrors ?? DEFAULT_MAX_SYNC_ERRORS;

    try {
      const fetchResult = await adapter.fetchEvents({
        calendarId: selectedCalendar.externalId,
        syncToken: selectedCalendar.syncToken,
      });

      // When the provider signals that the sync token has expired (e.g. Google 410),
      // the adapter returns { events: [], nextSyncToken: "", fullSyncRequired: true }
      // instead of throwing.  Clear the token so the next call does a full sync.
      if (fetchResult.fullSyncRequired) {
        log.warn("Full sync required — clearing sync token", {
          selectedCalendarId: selectedCalendar.id,
          provider: selectedCalendar.integration,
        });

        await this.deps.selectedCalendarRepo.updateSyncStatus(selectedCalendar.id, {
          syncToken: null,
          syncedAt: null,
          syncErrorAt: null,
          syncErrorCount: 0,
        });

        return result;
      }

      result.eventsFetched = fetchResult.events.length;

      // Use ?? instead of || so that an explicit empty string from the adapter
      // is preserved rather than silently falling back to the old token.
      await this.deps.selectedCalendarRepo.updateSyncStatus(selectedCalendar.id, {
        syncToken: fetchResult.nextSyncToken ?? selectedCalendar.syncToken,
        syncedAt: new Date(),
        syncErrorAt: null,
        syncErrorCount: 0,
      });

      if (fetchResult.events.length === 0) return result;

      if (await (this.deps.config?.cacheEnabled?.(selectedCalendar.userId) ?? Promise.resolve(true))) {
        await this.deps.cacheService.handleEvents(selectedCalendar, fetchResult.events);
        result.eventsCached = fetchResult.events.filter((e) => e.status !== "cancelled").length;
      }

      if (await (this.deps.config?.syncEnabled?.(selectedCalendar.userId) ?? Promise.resolve(true))) {
        await this.deps.syncService.handleEvents(selectedCalendar, fetchResult.events);
        result.eventsSynced = fetchResult.events.filter(
          (e) => (e.iCalUID ?? e.uid)?.toLowerCase().endsWith("@cal.com")
        ).length;
      }
    } catch (err) {
      if (err instanceof CalendarAdapterError && err.transient) {
        log.warn("Transient error during event processing, will retry", {
          selectedCalendarId: selectedCalendar.id,
          provider: selectedCalendar.integration,
          error: err.message,
        });
        return result;
      }

      const nextErrorCount = (selectedCalendar.syncErrorCount ?? 0) + 1;
      const shouldResetSyncToken = nextErrorCount >= maxSyncErrors;

      if (shouldResetSyncToken) {
        log.warn("Resetting syncToken after repeated failures", {
          selectedCalendarId: selectedCalendar.id,
          syncErrorCount: nextErrorCount,
        });
      }

      await this.deps.selectedCalendarRepo.updateSyncStatus(selectedCalendar.id, {
        syncErrorAt: new Date(),
        syncErrorCount: { increment: 1 },
        ...(shouldResetSyncToken ? { syncToken: null, syncErrorCount: 0 } : {}),
      });

      throw err;
    }

    return result;
  }

  async checkForNewSubscriptions(): Promise<void> {
    const rows = await this.deps.selectedCalendarRepo.findNextSubscriptionBatch({
      take: 100,
      integrations: [...PROVIDERS_WITH_SUBSCRIPTIONS],
    });

    log.info("checkForNewSubscriptions", { count: rows.length });
    await Promise.allSettled(rows.map(({ id }) => this.subscribe(id)));
  }

  private isCircuitOpen(credentialId: number): boolean {
    const entry = this.circuitBreaker.get(credentialId);
    if (!entry) return false;
    if (entry.failCount < this.circuitBreakerThreshold) return false;
    if (Date.now() - entry.lastFailedAt >= this.circuitBreakerCooldownMs) {
      this.circuitBreaker.delete(credentialId);
      return false;
    }
    return true;
  }

  private recordFailure(credentialId: number, err?: unknown): void {
    const entry = this.circuitBreaker.get(credentialId) ?? { failCount: 0, lastFailedAt: 0 };
    entry.failCount++;
    entry.lastFailedAt = Date.now();
    this.circuitBreaker.set(credentialId, entry);

    if (err instanceof CalendarAdapterError && (err.status === 401 || err.status === 403)) {
      this.deps.credentialRepo.invalidate(credentialId).catch((invalidateErr) => {
        log.error("Failed to invalidate credential", {
          credentialId,
          error: invalidateErr instanceof Error ? invalidateErr.message : String(invalidateErr),
        });
      });
      log.warn("Credential marked as invalid", { credentialId, status: err.status });
    }
  }

  private recordSuccess(credentialId: number): void {
    this.circuitBreaker.delete(credentialId);
  }

  private pruneCircuitBreaker(): void {
    const now = Date.now();
    for (const [credId, entry] of this.circuitBreaker) {
      if (now - entry.lastFailedAt > this.circuitBreakerCooldownMs) {
        this.circuitBreaker.delete(credId);
      }
    }
  }

  private createAdapter(credential: CalendarCredential): CalendarAdapter {
    return createCalendarAdapter(credential.type, credential);
  }

  private async createAdapterFromCalendar(
    selectedCalendar: SelectedCalendarByIdProjection
  ): Promise<CalendarAdapter> {
    const credential = await this.deps.credentialRepo.resolve(selectedCalendar);
    return createCalendarAdapter(selectedCalendar.integration, credential);
  }
}

function toCalendarIdArray(id?: string | string[]): string[] {
  if (!id) return ["primary"];
  return Array.isArray(id) ? id : [id];
}

function collectResults<T>(
  results: PromiseSettledResult<T>[],
  method: string,
  credentialId: number,
  logger: { error: (msg: string, ctx?: Record<string, unknown>) => void }
): T[] {
  const collected: T[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      collected.push(result.value);
    } else {
      logger.error(`${method} failed for a calendar`, {
        credentialId,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }
  return collected;
}
