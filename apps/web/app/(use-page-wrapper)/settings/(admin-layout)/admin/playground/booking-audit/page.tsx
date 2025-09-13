"use client";

import { useState } from "react";

import { Button } from "@calcom/ui/components/button";

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
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const openSlideOver = (tab = "details") => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Booking Audit Playground</h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates the booking slide-over component with multiple tabs including audit history.
        </p>
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
  activeTab="audit"               // Open audit tab (undefined = closed)
  onActiveTabChange={setActiveTab}
  booking={bookingData}
  availableTabs={["details", "audit"]}  // Show only these tabs
/>`}
            </pre>
          </div>
        </div>
      </div>

      {/* BookingSlideOver Component */}
      <BookingSlideOver
        activeTab={activeTab as any}
        onActiveTabChange={setActiveTab}
        booking={mockBookingData}
        availableTabs={["details", "edit", "audit"]}
        onBookingUpdate={(updatedBooking) => {
          console.log("Booking updated:", updatedBooking);
          // In real app, would save to backend
        }}
      />
    </div>
  );
}
