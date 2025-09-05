"use client";

import { Icon } from "@calid/features/ui/components/icon/Icon";
import type { DragEndEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import React, { useState } from "react";

import { EventTypeDescription } from "@calcom/features/eventtypes/components";

import type { DraggableEventTypesProps } from "../types/event-types";
import { DraggableEventCard } from "./draggable-event-card";

export const DraggableEventTypes: React.FC<DraggableEventTypesProps> = ({
  events,
  selectedTeam,
  currentTeam,
  eventStates,
  copiedLink,
  bookerUrl,
  onEventEdit,
  onCopyLink,
  onToggleEvent,
  onDuplicateEvent,
  onDeleteEvent,
  onReorderEvents,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = events.findIndex((event) => event.id === active.id);
    const overIndex = events.findIndex((event) => event.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newEvents = arrayMove(events, activeIndex, overIndex);
      onReorderEvents(newEvents);
    }
  };

  const activeEvent = activeId ? events.find((event) => event.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}>
      <SortableContext items={events.map((event) => event.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {events.map((event) => {
            const isEventActive = eventStates[event.id] ?? !event.hidden;
            return (
              <DraggableEventCard
                key={event.id}
                event={event}
                selectedTeam={selectedTeam}
                currentTeam={currentTeam}
                isEventActive={isEventActive}
                copiedLink={copiedLink}
                bookerUrl={bookerUrl}
                onEventEdit={onEventEdit}
                onCopyLink={onCopyLink}
                onToggleEvent={onToggleEvent}
                onDuplicateEvent={onDuplicateEvent}
                onDeleteEvent={onDeleteEvent}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeEvent ? (
          <div className="bg-card border-border scale-105 rounded-md border p-3 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-1 items-start space-x-2">
                <div className="bg-muted/50 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md">
                  <Icon name="user" className="text-muted-foreground h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-foreground mb-1 text-sm font-semibold">{activeEvent.title}</h3>
                  <EventTypeDescription eventType={activeEvent} shortenDescription className="mb-2 text-xs" />
                  <div className="flex items-center">
                    <span className="bg-muted text-foreground inline-flex items-center rounded px-1.5 py-0.5 text-xs">
                      <Icon name="clock" className="mr-0.5 h-2.5 w-2.5" />
                      {activeEvent.length}m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
