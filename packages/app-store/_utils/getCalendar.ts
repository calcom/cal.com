// packages/app-store/_utils/getCalendar.ts
import logger from "@calcom/lib/logger";
import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CALENDAR_SERVICES } from "../calendar.services.generated";

type CalendarServiceCtor = new (cred: CredentialForCalendarService) => Calendar;

function isCalendarServiceModule(m: unknown): m is { lib: { CalendarService: CalendarServiceCtor } } {
  return !!(m && typeof m === "object" && (m as any)?.lib?.CalendarService);
}

const normalizeKey = (s: string | null | undefined) => (s ?? "").replace(/[_-]/g, "").toLowerCase();

function resolveFromRegistry<T extends Record<string, unknown>>(
  registry: T,
  rawKey: string | null | undefined
): (() => Promise<unknown>) | undefined {
  const want = normalizeKey(rawKey);
  const match = (Object.keys(registry) as Array<keyof T>).find((k) => normalizeKey(String(k)) === want);
  const factory = match ? (registry as any)[String(match)] : undefined;
  return typeof factory === "function" ? (factory as () => Promise<unknown>) : undefined;
}

// Overloads (keeps old API working)
export function getCalendar(credential: CredentialForCalendarService | null): Promise<Calendar | null>;
export function getCalendar(
  credential: CredentialForCalendarService,
  calendarType: string
): Promise<Calendar | null>;

// Impl
export async function getCalendar(
  credential: CredentialForCalendarService | null,
  calendarType?: string
): Promise<Calendar | null> {
  const log = logger.getSubLogger({ prefix: ["app-store", "getCalendar"] });
  if (!credential?.key) return null;

  let type = (calendarType ?? credential.type) || "";

  // legacy suffix handling preserved
  if (type.endsWith("_other_calendar")) type = type.split("_other_calendar")[0];
  if (type.endsWith("_crm")) type = type.split("_crm")[0];

  const factory = resolveFromRegistry(CALENDAR_SERVICES as Record<string, unknown>, type);
  const calendarApp = factory ? await factory() : null;

  if (!isCalendarServiceModule(calendarApp)) {
    log.warn(`calendar of type ${type} is not implemented`);
    return null;
  }

  return new calendarApp.lib.CalendarService(credential);
}
