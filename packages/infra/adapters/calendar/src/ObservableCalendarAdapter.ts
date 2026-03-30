import type { CalendarAdapter } from "./CalendarAdapter";
import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
  FetchEventsInput,
  FetchEventsResult,
  HealthCheckResult,
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,
} from "./CalendarAdapterTypes";
import { CalendarAdapterError } from "./lib/CalendarAdapterError";

// ---------------------------------------------------------------------------
// Interfaces — compatible with @calcom/lib/logger (Pino) and Sentry metrics
// ---------------------------------------------------------------------------

export interface CalendarAdapterLogger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

export interface CalendarAdapterMetrics {
  count(name: string, value: number, opts?: { attributes?: Record<string, string> }): void;
  distribution(name: string, value: number, opts?: { attributes?: Record<string, string> }): void;
}

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

/**
 * Transparent observability decorator for any CalendarAdapter.
 *
 * Wraps every method with structured logging and Sentry-compatible metrics.
 * The inner adapter is untouched — consumers see the same CalendarAdapter
 * interface with zero behavior changes.
 *
 * ```ts
 * const adapter = createCalendarAdapter(credential.type, credential);
 * const observable = new ObservableCalendarAdapter(adapter, {
 *   provider: credential.type,
 *   credentialId: credential.id,
 *   logger,   // @calcom/lib/logger or any Pino-compatible logger
 *   metrics,  // { count: Sentry.metrics.count, distribution: Sentry.metrics.distribution }
 * });
 * ```
 */
export class ObservableCalendarAdapter implements CalendarAdapter {
  private readonly provider: string;
  private readonly credentialId: number;
  private readonly logger: CalendarAdapterLogger;
  private readonly metrics: CalendarAdapterMetrics;
  private readonly inner: CalendarAdapter;

  constructor(
    inner: CalendarAdapter,
    opts: {
      provider: string;
      credentialId: number;
      logger: CalendarAdapterLogger;
      metrics: CalendarAdapterMetrics;
    }
  ) {
    this.inner = inner;
    this.provider = opts.provider;
    this.credentialId = opts.credentialId;
    this.logger = opts.logger;
    this.metrics = opts.metrics;

    // Proxy optional methods — only expose if inner adapter has them
    if (inner.fetchEvents) {
      this.fetchEvents = this.observeFetchEvents.bind(this);
    }
    if (inner.subscribe) {
      this.subscribe = this.observeSubscribe.bind(this);
    }
    if (inner.unsubscribe) {
      this.unsubscribe = this.observeUnsubscribe.bind(this);
    }
    if (inner.healthCheck) {
      this.healthCheck = this.observeHealthCheck.bind(this);
    }
  }

  // -------------------------------------------------------------------------
  // Required methods
  // -------------------------------------------------------------------------

  async createEvent(event: CalendarEventInput, externalCalendarId?: string): Promise<CalendarEventResult> {
    return this.observe("createEvent", { calendarId: externalCalendarId ?? "primary", uid: event.uid }, () =>
      this.inner.createEvent(event, externalCalendarId)
    );
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<CalendarEventResult | CalendarEventResult[]> {
    return this.observe("updateEvent", { calendarId: externalCalendarId ?? "primary", uid }, () =>
      this.inner.updateEvent(uid, event, externalCalendarId)
    );
  }

  async deleteEvent(uid: string, event?: CalendarEventInput, externalCalendarId?: string | null): Promise<void> {
    return this.observe("deleteEvent", { calendarId: externalCalendarId ?? "primary", uid }, () =>
      this.inner.deleteEvent(uid, event, externalCalendarId)
    );
  }

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    const result = await this.observe("fetchBusyTimes", { calendars: params.calendars.length }, () =>
      this.inner.fetchBusyTimes(params)
    );
    this.metrics.distribution("calendar.adapter.busy_slots", result.length, {
      attributes: this.tags("fetchBusyTimes"),
    });
    return result;
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    const result = await this.observe("listCalendars", {}, () => this.inner.listCalendars());
    this.metrics.distribution("calendar.adapter.calendars_listed", result.length, {
      attributes: this.tags("listCalendars"),
    });
    return result;
  }

