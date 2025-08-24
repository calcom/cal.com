import type { Calendar, CalendarClass } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CALENDAR_SERVICES } from "../calendar.services.generated";

interface CalendarApp {
  lib: {
    CalendarService: CalendarClass;
  };
}

// ---------- Overloads (backwards compatibility) ----------
export async function getCalendar(credential: CredentialForCalendarService | null): Promise<Calendar | null>;
export async function getCalendar(
  credential: CredentialForCalendarService,
  calendarType?: keyof typeof CALENDAR_SERVICES | string
): Promise<Calendar | null>;

// ---------- Implementation ----------
export async function getCalendar(
  credential: CredentialForCalendarService | null,
  calendarType?: string
): Promise<Calendar | null> {
  const log = (globalThis as any)?.logger?.getSubLogger?.({
    prefix: ["app-store", "getCalendar"],
  });

  if (!credential || !credential.key) return null;

  // derive type if not explicitly provided
  let type = calendarType ?? credential.type;

  // suffix handling
  if (type?.endsWith("_other_calendar")) type = type.slice(0, -"_other_calendar".length);
  if (type?.endsWith("_crm")) type = type.slice(0, -"_crm".length);

  // normalize key
  const normalizeKey = (k?: string): string | undefined => k?.replace(/-/g, "_").toLowerCase();

  const resolveFromRegistry = (raw?: string): CalendarClass | undefined => {
    const nk = normalizeKey(raw);
    return nk ? (CALENDAR_SERVICES as Record<string, CalendarApp>)?.[nk]?.lib?.CalendarService : undefined;
  };

  const Service = resolveFromRegistry(type) ?? resolveFromRegistry(credential.type);

  if (!Service) {
    log?.warn?.("Unknown calendar type for getCalendar()", {
      input: type,
      credentialType: credential?.type,
    });
    return null;
  }

  return new Service(credential);
}
