"use client";

import { Alert } from "@calid/features/ui/components/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calid/features/ui/components/sheet";
import { addMinutes, differenceInMinutes, isEqual, set, startOfDay } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import { useIsMobile } from "../../hooks/use-mobile";
import { QuickBookingDialog } from "./components/QuickBookingDialog";
import { RescheduleBookingDialog } from "./components/RescheduleBookingDialog";
import { UnifiedCalendarEventDetailsPanel } from "./components/UnifiedCalendarEventDetailsPanel";
import { UnifiedCalendarGrid } from "./components/UnifiedCalendarGrid";
import { UnifiedCalendarSidebar } from "./components/UnifiedCalendarSidebar";
import { UnifiedCalendarToolbar } from "./components/UnifiedCalendarToolbar";
import { mapConnectedCalendarsToVM, mapUnifiedCalendarItemsToVM } from "./lib/mappers";
import { getUnifiedCalendarQueryRange } from "./lib/queryRange";
import type {
  QuickBookSlot,
  UnifiedCalendarBookingFormInput,
  UnifiedCalendarEventVM,
  ViewMode,
} from "./lib/types";
import { filterEvents, getEventConflicts, getHeaderTitle, getViewDays, navigateDate } from "./lib/utils";

const UNIFIED_CALENDAR_REFRESH_INTERVAL_MS = 15_000;
const CONNECTED_CALENDARS_REFRESH_INTERVAL_MS = 30_000;
const TIME_GRID_SNAP_MINUTES = 15;
const DRAG_START_THRESHOLD_PX = 4;
const EDGE_NAV_ZONE_PX = 56;
const EDGE_NAV_HOVER_DELAY_MS = 420;
const EDGE_NAV_COOLDOWN_MS = 850;
const EDGE_SCROLL_ZONE_PX = 64;
const EDGE_SCROLL_MAX_STEP_PX = 18;

type DropSurface = "time-grid" | "month-grid";

interface DragSessionState {
  event: UnifiedCalendarEventVM;
  initialPointer: { x: number; y: number };
  pointer: { x: number; y: number };
  isActive: boolean;
}

const compareUnifiedItemsByTime = (
  left: { startTime: string; endTime: string; id: string },
  right: { startTime: string; endTime: string; id: string }
) => {
  const startDiff = Date.parse(left.startTime) - Date.parse(right.startTime);
  if (startDiff !== 0) return startDiff;
  const endDiff = Date.parse(left.endTime) - Date.parse(right.endTime);
  if (endDiff !== 0) return endDiff;
  return left.id.localeCompare(right.id);
};

const normalizeToMinute = (value: Date) => {
  const next = new Date(value);
  next.setSeconds(0, 0);
  return next;
};

const snapToMinutes = (value: Date, snapMinutes: number) => {
  const normalized = normalizeToMinute(value);
  const minutesOfDay = normalized.getHours() * 60 + normalized.getMinutes();
  const snappedMinutesOfDay = Math.floor(minutesOfDay / snapMinutes) * snapMinutes;

  const next = new Date(normalized);
  next.setHours(Math.floor(snappedMinutesOfDay / 60), snappedMinutesOfDay % 60, 0, 0);
  return next;
};

const isMonthCellElement = (value: Element | null): value is HTMLElement => {
  return Boolean(value && value instanceof HTMLElement && value.dataset.unifiedMonthCell === "true");
};

const isTimeColumnElement = (value: Element | null): value is HTMLElement => {
  return Boolean(value && value instanceof HTMLElement && value.dataset.unifiedTimeColumn === "true");
};

