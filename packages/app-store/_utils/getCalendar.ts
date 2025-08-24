// imports above unchanged
import type { Calendar, CalendarClass } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CALENDAR_SERVICES } from "../calendar.services.generated";

// If this interface is already in the file, keep it; if not, include it:
interface CalendarApp {
  lib: {
    CalendarService: CalendarClass;
  };
}

// ---------- Overloads (backwards compatibility) ----------
export async function getCalendar(credential: CredentialForCalendarService | null): Promise<Calendar | null>;
export async function getCalendar(
  credential: CredentialForCalendarService,
  calendarType: string
): Promise<Calendar | null>;

// ---------- Implementation ----------
export async function getCalendar(
  credential: CredentialForCalendarService | null,
  calendarType?: string
): Promise<Calendar | null> {
  // existing logger line if present in the file:
  const log = (globalThis as any)?.logger?.getSubLogger?.({ prefix: ["app-store", "getCalendar"] });

  if (!credential || !credential.key) return null;

  // Prefer explicit param, but fall back to the credential.type (old behavior)
  const keyFromCaller = calendarType ?? credential.type;

  // Safe normalizer: NEVER assume string
  const normalizeKey = (k?: string): string | undefined => {
    if (!k) return undefined;
    let v = k;

    // Keep your suffix handling (seen in the diff)
    if (v.endsWith("_other_calendar")) v = v.slice(0, -"_other_calendar".length);
    if (v.endsWith("_crm")) v = v.slice(0, -"_crm".length);

    // Normalize dashes/underscores/case
    v = v.replace(/-/g, "_").toLowerCase();
    return v;
  };

  const resolveFromRegistry = (raw?: string): CalendarClass | undefined => {
    const nk = normalizeKey(raw);
    if (!nk) return undefined;
    // CALENDAR_SERVICES is a generated map; index defensively
    return (CALENDAR_SERVICES as Record<string, CalendarApp>)?.[nk]?.lib?.CalendarService;
  };

  const Service =
    resolveFromRegistry(keyFromCaller) ?? // explicit param if provided
    resolveFromRegistry(credential.type); // fallback (legacy)

  if (!Service) {
    log?.warn?.("Unknown calendar type for getCalendar()", {
      input: keyFromCaller,
      credentialType: credential?.type,
    });
    return null;
  }

  return new Service(credential);
}
