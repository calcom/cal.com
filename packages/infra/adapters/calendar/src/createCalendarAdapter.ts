import type { CalendarAdapter } from "./CalendarAdapter";
import type {
  AppleCalendarCredential,
  CalDAVCalendarCredential,
  CalendarCredential,
  ExchangeCalendarCredential,
  FeishuCalendarCredential,
  GoogleCalendarCredential,
  ICSFeedCalendarCredential,
  LarkCalendarCredential,
  Office365CalendarCredential,
  ProtonCalendarCredential,
  ZohoCalendarCredential,
} from "./CalendarAdapterTypes";
import { NoOpCalendarAdapter } from "./NoOpCalendarAdapter";
import { AppleCalendarAdapter } from "./adapters/AppleCalendarAdapter";
import { CalDAVCalendarAdapter } from "./adapters/CalDAVCalendarAdapter";
import { ExchangeCalendarAdapter } from "./adapters/ExchangeCalendarAdapter";
import { FeishuCalendarAdapter } from "./adapters/FeishuCalendarAdapter";
import { GoogleCalendarAdapter } from "./adapters/GoogleCalendarAdapter";
import { ICSFeedCalendarAdapter } from "./adapters/ICSFeedCalendarAdapter";
import { LarkCalendarAdapter } from "./adapters/LarkCalendarAdapter";
import { Office365CalendarAdapter } from "./adapters/Office365CalendarAdapter";
import { ProtonCalendarAdapter } from "./adapters/ProtonCalendarAdapter";
import { ZohoCalendarAdapter } from "./adapters/ZohoCalendarAdapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarAdapterFactory = (credential: CalendarCredential) => CalendarAdapter;

// ---------------------------------------------------------------------------
// Provider registry — all built-in providers are pre-registered
// ---------------------------------------------------------------------------

const providerRegistry = new Map<string, CalendarAdapterFactory>();

function register(provider: string, factory: CalendarAdapterFactory): void {
  providerRegistry.set(provider, factory);
}

register("google_calendar", (cred) => new GoogleCalendarAdapter(cred as GoogleCalendarCredential));
register("office365_calendar", (cred) => new Office365CalendarAdapter(cred as Office365CalendarCredential));
register("caldav_calendar", (cred) => new CalDAVCalendarAdapter(cred as CalDAVCalendarCredential));
register("apple_calendar", (cred) => new AppleCalendarAdapter(cred as AppleCalendarCredential));
register("proton_calendar", (cred) => new ProtonCalendarAdapter(cred as ProtonCalendarCredential));
register("exchange_calendar", (cred) => new ExchangeCalendarAdapter(cred as ExchangeCalendarCredential));
register("feishu_calendar", (cred) => new FeishuCalendarAdapter(cred as FeishuCalendarCredential));
register("lark_calendar", (cred) => new LarkCalendarAdapter(cred as LarkCalendarCredential));
register("zoho_calendar", (cred) => new ZohoCalendarAdapter(cred as ZohoCalendarCredential));
register("ics_feed_calendar", (cred) => new ICSFeedCalendarAdapter(cred as ICSFeedCalendarCredential));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a calendar adapter for the given provider.
 *
 * All built-in providers are pre-registered. Falls back to
 * NoOpCalendarAdapter if the provider is unknown.
 *
 * @param provider - Provider key (e.g. "google_calendar", "office365_calendar")
 * @param credential - Already-decrypted credential payload
 *
 * @example
 * ```ts
 * const adapter = createCalendarAdapter("google_calendar", {
 *   access_token: "ya29...",
 *   refresh_token: "1//...",
 * });
 * ```
 */
export function createCalendarAdapter(provider: string, credential: CalendarCredential): CalendarAdapter {
  const factory = providerRegistry.get(provider);

  if (!factory) {
    return new NoOpCalendarAdapter();
  }

  return factory(credential);
}

/**
 * @deprecated Use CalendarCredential instead.
 */
export type CredentialPayload = Record<string, unknown>;

/**
 * Register a custom calendar adapter factory.
 *
 * Use this to add providers not included in the built-in set,
 * or to override a built-in provider (e.g. for testing).
 */
export function registerCalendarAdapterProvider(provider: string, factory: CalendarAdapterFactory): void {
  providerRegistry.set(provider, factory);
}

/**
 * Check if a provider has a registered adapter factory.
 */
export function hasCalendarAdapterProvider(provider: string): boolean {
  return providerRegistry.has(provider);
}

/**
 * List all registered provider keys.
 */
export function getRegisteredProviders(): string[] {
  return Array.from(providerRegistry.keys());
}

/**
 * Reset the registry to only built-in providers.
 * Intended for use in tests.
 */
export function clearCustomProviders(): void {
  const builtIn = [
    "google_calendar",
    "office365_calendar",
    "caldav_calendar",
    "apple_calendar",
    "proton_calendar",
    "exchange_calendar",
    "feishu_calendar",
    "lark_calendar",
    "zoho_calendar",
    "ics_feed_calendar",
  ];
  for (const key of providerRegistry.keys()) {
    if (!builtIn.includes(key)) {
      providerRegistry.delete(key);
    }
  }
}