  // -------------------------------------------------------------------------
  // Optional methods — assigned in constructor only if inner supports them
  // -------------------------------------------------------------------------

  fetchEvents?: (params: FetchEventsInput) => Promise<FetchEventsResult>;
  subscribe?: (input: SubscribeInput) => Promise<SubscribeResult>;
  unsubscribe?: (input: UnsubscribeInput) => Promise<void>;
  healthCheck?: () => Promise<HealthCheckResult>;

  private async observeFetchEvents(params: FetchEventsInput): Promise<FetchEventsResult> {
    const result = await this.observe(
      "fetchEvents",
      { calendarId: params.calendarId, hasSyncToken: !!params.syncToken },
      () => this.inner.fetchEvents!(params)
    );
    this.metrics.distribution("calendar.adapter.events_fetched", result.events.length, {
      attributes: this.tags("fetchEvents"),
    });
    return result;
  }

  private async observeSubscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const result = await this.observe("subscribe", { calendarId: input.calendarId }, () =>
      this.inner.subscribe!(input)
    );
    this.logger.info(`${this.provider}.subscribe`, {
      credentialId: this.credentialId,
      channelId: result.channelId,
      expiration: result.expiration?.toISOString(),
    });
    return result;
  }

  private async observeUnsubscribe(input: UnsubscribeInput): Promise<void> {
    return this.observe("unsubscribe", { channelId: input.channelId }, () =>
      this.inner.unsubscribe!(input)
    );
  }

  private async observeHealthCheck(): Promise<HealthCheckResult> {
    const result = await this.observe("healthCheck", {}, () => this.inner.healthCheck!());
    if (result.valid) {
      this.logger.info(`${this.provider}.healthCheck`, { credentialId: this.credentialId, valid: true });
    } else {
      this.logger.warn(`${this.provider}.healthCheck`, {
        credentialId: this.credentialId,
        valid: false,
        reason: result.reason,
      });
    }
    this.metrics.count(`calendar.adapter.health.${result.valid ? "valid" : "invalid"}`, 1, {
      attributes: { ...this.tags("healthCheck"), ...(result.reason ? { reason: result.reason } : {}) },
    });
    return result;
  }

  // -------------------------------------------------------------------------
  // Core observation wrapper
  // -------------------------------------------------------------------------

  private async observe<T>(method: string, context: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);

      this.logger.info(`${this.provider}.${method}`, {
        credentialId: this.credentialId,
        durationMs,
        ...context,
      });

      this.metrics.count("calendar.adapter.call.success", 1, {
        attributes: this.tags(method),
      });
      this.metrics.distribution("calendar.adapter.call.duration_ms", durationMs, {
        attributes: this.tags(method),
      });

      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      const status = err instanceof CalendarAdapterError ? err.status : undefined;
      const transient = err instanceof CalendarAdapterError ? err.transient : false;

      this.logger.error(`${this.provider}.${method}`, {
        credentialId: this.credentialId,
        durationMs,
        status,
        transient,
        error: err instanceof Error ? err.message : String(err),
        ...context,
      });

      this.metrics.count("calendar.adapter.call.error", 1, {
        attributes: {
          ...this.tags(method),
          ...(status ? { status: String(status) } : {}),
          transient: String(transient),
        },
      });
      this.metrics.distribution("calendar.adapter.call.duration_ms", durationMs, {
        attributes: { ...this.tags(method), outcome: "error" },
      });

      throw err;
    }
  }

  private tags(method: string): Record<string, string> {
    return {
      provider: this.provider,
      method,
      credentialId: String(this.credentialId),
    };
  }
}
