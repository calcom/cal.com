import dayjs from "@calcom/dayjs";

import type { CalendarEvent } from "../types/events";

export interface OverlapLayoutConfig {
  baseWidthPercent?: number;
  offsetStepPercent?: number;
  baseZIndex?: number;
}

export interface EventLayout {
  event: CalendarEvent;
  leftOffsetPercent: number;
  widthPercent: number;
  baseZIndex: number;
  groupIndex: number;
  indexInGroup: number;
}

const DEFAULT_CONFIG: Required<OverlapLayoutConfig> = {
  baseWidthPercent: 80,
  offsetStepPercent: 8,
  baseZIndex: 60,
};

/**
 * Sorts events by start time (ascending), then by end time (descending for longer events first)
 */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const startA = dayjs(a.start);
    const startB = dayjs(b.start);
    const startDiff = startA.diff(startB);
    
    if (startDiff !== 0) {
      return startDiff;
    }
    
    const endA = dayjs(a.end);
    const endB = dayjs(b.end);
    return endB.diff(endA);
  });
}

/**
 * Groups overlapping events together using a sweep algorithm
 * Events overlap if one starts before another ends
 */
export function buildOverlapGroups(sortedEvents: CalendarEvent[]): CalendarEvent[][] {
  if (sortedEvents.length === 0) {
    return [];
  }

  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [sortedEvents[0]];
  let currentGroupEnd = dayjs(sortedEvents[0].end);

  for (let i = 1; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventStart = dayjs(event.start);
    const eventEnd = dayjs(event.end);

    if (eventStart.isBefore(currentGroupEnd)) {
      currentGroup.push(event);
      if (eventEnd.isAfter(currentGroupEnd)) {
        currentGroupEnd = eventEnd;
      }
    } else {
      groups.push(currentGroup);
      currentGroup = [event];
      currentGroupEnd = eventEnd;
    }
  }

  groups.push(currentGroup);

  return groups;
}

/**
 * Calculates layout information for all events including position and z-index
 */
export function calculateEventLayouts(
  events: CalendarEvent[],
  config: OverlapLayoutConfig = {}
): EventLayout[] {
  const { baseWidthPercent, offsetStepPercent, baseZIndex } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const sortedEvents = sortEvents(events);
  const groups = buildOverlapGroups(sortedEvents);

  const layouts: EventLayout[] = [];

  groups.forEach((group, groupIndex) => {
    group.forEach((event, indexInGroup) => {
      layouts.push({
        event,
        leftOffsetPercent: indexInGroup * offsetStepPercent,
        widthPercent: baseWidthPercent,
        baseZIndex: baseZIndex + indexInGroup,
        groupIndex,
        indexInGroup,
      });
    });
  });

  return layouts;
}

/**
 * Creates a map from event ID to layout information for quick lookup
 */
export function createLayoutMap(layouts: EventLayout[]): Map<number, EventLayout> {
  const map = new Map<number, EventLayout>();
  layouts.forEach((layout) => {
    map.set(layout.event.id, layout);
  });
  return map;
}
