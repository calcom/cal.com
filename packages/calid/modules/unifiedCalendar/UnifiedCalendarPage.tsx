"use client";

import { Alert } from "@calid/features/ui/components/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calid/features/ui/components/sheet";
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

const UnifiedCalendarPage = () => {
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "day" : "week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<UnifiedCalendarEventVM | null>(null);
  const [rescheduleEvent, setRescheduleEvent] = useState<UnifiedCalendarEventVM | null>(null);
  const [quickBookSlot, setQuickBookSlot] = useState<QuickBookSlot | null>(null);
  const [quickBookingError, setQuickBookingError] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [localCalendarColors, setLocalCalendarColors] = useState<Record<string, string>>({});
  const [optimisticSyncById, setOptimisticSyncById] = useState<Record<string, boolean>>({});
  const [pendingSyncById, setPendingSyncById] = useState<Record<string, boolean>>({});
  const trpcUtils = trpc.useUtils();

  const connectedCalendarsQuery = trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const toggleCalendarSyncMutation = trpc.viewer.unifiedCalendar.toggleCalendarSync.useMutation();
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

  const unifiedCalendarListQuery = trpc.viewer.unifiedCalendar.list.useQuery(
    {
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
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const calendarNameById = useMemo(() => {
    return connectedCalendars.reduce<Record<string, string>>((accumulator, calendar) => {
      if (typeof calendar.externalCalendarId === "number" && Number.isFinite(calendar.externalCalendarId)) {
        accumulator[String(calendar.externalCalendarId)] = calendar.name;
      }
      return accumulator;
    }, {});
  }, [connectedCalendars]);

  const unifiedEvents = useMemo(() => {
    return mapUnifiedCalendarItemsToVM(unifiedCalendarListQuery.data?.items ?? [], {
      calendarNameById,
    });
  }, [calendarNameById, unifiedCalendarListQuery.data?.items]);

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

  const getConflicts = useCallback(
    (event: UnifiedCalendarEventVM) => getEventConflicts(event, filteredEvents),
    [filteredEvents]
  );

  const viewDays = useMemo(() => getViewDays(currentDate, viewMode), [currentDate, viewMode]);
  const headerTitle = useMemo(() => getHeaderTitle(currentDate, viewMode), [currentDate, viewMode]);

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

  const changeCalendarColor = (id: string, color: string) => {
    setLocalCalendarColors((current) => ({ ...current, [id]: color }));
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
        locationCredentialId: draft.locationCredentialId,
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

    setRescheduleError(null);

    try {
      await rescheduleBookingMutation.mutateAsync({
        bookingId: rescheduleEvent.internal.bookingId,
        startTime: payload.start.toISOString(),
        endTime: payload.end.toISOString(),
      });

      await trpcUtils.viewer.unifiedCalendar.list.invalidate();
      showToast("Booking rescheduled.", "success");
      setRescheduleEvent(null);
      setSelectedEvent(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reschedule booking.";
      setRescheduleError(message);
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
        timezone={timezone}
        onChangeTimezone={setTimezone}
        isMobile={isMobile}
      />

      <div className="flex">
        {!isMobile && sidebarOpen && (
          <div className="border-border/20 bg-muted/[0.03] sticky top-[105px] h-[calc(100vh-105px)] w-52 shrink-0 border-r">
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
                <div className="flex min-h-[300px] items-center justify-center p-4">
                  <div className="text-center">
                    <p className="text-foreground/70 text-sm">No events in this range.</p>
                    <p className="text-muted-foreground/60 mt-1 text-xs">
                      Try a different date range or enable synced calendars in the sidebar.
                    </p>
                  </div>
                </div>
              )}

            {!unifiedCalendarListQuery.isPending &&
              !unifiedCalendarListQuery.error &&
              filteredEvents.length > 0 && (
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
                />
              )}
          </div>
        </ScrollArea>
      </div>

      {selectedEvent && !isMobile && (
        <Sheet open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)}>
          <SheetContent className="sm:max-w-sm">
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
          <DialogContent className="max-w-[95vw]">
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
