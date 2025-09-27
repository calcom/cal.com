"use client";

import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";

import { BookingDetailsTab, BookingEditTab, BookingAuditTab } from "./tabs";
import type { BookingSlideOverProps, BookingTab, BookingTabId } from "./types";

export function BookingSlideOver({
  activeTab,
  onActiveTabChange,
  booking,
  availableTabs = ["details", "edit", "audit"],
  onBookingUpdate,
}: BookingSlideOverProps) {
  const { t } = useLocale();

  const isOpen = activeTab !== undefined;
  const currentTab = activeTab || "details";

  // Define all available tabs with their configurations
  const allTabs: Record<BookingTabId, BookingTab> = useMemo(
    () => ({
      details: {
        id: "details",
        label: "Details",
        icon: "info",
        component: BookingDetailsTab,
      },
      edit: {
        id: "edit",
        label: "Edit",
        icon: "edit",
        component: BookingEditTab,
      },
      audit: {
        id: "audit",
        label: "Audit History",
        icon: "activity",
        component: BookingAuditTab,
      },
      notes: {
        id: "notes",
        label: "Notes",
        icon: "file-text",
        component: () => (
          <div className="text-subtle mt-6 flex-1 p-8 text-center">
            <p>Notes functionality coming soon...</p>
          </div>
        ),
      },
    }),
    []
  );

  // Filter tabs based on availableTabs prop
  const visibleTabs = useMemo(() => {
    return availableTabs.map((tabId) => allTabs[tabId as BookingTabId]).filter(Boolean);
  }, [availableTabs, allTabs]);

  const toggleGroupOptions = useMemo(() => {
    return visibleTabs.map((tab) => ({
      value: tab.id,
      label: tab.label,
      iconLeft: tab.icon ? <Icon name={tab.icon as any} className="h-4 w-4" /> : undefined,
      disabled: tab.disabled,
    }));
  }, [visibleTabs]);

  // Get the active tab component
  const ActiveTabComponent = useMemo(() => {
    const tab = visibleTabs.find((t) => t.id === currentTab);
    return tab?.component || BookingDetailsTab;
  }, [visibleTabs, currentTab]);

  // Format booking title with date
  const bookingTitle = useMemo(() => {
    const date = booking.startTime.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const time = booking.startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${booking.title} • ${date}, ${time}`;
  }, [booking]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onActiveTabChange(undefined);
        }
      }}>
      <SheetContent className="w-[95vw] max-w-2xl">
        <SheetHeader>
          <SheetTitle>{bookingTitle}</SheetTitle>
          <div className="text-subtle flex items-center gap-2 text-sm">
            <Icon name="calendar" className="h-4 w-4" />
            {booking.duration} min • {booking.attendees.length} attendee
            {booking.attendees.length !== 1 ? "s" : ""}
          </div>
        </SheetHeader>

        <div className="mt-6 flex h-full flex-col">
          {/* Tab Navigation */}
          <ToggleGroup
            value={currentTab}
            onValueChange={(value) => {
              if (value) {
                onActiveTabChange(value as BookingTabId);
              }
            }}
            options={toggleGroupOptions}
            isFullWidth
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <ActiveTabComponent booking={booking} onBookingUpdate={onBookingUpdate} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
