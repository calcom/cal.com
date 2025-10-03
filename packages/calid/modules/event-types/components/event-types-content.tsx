"use client";

import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import React from "react";

import { InfiniteSkeletonLoader } from "@calcom/features/eventtypes/components/SkeletonLoader";

import type { EventTypesContentProps } from "../types/event-types";
import { DraggableEventTypes } from "./draggable-event-type";

export const EventTypesContent: React.FC<EventTypesContentProps> = ({
  isLoading,
  filteredEvents,
  selectedTeam,
  currentTeam,
  eventStates,
  copiedLink,
  bookerUrl,
  debouncedSearchTerm,
  hasNextPage,
  isFetchingNextPage,
  onEventEdit,
  onCopyLink,
  onToggleEvent,
  onDuplicateEvent,
  onDeleteEvent,
  onReorderEvents,
  onLoadMore,
  onCreatePersonal,
  onCreateTeam,
  buttonInViewRef
}) => {
  if (isLoading) {
    return (
      <div className="w-full">
        <InfiniteSkeletonLoader />
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
        <BlankCard
          Icon="search"
          headline={debouncedSearchTerm ? `No events found for "${debouncedSearchTerm}"` : "No events found."}
          description={
            debouncedSearchTerm
              ? "Try adjusting your search terms or create a new event."
              : "Get started by creating your first event."
          }
          buttonText={selectedTeam === "personal" ? "Create an event" : "Create a team event"}
          buttonOnClick={selectedTeam === "personal" ? onCreatePersonal : onCreateTeam}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Event Types List */}
      <div className="w-full">
        <DraggableEventTypes
          events={filteredEvents}
          selectedTeam={selectedTeam}
          currentTeam={currentTeam}
          eventStates={eventStates}
          copiedLink={copiedLink}
          bookerUrl={bookerUrl}
          onEventEdit={onEventEdit}
          onCopyLink={onCopyLink}
          onToggleEvent={onToggleEvent}
          onDuplicateEvent={onDuplicateEvent}
          onDeleteEvent={onDeleteEvent}
          onReorderEvents={onReorderEvents}
        />
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="py-6 text-center" ref={buttonInViewRef.ref}>
          <Button
            onClick={onLoadMore}
            loading={isFetchingNextPage}
            color="minimal"
            className="w-full sm:w-auto">
            Load more
          </Button>
        </div>
      )}
    </div>
  );
};
