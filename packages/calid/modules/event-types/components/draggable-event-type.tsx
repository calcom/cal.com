"use client";

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
          <div className="scale-105 shadow-2xl">
            <DraggableEventCard
              event={activeEvent}
              selectedTeam={selectedTeam}
              currentTeam={currentTeam}
              isEventActive={eventStates[activeEvent.id] ?? !activeEvent.hidden}
              copiedLink={copiedLink}
              bookerUrl={bookerUrl}
              onEventEdit={onEventEdit}
              onCopyLink={onCopyLink}
              onToggleEvent={onToggleEvent}
              onDuplicateEvent={onDuplicateEvent}
              onDeleteEvent={onDeleteEvent}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
