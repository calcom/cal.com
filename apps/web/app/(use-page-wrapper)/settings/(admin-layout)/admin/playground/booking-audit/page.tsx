"use client";

import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import { BookingSlideOver, type BookingData } from "./components/BookingSlideOver";

// Mock booking data for the playground
const mockBookingData: BookingData = {
  id: "booking-123",
  title: "Elana x Marie Louise - Deel Demo",
  description: "Demo meeting for Deel integration discussion",
  startTime: new Date(2025, 5, 13, 9, 0), // June 13, 2025, 9:00 AM
  endTime: new Date(2025, 5, 13, 9, 20), // June 13, 2025, 9:20 AM
  duration: 20,
  status: "confirmed",
  attendees: [
    {
      name: "Elana Rodriguez",
      email: "elana@company.com",
      role: "host",
    },
    {
      name: "Marie Louise",
      email: "marie@guest.com",
      role: "guest",
    },
  ],
};

export default function BookingAuditPlayground() {
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>("audit");

  const openSlideOver = (tab = "details") => {
    setDefaultTab(tab);
    setSlideOverOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Booking Audit Playground</h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates the booking slide-over component with multiple tabs including audit history.
        </p>
      </div>

      {/* Mock Booking Header */}
      <div className="bg-default border-muted rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{mockBookingData.title}</h2>
            <div className="text-subtle flex items-center gap-2 text-sm">
              <Icon name="calendar" className="h-4 w-4" />
              Thu, 13 June, 9:00am • {mockBookingData.duration} min
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => openSlideOver("details")} color="secondary">
              View Details
            </Button>
            <Button onClick={() => openSlideOver("edit")} color="secondary">
              Edit Booking
            </Button>
            <Button onClick={() => openSlideOver("audit")}>View Audit</Button>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-muted rounded-lg p-4">
        <h3 className="mb-2 text-lg font-semibold">BookingSlideOver Features</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 text-green-500" />
            <span>
              <strong>Multiple Tabs:</strong> Details, Edit, Audit History, and extensible for more
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 text-green-500" />
            <span>
              <strong>Default Tab Selection:</strong> Open directly to any specific tab
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 text-green-500" />
            <span>
              <strong>Tab Filtering:</strong> Show only relevant tabs using availableTabs prop
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 text-green-500" />
            <span>
              <strong>Extracted Components:</strong> Each tab is a separate, reusable component
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 text-green-500" />
            <span>
              <strong>Enhanced PanelCard:</strong> Function-based titles with i18n support
            </span>
          </li>
        </ul>
      </div>

      {/* Usage Examples */}
      <div className="bg-muted rounded-lg p-4">
        <h3 className="mb-2 text-lg font-semibold">Usage Examples</h3>
        <div className="space-y-3">
          <div>
            <strong className="text-sm">Open specific tab:</strong>
            <div className="mt-1 flex items-center gap-2">
              <Button size="sm" color="secondary" onClick={() => openSlideOver("details")}>
                Details Tab
              </Button>
              <Button size="sm" color="secondary" onClick={() => openSlideOver("edit")}>
                Edit Tab
              </Button>
              <Button size="sm" color="secondary" onClick={() => openSlideOver("audit")}>
                Audit Tab
              </Button>
            </div>
          </div>

          <div className="text-sm">
            <strong>API Example:</strong>
            <pre className="bg-default text-subtle mt-2 overflow-auto rounded p-2 text-xs">
              {`<BookingSlideOver
  open={isOpen}
  onOpenChange={setIsOpen}
  booking={bookingData}
  defaultTab="audit"              // Open audit tab by default
  availableTabs={["details", "audit"]}  // Show only these tabs
/>`}
            </pre>
          </div>
        </div>
      </div>

      {/* BookingSlideOver Component */}
      <BookingSlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        booking={mockBookingData}
        defaultTab={defaultTab}
        availableTabs={["details", "edit", "audit"]}
        onBookingUpdate={(updatedBooking) => {
          console.log("Booking updated:", updatedBooking);
          // In real app, would save to backend
        }}
      />
    </div>
  );
}
