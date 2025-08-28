"use client";

import { Button } from "@calid/features/ui";
import React from "react";

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
}) => {
  // if (isLoading) {
  //   return <div className="p-4">Loading events...</div>;
  // }

  if (filteredEvents.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          {debouncedSearchTerm ? "No events found for your search." : "No events found."}
        </p>
        {!currentTeam?.metadata?.readOnly && (
          <div>
            {selectedTeam === "personal" ? (
              <Button onClick={onCreatePersonal} className="mt-4" color="minimal">
                Create your first event
              </Button>
            ) : (
              <Button onClick={onCreateTeam} className="mt-4" color="minimal">
                Create your first team event
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
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

      {/* Load More Button */}
      {hasNextPage && (
        <div className="py-4 text-center">
          <Button onClick={onLoadMore} loading={isFetchingNextPage} color="minimal">
            {hasNextPage ? "Load more" : "No more results"}
          </Button>
        </div>
      )}
    </div>
  );
};
