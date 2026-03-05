export enum CalendarProvider {
  GOOGLE = "GOOGLE",
  OUTLOOK = "OUTLOOK",
}

export enum ExternalEventStatus {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  TENTATIVE = "TENTATIVE",
}

export type EventChangeType = "upsert" | "delete";

export type ProviderCursorType = "GOOGLE_SYNC_TOKEN" | "OUTLOOK_DELTA_LINK" | string;

export interface CredentialLike {
  id: number;
  type: string;
  key: unknown;
}

export interface ProviderCursorDTO {
  type: ProviderCursorType;
  value: string;
  expiresAt?: string | null;
}

export interface ProviderSubscriptionDTO {
  subscriptionId: string;
  resourceId?: string | null;
  expirationDateTime?: string | null;
  clientState?: string | null;
}

export interface NormalizedCalendarEventDTO {
  provider: CalendarProvider;
  externalEventId: string;
  iCalUID: string | null;
  calendarId: string;
  recurringEventId: string | null;
  originalStartTime: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timeZone: string | null;
  title?: string;
  description?: string;
  location?: string;
  meetingUrl?: string;
  color?: string;
  showAsBusy: boolean;
  status: ExternalEventStatus;
  providerUpdatedAt?: string | null;
  providerCreatedAt?: string | null;
  sequence?: number | null;
  rawPayload: unknown;
  changeType: EventChangeType;
}

export interface InitialSyncResultDTO {
  events: NormalizedCalendarEventDTO[];
  nextCursor: ProviderCursorDTO;
  subscription: ProviderSubscriptionDTO | null;
}

export interface DeltaSyncResultDTO {
  changes: NormalizedCalendarEventDTO[];
  nextCursor: ProviderCursorDTO;
}

export type CursorRetryStrategy = "full_resync";

export abstract class CalendarProviderError extends Error {
  readonly provider: CalendarProvider;
  readonly isRetryable: boolean;

  protected constructor(params: {
    name: string;
    message: string;
    provider: CalendarProvider;
    isRetryable: boolean;
  }) {
    super(params.message);
    this.name = params.name;
    this.provider = params.provider;
    this.isRetryable = params.isRetryable;
  }
}

export class CursorExpiredError extends CalendarProviderError {
  readonly retryStrategy: CursorRetryStrategy;
  readonly reason: string;

  constructor(params: { provider: CalendarProvider; reason: string; retryStrategy?: CursorRetryStrategy }) {
    super({
      name: "CursorExpiredError",
      message: "Provider cursor is expired or invalid.",
      provider: params.provider,
      isRetryable: true,
    });
    this.reason = params.reason;
    this.retryStrategy = params.retryStrategy ?? "full_resync";
  }
}

export class RateLimitedError extends CalendarProviderError {
  readonly retryAfterSeconds: number | null;

  constructor(params: { provider: CalendarProvider; retryAfterSeconds?: number | null; message?: string }) {
    super({
      name: "RateLimitedError",
      message: params.message ?? "Provider rate limit reached.",
      provider: params.provider,
      isRetryable: true,
    });
    this.retryAfterSeconds = params.retryAfterSeconds ?? null;
  }
}

export class AuthExpiredError extends CalendarProviderError {
  constructor(params: { provider: CalendarProvider; message?: string }) {
    super({
      name: "AuthExpiredError",
      message: params.message ?? "Provider auth expired or invalid.",
      provider: params.provider,
      isRetryable: false,
    });
  }
}

export class ProviderTransientError extends CalendarProviderError {
  constructor(params: { provider: CalendarProvider; message?: string }) {
    super({
      name: "ProviderTransientError",
      message: params.message ?? "Transient provider error.",
      provider: params.provider,
      isRetryable: true,
    });
  }
}

export class ProviderPermanentError extends CalendarProviderError {
  constructor(params: { provider: CalendarProvider; message?: string }) {
    super({
      name: "ProviderPermanentError",
      message: params.message ?? "Permanent provider error.",
      provider: params.provider,
      isRetryable: false,
    });
  }
}

export class NotRenewableError extends CalendarProviderError {
  constructor(params: { provider: CalendarProvider; message?: string }) {
    super({
      name: "NotRenewableError",
      message: params.message ?? "Provider subscription cannot be renewed and must be recreated.",
      provider: params.provider,
      isRetryable: false,
    });
  }
}
