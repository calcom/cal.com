import { PALETTE, UNIFIED_EVENT_FALLBACK_TITLE } from "./constants";
import { deriveUnifiedEventColor } from "./eventColors";
import type {
  ConnectedCalendarIntegrationRaw,
  ConnectedCalendarRaw,
  ConnectedCalendarVM,
  LegacyMockCalendar,
  LegacyMockEvent,
  SupportedCalendarProvider,
  SupportedSyncProvider,
  UnifiedCalendarEventVM,
  UnifiedCalendarItem,
} from "./types";

const normalizeProvider = (value: string | null | undefined): SupportedCalendarProvider | null => {
  if (!value) return null;

  const normalized = value.toLowerCase();

  if (normalized.includes("google")) return "google";

  if (
    normalized.includes("outlook") ||
    normalized.includes("office365") ||
    normalized.includes("microsoft")
  ) {
    return "outlook";
  }

  return null;
};

const normalizeSyncProvider = (value: string | null | undefined): SupportedSyncProvider | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("google")) return "GOOGLE";
  if (
    normalized.includes("outlook") ||
    normalized.includes("office365") ||
    normalized.includes("microsoft")
  ) {
    return "OUTLOOK";
  }
  return null;
};

const mapCapabilities = (source: UnifiedCalendarItem["source"]) => {
  const isInternal = source === "INTERNAL";

  return {
    canEdit: isInternal,
    canDelete: isInternal,
    canReschedule: isInternal,
    isReadOnly: !isInternal,
  };
};

const withSafeTitle = (title: string | null | undefined): string => {
  const normalized = title?.trim();
  return normalized && normalized.length > 0 ? normalized : UNIFIED_EVENT_FALLBACK_TITLE;
};

export const mapConnectedCalendarToVM = (input: {
  connection: Pick<ConnectedCalendarIntegrationRaw, "credentialId" | "integration" | "primary">;
  calendar: ConnectedCalendarRaw;
  fallbackColor?: string;
}): ConnectedCalendarVM | null => {
  const providerSource = input.calendar.syncProvider ?? input.connection.integration.type;
  const provider = normalizeProvider(providerSource);
  const syncProvider = normalizeSyncProvider(providerSource);
  if (!provider || !syncProvider) return null;

  return {
    id: `${input.connection.credentialId ?? "na"}:${input.calendar.externalId}`,
    credentialId: input.connection.credentialId,
    externalCalendarId:
      typeof input.calendar.externalCalendarId === "number"
        ? input.calendar.externalCalendarId
        : typeof input.calendar.id === "number"
        ? input.calendar.id
        : null,
    providerCalendarId: input.calendar.externalId,
    syncProvider,
    name: input.calendar.name?.trim() || "Untitled calendar",
    provider,
    email: input.connection.primary?.email ?? "",
    color:
      input.fallbackColor ??
      deriveUnifiedEventColor({
        source: "EXTERNAL",
        provider,
        calendarIdentity: `${input.connection.credentialId ?? "na"}:${input.calendar.externalId}`,
      }),
    syncEnabled: Boolean(input.calendar.syncEnabled ?? input.calendar.isSelected),
    isVisible: true,
    readOnly: Boolean(input.calendar.readOnly),
  };
};

export const mapConnectedCalendarsToVM = (
  connections: ConnectedCalendarIntegrationRaw[],
  options?: { fallbackColor?: string }
): ConnectedCalendarVM[] => {
  return connections.flatMap((connection) =>
    (connection.calendars ?? [])
      .map((calendar) =>
        mapConnectedCalendarToVM({
          connection,
          calendar,
          fallbackColor: options?.fallbackColor,
        })
      )
      .filter((calendar): calendar is ConnectedCalendarVM => calendar !== null)
  );
};

export const mapUnifiedCalendarItemToVM = (
  item: UnifiedCalendarItem,
  options?: {
    calendarNameById?: Record<string, string>;
  }
): UnifiedCalendarEventVM => {
  const provider = normalizeProvider(item.external?.provider);
  const calendarId =
    item.source === "EXTERNAL" && item.external
      ? String(item.external.calendarId)
      : item.source === "INTERNAL"
      ? "__internal__"
      : null;

  const color = deriveUnifiedEventColor({
    source: item.source,
    provider,
    calendarIdentity: item.external
      ? `${item.external.provider}:${item.external.calendarId}`
      : item.internal
      ? `internal:${item.internal.bookingId}`
      : item.id,
    explicitColor: item.color,
  });

  return {
    id: item.id,
    source: item.source,
    status: item.status,
    start: new Date(item.startTime),
    end: new Date(item.endTime),
    isAllDay: item.isAllDay,
    timeZone: item.timeZone ?? null,
    title: withSafeTitle(item.title),
    description: item.description ?? null,
    location: item.location ?? null,
    meetingUrl: item.meetingUrl ?? null,
    showAsBusy: item.showAsBusy,
    color,
    provider,
    calendarId,
    calendarName: calendarId && options?.calendarNameById ? options.calendarNameById[calendarId] : null,
    external: item.external,
    internal: item.internal,
    attendeeCount: item.internal?.attendeeCount ?? null,
    ...mapCapabilities(item.source),
  };
};

export const mapUnifiedCalendarItemsToVM = (
  items: UnifiedCalendarItem[],
  options?: { calendarNameById?: Record<string, string> }
) => {
  return items.map((item) => mapUnifiedCalendarItemToVM(item, options));
};

export const mapLegacyMockCalendarToVM = (calendar: LegacyMockCalendar): ConnectedCalendarVM => {
  return {
    id: calendar.id,
    credentialId: null,
    providerCalendarId: calendar.id,
    syncProvider: calendar.provider === "google" ? "GOOGLE" : "OUTLOOK",
    name: calendar.name,
    provider: calendar.provider,
    email: calendar.email,
    color: calendar.color,
    syncEnabled: calendar.visible,
    isVisible: true,
    readOnly: false,
  };
};

export const mapLegacyMockEventToVM = (
  event: LegacyMockEvent,
  calendarById: Map<string, LegacyMockCalendar>
): UnifiedCalendarEventVM => {
  const calendar = calendarById.get(event.calendarId);

  return {
    id: event.id,
    source: "EXTERNAL",
    status: "CONFIRMED",
    start: event.start,
    end: event.end,
    isAllDay: false,
    timeZone: null,
    title: withSafeTitle(event.title),
    description: event.description ?? null,
    location: event.location ?? null,
    meetingUrl: event.meetingLink ?? null,
    showAsBusy: true,
    color: calendar?.color ?? PALETTE.neutralGray,
    provider: calendar?.provider ?? null,
    calendarId: event.calendarId,
    calendarName: calendar?.name ?? null,
    attendeeCount: event.attendees.length,
    attendees: event.attendees,
    ...mapCapabilities("EXTERNAL"),
  };
};
