"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calid/features/ui/components/sheet";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useIsMobile } from "../../hooks/use-mobile";
import { QuickBookingDialog } from "./components/QuickBookingDialog";
import { UnifiedCalendarEventDetailsPanel } from "./components/UnifiedCalendarEventDetailsPanel";
import { UnifiedCalendarGrid } from "./components/UnifiedCalendarGrid";
import { UnifiedCalendarSidebar } from "./components/UnifiedCalendarSidebar";
import { UnifiedCalendarToolbar } from "./components/UnifiedCalendarToolbar";
import { generateMockData } from "./lib/mockData";
import type { CalendarEvent, CalendarSource, QuickBookSlot, ViewMode } from "./lib/types";
import {
  createCalendarMap,
  filterEvents,
  getEventConflicts,
  getHeaderTitle,
  getViewDays,
  navigateDate,
} from "./lib/utils";

const UnifiedCalendarPage = () => {
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "day" : "week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendars, setCalendars] = useState<CalendarSource[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [quickBookSlot, setQuickBookSlot] = useState<QuickBookSlot | null>(null);

  useEffect(() => {
    const mockData = generateMockData();
    setCalendars(mockData.calendars);
    setEvents(mockData.events);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setViewMode("day");
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((value) => navigateDate(value, viewMode, direction));
    },
    [viewMode]
  );

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id)),
    [calendars]
  );

  const filteredEvents = useMemo(
    () => filterEvents(events, visibleCalendarIds, searchQuery),
    [events, visibleCalendarIds, searchQuery]
  );

  const getConflicts = useCallback(
    (event: CalendarEvent) => getEventConflicts(event, filteredEvents),
    [filteredEvents]
  );

  const viewDays = useMemo(() => getViewDays(currentDate, viewMode), [currentDate, viewMode]);
  const headerTitle = useMemo(() => getHeaderTitle(currentDate, viewMode), [currentDate, viewMode]);

  const toggleCalendar = (id: string) => {
    setCalendars((current) =>
      current.map((calendar) => (calendar.id === id ? { ...calendar, visible: !calendar.visible } : calendar))
    );
  };

  const changeCalendarColor = (id: string, color: string) => {
    setCalendars((current) =>
      current.map((calendar) => (calendar.id === id ? { ...calendar, color } : calendar))
    );
  };

  const addEvent = (event: Omit<CalendarEvent, "id">) => {
    setEvents((current) => [...current, { ...event, id: `e-${Date.now()}` }]);
  };

  const deleteEvent = (id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id));
    setSelectedEvent(null);
  };

  const calendarMap = useMemo(() => createCalendarMap(calendars), [calendars]);

  const selectedEventCalendar = selectedEvent ? calendarMap.get(selectedEvent.calendarId) ?? null : null;

  return (
    <div className="bg-background min-h-screen">
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
              calendars={calendars}
              onToggle={toggleCalendar}
              onColorChange={changeCalendarColor}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
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
                calendars={calendars}
                onToggle={toggleCalendar}
                onColorChange={changeCalendarColor}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </SheetContent>
          </Sheet>
        )}

        <ScrollArea className="h-[calc(100vh-105px)] flex-1">
          <div className="min-w-0">
            <UnifiedCalendarGrid
              viewMode={viewMode}
              currentDate={currentDate}
              viewDays={viewDays}
              filteredEvents={filteredEvents}
              calendarMap={calendarMap}
              getConflicts={getConflicts}
              onSelectEvent={setSelectedEvent}
              onQuickBookSlot={setQuickBookSlot}
              onSelectDay={(day) => {
                setCurrentDate(day);
                setViewMode("day");
              }}
            />
          </div>
        </ScrollArea>
      </div>

      {selectedEvent && selectedEventCalendar && !isMobile && (
        <Sheet open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)}>
          <SheetContent className="sm:max-w-sm">
            <SheetHeader>
              <SheetTitle className="text-sm">Event Details</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <UnifiedCalendarEventDetailsPanel
                event={selectedEvent}
                calendar={selectedEventCalendar}
                onEdit={() => {
                  //intentionally empty for now
                }}
                onDelete={() => deleteEvent(selectedEvent.id)}
                conflicts={getConflicts(selectedEvent)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {selectedEvent && selectedEventCalendar && isMobile && (
        <Dialog open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-sm">Event Details</DialogTitle>
            </DialogHeader>
            <UnifiedCalendarEventDetailsPanel
              event={selectedEvent}
              calendar={selectedEventCalendar}
              onEdit={() => {
                //intentionally empty for now
              }}
              onDelete={() => deleteEvent(selectedEvent.id)}
              conflicts={getConflicts(selectedEvent)}
            />
          </DialogContent>
        </Dialog>
      )}

      <QuickBookingDialog
        open={Boolean(quickBookSlot)}
        slot={quickBookSlot}
        isMobile={isMobile}
        calendars={calendars.filter((calendar) => calendar.visible)}
        onClose={() => setQuickBookSlot(null)}
        onSubmit={addEvent}
      />
    </div>
  );
};

export default UnifiedCalendarPage;