const UnifiedCalendarPage = () => {
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "day" : "week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<UnifiedCalendarEventVM | null>(null);
  const [rescheduleEvent, setRescheduleEvent] = useState<UnifiedCalendarEventVM | null>(null);
  const [quickBookSlot, setQuickBookSlot] = useState<QuickBookSlot | null>(null);
  const [quickBookingError, setQuickBookingError] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [localCalendarColors, setLocalCalendarColors] = useState<Record<string, string>>({});
  const [pendingColorById, setPendingColorById] = useState<Record<string, boolean>>({});
  const [optimisticSyncById, setOptimisticSyncById] = useState<Record<string, boolean>>({});
  const [pendingSyncById, setPendingSyncById] = useState<Record<string, boolean>>({});
  const [dragSession, setDragSession] = useState<DragSessionState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ start: Date; end: Date; dropSurface: DropSurface } | null>(
    null
  );
  const [pageFlipIntent, setPageFlipIntent] = useState<"prev" | "next" | null>(null);
  const [verticalScrollIntent, setVerticalScrollIntent] = useState<"up" | "down" | null>(null);
  const [pendingRescheduleByEventId, setPendingRescheduleByEventId] = useState<Record<string, boolean>>({});
  const [suppressSelectUntilTs, setSuppressSelectUntilTs] = useState(0);
  const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const calendarViewportRef = useRef<HTMLDivElement | null>(null);
  const edgeIntentSinceRef = useRef<number | null>(null);
  const lastEdgeNavAtRef = useRef<number>(0);
  const dragSessionRef = useRef<DragSessionState | null>(null);
  const pageFlipIntentRef = useRef<"prev" | "next" | null>(null);
  const verticalScrollIntentRef = useRef<"up" | "down" | null>(null);
  const trpcUtils = trpc.useUtils();

  const connectedCalendarsQuery = trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: CONNECTED_CALENDARS_REFRESH_INTERVAL_MS,
    refetchOnReconnect: true,
  });

  const toggleCalendarSyncMutation = trpc.viewer.unifiedCalendar.toggleCalendarSync.useMutation();
  const updateCalendarColorMutation = trpc.viewer.unifiedCalendar.updateCalendarColor.useMutation();
  const createBookingMutation = trpc.viewer.unifiedCalendar.createBooking.useMutation();
  const rescheduleBookingMutation = trpc.viewer.unifiedCalendar.rescheduleBooking.useMutation();
  const cancelBookingMutation = trpc.viewer.unifiedCalendar.cancelBooking.useMutation();

  useEffect(() => {
    if (isMobile) {
      setViewMode("day");
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    dragSessionRef.current = dragSession;
  }, [dragSession]);

  useEffect(() => {
    pageFlipIntentRef.current = pageFlipIntent;
  }, [pageFlipIntent]);

  useEffect(() => {
    verticalScrollIntentRef.current = verticalScrollIntent;
  }, [verticalScrollIntent]);

  useEffect(() => {
    if (!scrollAreaRootRef.current) return;
    scrollViewportRef.current = scrollAreaRootRef.current.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
  }, []);

  const connectedCalendars = useMemo(() => {
    const mapped = mapConnectedCalendarsToVM(connectedCalendarsQuery.data?.connectedCalendars ?? []);

    return mapped.map((calendar) => ({
      ...calendar,
      color: localCalendarColors[calendar.id] ?? calendar.color,
      syncEnabled:
        optimisticSyncById[calendar.id] !== undefined
          ? optimisticSyncById[calendar.id]
          : calendar.syncEnabled,
    }));
  }, [connectedCalendarsQuery.data?.connectedCalendars, localCalendarColors, optimisticSyncById]);

  const sidebarCalendars = connectedCalendars;

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((value) => navigateDate(value, viewMode, direction));
    },
    [viewMode]
  );

  const queryRange = useMemo(
    () => getUnifiedCalendarQueryRange(viewMode, currentDate),
    [viewMode, currentDate]
  );

  const visibleSyncedExternalCalendarIds = useMemo(() => {
    return Array.from(
      new Set(
        connectedCalendars
          .filter((calendar) => calendar.syncEnabled && calendar.isVisible)
          .map((calendar) => calendar.externalCalendarId)
          .filter(
            (calendarId): calendarId is number =>
              typeof calendarId === "number" && Number.isFinite(calendarId)
          )
      )
    );
  }, [connectedCalendars]);

  const unifiedCalendarListInput = useMemo(
    () => ({
      from: queryRange.from,
      to: queryRange.to,
      cursor: null,
      limit: 300,
      clampEnabled: true,
      includeExternalEvents: true,
      includeCancelledExternal: false,
      includeCancelledInternal: false,
      showAsBusyOnly: false,
      includeExternalCalendarIds:
        visibleSyncedExternalCalendarIds.length > 0 ? visibleSyncedExternalCalendarIds : undefined,
    }),
    [queryRange.from, queryRange.to, visibleSyncedExternalCalendarIds]
  );

  const unifiedCalendarListQuery = trpc.viewer.unifiedCalendar.list.useQuery(unifiedCalendarListInput, {
    refetchOnWindowFocus: false,
    refetchInterval: UNIFIED_CALENDAR_REFRESH_INTERVAL_MS,
    refetchOnReconnect: true,
  });

  const calendarNameById = useMemo(() => {
    return connectedCalendars.reduce<Record<string, string>>((accumulator, calendar) => {
      if (typeof calendar.externalCalendarId === "number" && Number.isFinite(calendar.externalCalendarId)) {
        accumulator[String(calendar.externalCalendarId)] = calendar.name;
      }
      return accumulator;
    }, {});
  }, [connectedCalendars]);

  const calendarColorById = useMemo(() => {
    return connectedCalendars.reduce<Record<string, string>>((accumulator, calendar) => {
      if (typeof calendar.externalCalendarId === "number" && Number.isFinite(calendar.externalCalendarId)) {
        accumulator[String(calendar.externalCalendarId)] = calendar.color;
      }
      return accumulator;
    }, {});
  }, [connectedCalendars]);

  const unifiedEvents = useMemo(() => {
    const mappedEvents = mapUnifiedCalendarItemsToVM(unifiedCalendarListQuery.data?.items ?? [], {
      calendarNameById,
    });

    return mappedEvents.map((event) => {
      if (!event.calendarId) return event;

      const calendarColor = calendarColorById[event.calendarId];
      if (!calendarColor) return event;

      return { ...event, color: calendarColor };
    });
  }, [calendarColorById, calendarNameById, unifiedCalendarListQuery.data?.items]);

  const visibleCalendarIds = useMemo(() => {
    if (visibleSyncedExternalCalendarIds.length > 0) {
      return new Set(visibleSyncedExternalCalendarIds.map((calendarId) => String(calendarId)));
    }

    return new Set(
      unifiedEvents
        .map((event) => event.calendarId)
        .filter((calendarId): calendarId is string => typeof calendarId === "string" && calendarId.length > 0)
    );
  }, [unifiedEvents, visibleSyncedExternalCalendarIds]);

  const filteredEvents = useMemo(
    () => filterEvents(unifiedEvents, visibleCalendarIds, searchQuery),
    [searchQuery, unifiedEvents, visibleCalendarIds]
  );

  const pendingRescheduleEventIds = useMemo(
    () =>
      new Set(
        Object.entries(pendingRescheduleByEventId).flatMap(([id, isPending]) => (isPending ? [id] : []))
      ),
    [pendingRescheduleByEventId]
  );

  const draggingEvent = dragSession?.event ?? null;
  const hasDragSession = Boolean(dragSession);

  const getConflicts = useCallback(
    (event: UnifiedCalendarEventVM) => getEventConflicts(event, filteredEvents),
    [filteredEvents]
  );

  const viewDays = useMemo(() => getViewDays(currentDate, viewMode), [currentDate, viewMode]);
  const headerTitle = useMemo(() => getHeaderTitle(currentDate, viewMode), [currentDate, viewMode]);

  useEffect(() => {
    if (!dragSession?.isActive) return;
    if (pendingRescheduleEventIds.has(dragSession.event.id)) {
      setDragSession(null);
      setDragPreview(null);
      setPageFlipIntent(null);
      setVerticalScrollIntent(null);
    }
  }, [dragSession, pendingRescheduleEventIds]);

  useEffect(() => {
    if (!selectedEvent) return;
    const updated = filteredEvents.find((event) => event.id === selectedEvent.id);
    if (!updated) return;
    if (
      !isEqual(updated.start, selectedEvent.start) ||
      !isEqual(updated.end, selectedEvent.end) ||
      updated.status !== selectedEvent.status
    ) {
      setSelectedEvent(updated);
    }
  }, [filteredEvents, selectedEvent]);

  useEffect(() => {
    if (!rescheduleEvent) return;
    const updated = filteredEvents.find((event) => event.id === rescheduleEvent.id);
    if (!updated) return;
    if (!isEqual(updated.start, rescheduleEvent.start) || !isEqual(updated.end, rescheduleEvent.end)) {
      setRescheduleEvent(updated);
    }
  }, [filteredEvents, rescheduleEvent]);

  const handleSyncToggle = async (id: string, enabled: boolean) => {
    const calendar = sidebarCalendars.find((value) => value.id === id);

    if (!calendar || typeof calendar.credentialId !== "number" || pendingSyncById[id]) {
      return;
    }

    const previousValue = calendar.syncEnabled;

    setOptimisticSyncById((current) => ({ ...current, [id]: enabled }));
    setPendingSyncById((current) => ({ ...current, [id]: true }));

    try {
      await toggleCalendarSyncMutation.mutateAsync({
        provider: calendar.syncProvider,
        credentialId: calendar.credentialId,
        providerCalendarId: calendar.providerCalendarId,
        enabled,
      });

      showToast(
        enabled
          ? "Calendar sync enabled. Events can take a moment to appear."
          : "Calendar sync disabled. Existing merged items may persist briefly.",
        "success"
      );

      await connectedCalendarsQuery.refetch();
      setOptimisticSyncById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (_error) {
      setOptimisticSyncById((current) => ({ ...current, [id]: previousValue }));
      showToast("Failed to update calendar sync. Please try again.", "error");
    } finally {
      setPendingSyncById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  const changeCalendarColor = async (id: string, color: string) => {
    const calendar = sidebarCalendars.find((value) => value.id === id);

    if (!calendar || typeof calendar.credentialId !== "number" || pendingColorById[id] || calendar.readOnly) {
      return;
    }

    const previousColor = calendar.color;

    setPendingColorById((current) => ({ ...current, [id]: true }));
    setLocalCalendarColors((current) => ({ ...current, [id]: color }));

    try {
      await updateCalendarColorMutation.mutateAsync({
        provider: calendar.syncProvider,
        credentialId: calendar.credentialId,
        providerCalendarId: calendar.providerCalendarId,
        color,
      });

      await connectedCalendarsQuery.refetch();
      setLocalCalendarColors((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (_error) {
      setLocalCalendarColors((current) => ({ ...current, [id]: previousColor }));
      showToast("Failed to update calendar color. Please try again.", "error");
    } finally {
      setPendingColorById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  const clearActionErrors = () => {
    setQuickBookingError(null);
    setRescheduleError(null);
    setCancelError(null);
  };

  useEffect(() => {
    if (quickBookSlot) {
      setQuickBookingError(null);
    }
  }, [quickBookSlot]);

  useEffect(() => {
    if (rescheduleEvent) {
      setRescheduleError(null);
    }
  }, [rescheduleEvent]);

  const getCalendarByUiId = (calendarId: string) => {
    return (
      connectedCalendars.find((calendar) => calendar.id === calendarId) ??
      connectedCalendars.find((calendar) => calendar.providerCalendarId === calendarId)
    );
  };

  const setBookingTimeInListCache = useCallback(
    (bookingId: number, startTime: Date, endTime: Date) => {
      trpcUtils.viewer.unifiedCalendar.list.setData(unifiedCalendarListInput, (cachedData) => {
        if (!cachedData) return cachedData;

        let hasUpdates = false;
        const nextItems = cachedData.items
          .map((item) => {
            if (item.source !== "INTERNAL" || item.internal?.bookingId !== bookingId) {
              return item;
            }

            hasUpdates = true;
            return {
              ...item,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
            };
          })
          .sort(compareUnifiedItemsByTime);

        if (!hasUpdates) return cachedData;
        return {
          ...cachedData,
          items: nextItems,
        };
      });
    },
    [trpcUtils.viewer.unifiedCalendar.list, unifiedCalendarListInput]
  );

  const isNoopDropReschedule = useCallback(
    (payload: {
      event: UnifiedCalendarEventVM;
      start: Date;
      end: Date;
      dropSurface: "time-grid" | "month-grid";
    }) => {
      const { event, start, end, dropSurface } = payload;

      if (dropSurface === "time-grid") {
        const originalStart = snapToMinutes(event.start, TIME_GRID_SNAP_MINUTES);
        const droppedStart = snapToMinutes(start, TIME_GRID_SNAP_MINUTES);
        const originalDuration = Math.max(15, differenceInMinutes(event.end, event.start));
        const droppedDuration = Math.max(15, differenceInMinutes(end, start));

        return isEqual(originalStart, droppedStart) && originalDuration === droppedDuration;
      }

      if (event.isAllDay) {
        const originalStart = startOfDay(event.start);
        const droppedStart = startOfDay(start);
        const originalDuration = Math.max(15, differenceInMinutes(event.end, event.start));
        const droppedDuration = Math.max(15, differenceInMinutes(end, start));

        return isEqual(originalStart, droppedStart) && originalDuration === droppedDuration;
      }

      const originalStart = normalizeToMinute(event.start);
      const originalEnd = normalizeToMinute(event.end);
      const droppedStart = normalizeToMinute(start);
      const droppedEnd = normalizeToMinute(end);

      return isEqual(originalStart, droppedStart) && isEqual(originalEnd, droppedEnd);
    },
    []
  );

  const resolveDropPreviewFromPointer = useCallback(
    (
      pointer: { x: number; y: number },
      event: UnifiedCalendarEventVM
    ): { start: Date; end: Date; dropSurface: DropSurface } | null => {
      const elementAtPointer = document.elementFromPoint(pointer.x, pointer.y);
      const monthCell = elementAtPointer?.closest("[data-unified-month-cell='true']") ?? null;
      const timeColumn = elementAtPointer?.closest("[data-unified-time-column='true']") ?? null;
      const durationMinutes = Math.max(15, differenceInMinutes(event.end, event.start));

      if (isTimeColumnElement(timeColumn)) {
        const dayStartRaw = timeColumn.dataset.unifiedDayStart;
        if (!dayStartRaw) return null;

        const dayStart = new Date(dayStartRaw);
        if (Number.isNaN(dayStart.getTime())) return null;

        const bounds = timeColumn.getBoundingClientRect();
        if (bounds.height <= 0) return null;

        const maxStartMinutes = Math.max(0, 1440 - durationMinutes);
        const minutesFromTop = ((pointer.y - bounds.top) / bounds.height) * 1440;
        const clampedMinutes = Math.max(0, Math.min(maxStartMinutes, minutesFromTop));
        const snappedMinutes = Math.floor(clampedMinutes / TIME_GRID_SNAP_MINUTES) * TIME_GRID_SNAP_MINUTES;
        const start = addMinutes(startOfDay(dayStart), snappedMinutes);

        return {
          start,
          end: addMinutes(start, durationMinutes),
          dropSurface: "time-grid",
        };
      }

      if (isMonthCellElement(monthCell)) {
        const dayStartRaw = monthCell.dataset.unifiedDayStart;
        if (!dayStartRaw) return null;

        const dayStart = new Date(dayStartRaw);
        if (Number.isNaN(dayStart.getTime())) return null;

        if (event.isAllDay) {
          const start = startOfDay(dayStart);
          return {
            start,
            end: addMinutes(start, durationMinutes),
            dropSurface: "month-grid",
          };
        }

        const start = set(dayStart, {
          hours: event.start.getHours(),
          minutes: event.start.getMinutes(),
          seconds: 0,
          milliseconds: 0,
        });

        return {
          start,
          end: addMinutes(start, durationMinutes),
          dropSurface: "month-grid",
        };
      }

      return null;
    },
    []
  );

  const handleDropReschedule = useCallback(
    async (payload: { event: UnifiedCalendarEventVM; start: Date; end: Date; dropSurface: DropSurface }) => {
      const { event, start, end } = payload;
      if (!event.canReschedule || !event.internal?.bookingId || pendingRescheduleByEventId[event.id]) {
        return;
      }

      if (start >= end) {
        showToast("Invalid time range selected.", "error");
        return;
      }

      if (isNoopDropReschedule(payload)) {
        return;
      }

      const bookingId = event.internal.bookingId;
      const eventId = event.id;
      const previousData = trpcUtils.viewer.unifiedCalendar.list.getData(unifiedCalendarListInput);

      try {
        await trpcUtils.viewer.unifiedCalendar.list.cancel(unifiedCalendarListInput);
        setPendingRescheduleByEventId((current) => ({ ...current, [eventId]: true }));
        setBookingTimeInListCache(bookingId, start, end);

        await rescheduleBookingMutation.mutateAsync({
          bookingId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });

        showToast("Booking rescheduled.", "success");
        setRescheduleEvent((current) => (current?.id === eventId ? null : current));
        setSelectedEvent((current) => (current?.id === eventId ? null : current));
        void trpcUtils.viewer.unifiedCalendar.list.invalidate();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to reschedule booking.";
        trpcUtils.viewer.unifiedCalendar.list.setData(unifiedCalendarListInput, previousData);
        showToast(message, "error");
      } finally {
        setPendingRescheduleByEventId((current) => {
          const next = { ...current };
          delete next[eventId];
          return next;
        });
      }
    },
    [
      pendingRescheduleByEventId,
      isNoopDropReschedule,
      rescheduleBookingMutation,
      setBookingTimeInListCache,
      trpcUtils.viewer.unifiedCalendar.list,
      unifiedCalendarListInput,
    ]
  );

  const handleStartDragEvent = useCallback(
    (event: UnifiedCalendarEventVM, pointer: { x: number; y: number }) => {
      if (!event.canReschedule || !event.internal?.bookingId || pendingRescheduleByEventId[event.id]) {
        return;
      }

      clearActionErrors();
      setDragSession({
        event,
        initialPointer: pointer,
        pointer,
        isActive: false,
      });
      setDragPreview(null);
      setPageFlipIntent(null);
      setVerticalScrollIntent(null);
      edgeIntentSinceRef.current = null;
    },
    [pendingRescheduleByEventId]
  );

  useEffect(() => {
    if (!hasDragSession) return;

    const updateEdgeIntents = (pointerX: number, pointerY: number) => {
      const viewport = scrollViewportRef.current ?? calendarViewportRef.current;
      if (!viewport) {
        setPageFlipIntent(null);
        setVerticalScrollIntent(null);
        edgeIntentSinceRef.current = null;
        return;
      }

      const bounds = viewport.getBoundingClientRect();
      if (
        pointerY < bounds.top ||
        pointerY > bounds.bottom ||
        pointerX < bounds.left ||
        pointerX > bounds.right
      ) {
        setPageFlipIntent(null);
        setVerticalScrollIntent(null);
        edgeIntentSinceRef.current = null;
        return;
      }

      let nextIntent: "prev" | "next" | null = null;
      if (pointerX <= bounds.left + EDGE_NAV_ZONE_PX) {
        nextIntent = "prev";
      } else if (pointerX >= bounds.right - EDGE_NAV_ZONE_PX) {
        nextIntent = "next";
      }

      if (nextIntent !== pageFlipIntentRef.current) {
        edgeIntentSinceRef.current = nextIntent ? Date.now() : null;
        setPageFlipIntent(nextIntent);
      }

      let nextVerticalIntent: "up" | "down" | null = null;
      if (pointerY <= bounds.top + EDGE_SCROLL_ZONE_PX) {
        if (viewport.scrollTop > 0) {
          nextVerticalIntent = "up";
        }
      } else if (pointerY >= bounds.bottom - EDGE_SCROLL_ZONE_PX) {
        const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
        if (viewport.scrollTop < maxScrollTop) {
          nextVerticalIntent = "down";
        }
      }

      if (nextVerticalIntent !== verticalScrollIntentRef.current) {
        setVerticalScrollIntent(nextVerticalIntent);
      }
    };

    const maybeNavigateByPageFlipIntent = () => {
      const currentSession = dragSessionRef.current;
      if (!currentSession?.isActive) return;

      const currentPageFlipIntent = pageFlipIntentRef.current;
      if (!currentPageFlipIntent) return;
      const intentSince = edgeIntentSinceRef.current;
      if (!intentSince) return;

      const now = Date.now();
      if (now - intentSince < EDGE_NAV_HOVER_DELAY_MS) return;
      if (now - lastEdgeNavAtRef.current < EDGE_NAV_COOLDOWN_MS) return;

      lastEdgeNavAtRef.current = now;
      edgeIntentSinceRef.current = now;
      handleNavigate(currentPageFlipIntent);
    };

    const maybeRunVerticalAutoScroll = () => {
      const currentSession = dragSessionRef.current;
      if (!currentSession?.isActive) return;

      const currentVerticalIntent = verticalScrollIntentRef.current;
      if (!currentVerticalIntent) return;

      const viewport = scrollViewportRef.current ?? calendarViewportRef.current;
      if (!viewport) return;

      const bounds = viewport.getBoundingClientRect();
      const pointerY = currentSession.pointer.y;

      let intensity = 0;
      if (currentVerticalIntent === "up") {
        const depth = bounds.top + EDGE_SCROLL_ZONE_PX - pointerY;
        intensity = Math.max(0, Math.min(1, depth / EDGE_SCROLL_ZONE_PX));
      } else {
        const depth = pointerY - (bounds.bottom - EDGE_SCROLL_ZONE_PX);
        intensity = Math.max(0, Math.min(1, depth / EDGE_SCROLL_ZONE_PX));
      }

      if (intensity <= 0) return;

      const step = Math.max(2, Math.round(2 + intensity * EDGE_SCROLL_MAX_STEP_PX));
      const currentScrollTop = viewport.scrollTop;
      const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const nextScrollTop =
        currentVerticalIntent === "up"
          ? Math.max(0, currentScrollTop - step)
          : Math.min(maxScrollTop, currentScrollTop + step);

      if (nextScrollTop === currentScrollTop) {
        setVerticalScrollIntent(null);
        return;
      }

      viewport.scrollTop = nextScrollTop;

      const nextPreview = resolveDropPreviewFromPointer(currentSession.pointer, currentSession.event);
      setDragPreview(nextPreview);
    };

    const onPointerMove = (event: PointerEvent) => {
      const nextPointer = { x: event.clientX, y: event.clientY };
      let shouldActivate = false;

      setDragSession((current) => {
        if (!current) return null;

        const deltaX = Math.abs(nextPointer.x - current.initialPointer.x);
        const deltaY = Math.abs(nextPointer.y - current.initialPointer.y);
        shouldActivate =
          current.isActive || deltaX > DRAG_START_THRESHOLD_PX || deltaY > DRAG_START_THRESHOLD_PX;

        return {
          ...current,
          pointer: nextPointer,
          isActive: shouldActivate,
        };
      });

      if (shouldActivate) {
        updateEdgeIntents(nextPointer.x, nextPointer.y);
      } else {
        setPageFlipIntent(null);
        setVerticalScrollIntent(null);
        edgeIntentSinceRef.current = null;
      }
    };

    const onPointerUp = () => {
      setDragSession((current) => {
        if (!current) return null;
        if (!current.isActive) return null;

        const dropTarget = resolveDropPreviewFromPointer(current.pointer, current.event);
        if (dropTarget) {
          void handleDropReschedule({
            ...dropTarget,
            event: current.event,
          });
          setSuppressSelectUntilTs(Date.now() + 250);
        }

        return null;
      });

      setDragPreview(null);
      setPageFlipIntent(null);
      setVerticalScrollIntent(null);
      edgeIntentSinceRef.current = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDragSession(null);
      setDragPreview(null);
      setPageFlipIntent(null);
      setVerticalScrollIntent(null);
      edgeIntentSinceRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);

    const edgeLoop = window.setInterval(() => {
      maybeNavigateByPageFlipIntent();
      maybeRunVerticalAutoScroll();
    }, 50);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.clearInterval(edgeLoop);
    };
  }, [hasDragSession, handleDropReschedule, handleNavigate, resolveDropPreviewFromPointer]);

  useEffect(() => {
    if (!dragSession?.isActive) {
      setDragPreview(null);
      return;
    }

    const nextPreview = resolveDropPreviewFromPointer(dragSession.pointer, dragSession.event);
    setDragPreview(nextPreview);
  }, [dragSession, resolveDropPreviewFromPointer, currentDate, viewMode]);

  const handleCreateBooking = async (draft: UnifiedCalendarBookingFormInput) => {
    setQuickBookingError(null);

    const targetCalendar = getCalendarByUiId(draft.calendarId);
    if (!targetCalendar || typeof targetCalendar.credentialId !== "number") {
      const message = "Selected calendar is no longer available for booking creation.";
      setQuickBookingError(message);
      return;
    }

    try {
      await createBookingMutation.mutateAsync({
        title: draft.title,
        attendeeEmails: draft.attendees,
        startTime: draft.start.toISOString(),
        endTime: draft.end.toISOString(),
        targetCalendar: {
          credentialId: targetCalendar.credentialId,
          providerCalendarId: targetCalendar.providerCalendarId,
        },
        location: draft.location,
        locationCredentialId:
          typeof draft.locationCredentialId === "number" && draft.locationCredentialId > 0
            ? draft.locationCredentialId
            : null,
        note: draft.description ?? null,
      });

      await trpcUtils.viewer.unifiedCalendar.list.invalidate();
      showToast("Booking created. It may take a moment to reflect across all calendars.", "success");
      setQuickBookSlot(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create booking.";
      setQuickBookingError(message);
    }
  };

  const handleRescheduleAction = (event: UnifiedCalendarEventVM) => {
    if (!event.canReschedule || !event.internal?.bookingId) return;
    clearActionErrors();
    setRescheduleEvent(event);
  };

  const handleRescheduleBooking = async (payload: { start: Date; end: Date }) => {
    if (!rescheduleEvent?.internal?.bookingId) {
      return;
    }

    if (payload.start >= payload.end) {
      setRescheduleError("Invalid time range selected.");
      return;
    }

    if (isEqual(payload.start, rescheduleEvent.start) && isEqual(payload.end, rescheduleEvent.end)) {
      setRescheduleEvent(null);
      return;
    }

    setRescheduleError(null);
    const bookingId = rescheduleEvent.internal.bookingId;
    const previousData = trpcUtils.viewer.unifiedCalendar.list.getData(unifiedCalendarListInput);
    const eventId = rescheduleEvent.id;

    try {
      await trpcUtils.viewer.unifiedCalendar.list.cancel(unifiedCalendarListInput);
      setPendingRescheduleByEventId((current) => ({ ...current, [eventId]: true }));
      setBookingTimeInListCache(bookingId, payload.start, payload.end);

      await rescheduleBookingMutation.mutateAsync({
        bookingId,
        startTime: payload.start.toISOString(),
        endTime: payload.end.toISOString(),
      });

      showToast("Booking rescheduled.", "success");
      setRescheduleEvent(null);
      setSelectedEvent(null);
      void trpcUtils.viewer.unifiedCalendar.list.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reschedule booking.";
      trpcUtils.viewer.unifiedCalendar.list.setData(unifiedCalendarListInput, previousData);
      setRescheduleError(message);
      showToast(message, "error");
    } finally {
      setPendingRescheduleByEventId((current) => {
        const next = { ...current };
        delete next[eventId];
        return next;
      });
    }
  };

  const handleCancelAction = async (event: UnifiedCalendarEventVM) => {
    if (!event.canDelete || !event.internal?.bookingId) return;
    setCancelError(null);

    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: event.internal.bookingId,
      });

      await trpcUtils.viewer.unifiedCalendar.list.invalidate();
      showToast("Booking cancelled.", "success");
      setSelectedEvent((current) => (current?.id === event.id ? null : current));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel booking.";
      setCancelError(message);
      showToast(message, "error");
    }
  };

  const quickBookingCalendars = connectedCalendars.filter(
    (calendar) => typeof calendar.credentialId === "number" && !calendar.readOnly
  );

  const hoveredMonthDayKey =
    dragPreview?.dropSurface === "month-grid" ? startOfDay(dragPreview.start).toISOString() : null;

  const handleSelectEvent = (event: UnifiedCalendarEventVM) => {
    if (dragSession?.isActive) {
      return;
    }
    if (Date.now() < suppressSelectUntilTs) {
      return;
    }
    setSelectedEvent(event);
  };

  return (
    <div
      className="bg-background min-h-screen"
      data-query-from={queryRange.from}
      data-query-to={queryRange.to}>
      <UnifiedCalendarToolbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
        onToday={() => setCurrentDate(new Date())}
        onPrev={() => handleNavigate("prev")}
        onNext={() => handleNavigate("next")}
        headerTitle={headerTitle}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        isMobile={isMobile}
      />

      <div className="flex">
        {!isMobile && sidebarOpen && (
          <div className="border-border/20 bg-muted/[0.03] w-54 sticky top-[105px] h-[calc(100vh-105px)] shrink-0 border-r">
            <UnifiedCalendarSidebar
              calendars={sidebarCalendars}
              onToggleSync={handleSyncToggle}
              onColorChange={changeCalendarColor}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isLoading={connectedCalendarsQuery.isPending}
              errorMessage={connectedCalendarsQuery.error?.message ?? null}
              pendingSyncCalendarIds={new Set(Object.keys(pendingSyncById))}
            />
          </div>
        )}

        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-4 pt-4">
                <SheetTitle className="text-sm">Calendars</SheetTitle>
              </SheetHeader>
              <UnifiedCalendarSidebar
                calendars={sidebarCalendars}
                onToggleSync={handleSyncToggle}
                onColorChange={changeCalendarColor}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isLoading={connectedCalendarsQuery.isPending}
                errorMessage={connectedCalendarsQuery.error?.message ?? null}
                pendingSyncCalendarIds={new Set(Object.keys(pendingSyncById))}
              />
            </SheetContent>
          </Sheet>
        )}

        <ScrollArea ref={scrollAreaRootRef} className="h-[calc(100vh-105px)] flex-1">
          <div ref={calendarViewportRef} className="relative min-w-0">
            {dragSession?.isActive && (
              <>
                {pageFlipIntent === "prev" && (
                  <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-40 w-16">
                    <div className="from-primary/35 via-primary/18 to-primary/0 flex h-full w-full items-center justify-start bg-gradient-to-r pl-1.5">
                      <div className="border-primary/45 bg-background/92 text-primary animate-pulse rounded-md border px-1.5 py-1 shadow-sm backdrop-blur-[1px]">
                        <ChevronLeft className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                )}
                {pageFlipIntent === "next" && (
                  <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-40 w-16">
                    <div className="from-primary/35 via-primary/18 to-primary/0 flex h-full w-full items-center justify-end bg-gradient-to-l pr-1.5">
                      <div className="border-primary/45 bg-background/92 text-primary animate-pulse rounded-md border px-1.5 py-1 shadow-sm backdrop-blur-[1px]">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                )}
                {verticalScrollIntent === "up" && (
                  <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 h-16">
                    <div className="from-accent/35 via-accent/16 to-accent/0 flex h-full w-full items-start justify-center bg-gradient-to-b pt-1.5">
                      <div className="border-accent/45 bg-background/92 text-foreground animate-pulse rounded-md border px-1.5 py-1 shadow-sm backdrop-blur-[1px]">
                        <ChevronUp className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                )}
                {verticalScrollIntent === "down" && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 h-16">
                    <div className="from-accent/35 via-accent/16 to-accent/0 flex h-full w-full items-end justify-center bg-gradient-to-t pb-1.5">
                      <div className="border-accent/45 bg-background/92 text-foreground animate-pulse rounded-md border px-1.5 py-1 shadow-sm backdrop-blur-[1px]">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                )}
                <div
                  className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 shadow-md"
                  style={{
                    left: dragSession.pointer.x + 14,
                    top: dragSession.pointer.y + 14,
                  }}>
                  <p className="max-w-[220px] truncate text-xs font-medium">{dragSession.event.title}</p>
                </div>
              </>
            )}

            {unifiedCalendarListQuery.isPending && (
              <div className="space-y-3 p-4">
                <div className="bg-muted h-12 animate-pulse rounded-md" />
                <div className="bg-muted h-32 animate-pulse rounded-md" />
                <div className="bg-muted h-32 animate-pulse rounded-md" />
              </div>
            )}

            {!unifiedCalendarListQuery.isPending && unifiedCalendarListQuery.error && (
              <div className="p-4">
                <Alert
                  severity="error"
                  title="Failed to load unified events"
                  message={unifiedCalendarListQuery.error.message}
                />
              </div>
            )}

            {!unifiedCalendarListQuery.isPending &&
              !unifiedCalendarListQuery.error &&
              filteredEvents.length === 0 && (
                <div className="px-4 pt-3">
                  <p className="text-muted-foreground/70 text-xs">No events in this range.</p>
                </div>
              )}

            {!unifiedCalendarListQuery.isPending && !unifiedCalendarListQuery.error && (
              <UnifiedCalendarGrid
                viewMode={viewMode}
                currentDate={currentDate}
                viewDays={viewDays}
                filteredEvents={filteredEvents}
                getConflicts={getConflicts}
                onSelectEvent={handleSelectEvent}
                onQuickBookSlot={setQuickBookSlot}
                onSelectDay={(day) => {
                  setCurrentDate(day);
                  setViewMode("day");
                }}
                draggingEvent={draggingEvent}
                pendingRescheduleEventIds={pendingRescheduleEventIds}
                dragPreview={dragPreview}
                hoveredMonthDayKey={hoveredMonthDayKey}
                onStartDragEvent={handleStartDragEvent}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {selectedEvent && !isMobile && (
        <Sheet open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)}>
          <SheetContent className="bg-default sm:max-w-sm">
            <SheetHeader>
              <SheetTitle className="text-sm">Event Details</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {cancelError && <Alert severity="error" message={cancelError} className="mb-3" />}
              <UnifiedCalendarEventDetailsPanel
                event={selectedEvent}
                onReschedule={() => handleRescheduleAction(selectedEvent)}
                onCancel={() => handleCancelAction(selectedEvent)}
                conflicts={getConflicts(selectedEvent)}
                isReschedulePending={rescheduleBookingMutation.isPending}
                isCancelPending={cancelBookingMutation.isPending}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {selectedEvent && isMobile && (
        <Dialog open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="bg-default max-w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-sm">Event Details</DialogTitle>
            </DialogHeader>
            {cancelError && <Alert severity="error" message={cancelError} className="mb-2" />}
            <UnifiedCalendarEventDetailsPanel
              event={selectedEvent}
              onReschedule={() => handleRescheduleAction(selectedEvent)}
              onCancel={() => handleCancelAction(selectedEvent)}
              conflicts={getConflicts(selectedEvent)}
              isReschedulePending={rescheduleBookingMutation.isPending}
              isCancelPending={cancelBookingMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      <QuickBookingDialog
        open={Boolean(quickBookSlot)}
        slot={quickBookSlot}
        isMobile={isMobile}
        calendars={quickBookingCalendars}
        isSubmitting={createBookingMutation.isPending}
        submitError={quickBookingError ?? createBookingMutation.error?.message ?? null}
        onClose={() => setQuickBookSlot(null)}
        onSubmit={handleCreateBooking}
      />

      <RescheduleBookingDialog
        open={Boolean(rescheduleEvent)}
        event={rescheduleEvent}
        isMobile={isMobile}
        isSubmitting={rescheduleBookingMutation.isPending}
        submitError={rescheduleError ?? rescheduleBookingMutation.error?.message ?? null}
        onClose={() => setRescheduleEvent(null)}
        onSubmit={handleRescheduleBooking}
      />
    </div>
  );
};

export default UnifiedCalendarPage;
