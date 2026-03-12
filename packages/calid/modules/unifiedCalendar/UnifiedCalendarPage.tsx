"use client";

import { Alert } from "@calid/features/ui/components/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calid/features/ui/components/sheet";
import { isEqual } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [pendingRescheduleByEventId, setPendingRescheduleByEventId] = useState<Record<string, boolean>>({});
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

  const draggingEvent = useMemo(
    () => (draggingEventId ? filteredEvents.find((event) => event.id === draggingEventId) ?? null : null),
    [draggingEventId, filteredEvents]
  );

  const getConflicts = useCallback(
    (event: UnifiedCalendarEventVM) => getEventConflicts(event, filteredEvents),
    [filteredEvents]
  );

  const viewDays = useMemo(() => getViewDays(currentDate, viewMode), [currentDate, viewMode]);
  const headerTitle = useMemo(() => getHeaderTitle(currentDate, viewMode), [currentDate, viewMode]);

  useEffect(() => {
    if (!draggingEventId) return;
    if (!filteredEvents.some((event) => event.id === draggingEventId)) {
      setDraggingEventId(null);
    }
  }, [draggingEventId, filteredEvents]);

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

  const handleStartDragEvent = useCallback(
    (event: UnifiedCalendarEventVM) => {
      if (!event.canReschedule || !event.internal?.bookingId || pendingRescheduleByEventId[event.id]) {
        return;
      }

      clearActionErrors();
      setDraggingEventId(event.id);
    },
    [pendingRescheduleByEventId]
  );

  const handleEndDragEvent = useCallback(() => {
    setDraggingEventId(null);
  }, []);

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

  const handleDropReschedule = useCallback(
    async (payload: { event: UnifiedCalendarEventVM; start: Date; end: Date }) => {
      const { event, start, end } = payload;
      if (!event.canReschedule || !event.internal?.bookingId || pendingRescheduleByEventId[event.id]) {
        return;
      }

      setDraggingEventId(null);

      if (start >= end) {
        showToast("Invalid time range selected.", "error");
        return;
      }

      if (isEqual(start, event.start) && isEqual(end, event.end)) {
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
      rescheduleBookingMutation,
      setBookingTimeInListCache,
      trpcUtils.viewer.unifiedCalendar.list,
      unifiedCalendarListInput,
    ]
  );

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

        <ScrollArea className="h-[calc(100vh-105px)] flex-1">
          <div className="min-w-0">
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
                onSelectEvent={setSelectedEvent}
                onQuickBookSlot={setQuickBookSlot}
                onSelectDay={(day) => {
                  setCurrentDate(day);
                  setViewMode("day");
                }}
                draggingEvent={draggingEvent}
                pendingRescheduleEventIds={pendingRescheduleEventIds}
                onStartDragEvent={handleStartDragEvent}
                onEndDragEvent={handleEndDragEvent}
                onDropReschedule={handleDropReschedule}
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
