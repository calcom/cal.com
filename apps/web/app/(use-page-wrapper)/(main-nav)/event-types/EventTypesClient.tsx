"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { ComponentProps } from "react";

import type EventTypesListingView from "~/event-types/views/event-types-listing-view";

type EventTypesViewProps = ComponentProps<typeof EventTypesListingView>;
// Dynamic imports for heavy components
const EventTypes = dynamic(
  () => import("~/event-types/views/event-types-listing-view").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
      </div>
    ),
  }
);

const EventTypesCTA = dynamic(
  () => import("~/event-types/views/event-types-listing-view").then((mod) => mod.EventTypesCTA),
  {
    ssr: false,
    loading: () => <div className="h-12 w-48 animate-pulse rounded bg-gray-200" />,
  }
);

interface EventTypesClientProps extends Pick<EventTypesViewProps, "userEventGroupsData" | "user"> {
  _heading?: string;
  _subtitle?: string;
}

export function EventTypesClient({ userEventGroupsData, user, _heading, _subtitle }: EventTypesClientProps) {
  return (
    <>
      <Suspense fallback={<div className="h-12 w-48 animate-pulse rounded bg-gray-200" />}>
        <EventTypesCTA userEventGroupsData={userEventGroupsData} />
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-24 animate-pulse rounded bg-gray-200" />
            <div className="h-24 animate-pulse rounded bg-gray-200" />
          </div>
        }>
        <EventTypes userEventGroupsData={userEventGroupsData} user={user} />
      </Suspense>
    </>
  );
}
