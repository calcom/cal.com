"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Import the valid status types - use import type for type-only imports
import type { validStatuses } from "~/bookings/lib/validStatuses";

// Create a type for the status
type BookingStatus = (typeof validStatuses)[number];

// Dynamic imports for heavy components
const BookingsList = dynamic(
  () => import("~/bookings/views/bookings-listing-view").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded bg-gray-200" />
      </div>
    ),
  }
);

interface BookingsClientProps {
  status: BookingStatus;
  userId?: number;
}

export function BookingsClient({ status, userId }: BookingsClientProps) {
  return (
    <div className="space-y-6">
      {/* Main bookings list */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded bg-gray-200" />
            <div className="h-32 animate-pulse rounded bg-gray-200" />
            <div className="h-32 animate-pulse rounded bg-gray-200" />
          </div>
        }>
        <BookingsList status={status} userId={userId} />
      </Suspense>
    </div>
  );
}
