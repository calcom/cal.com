import dayjs from "@calcom/dayjs";

import type { CalendarEvent } from "../types/events";

export interface OverlapLayoutConfig {
  baseWidthPercent?: number;
  offsetStepPercent?: number;
  baseZIndex?: number;
  safetyMarginPercent?: number;
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
  offsetStepPercent: 8, // This will be dynamically adjusted based on group size
  baseZIndex: 60,
  safetyMarginPercent: 0.5,
};

/**
 * Calculates the optimal offset step percentage based on the number of overlapping events
 * More events = smaller offset for tighter packing
 * Fewer events = larger offset for better visual distinction
 * 
 * @param groupSize - Number of overlapping events in the group
 * @param baseOffsetStep - The base offset step percentage (default 8%)
 * @returns The calculated offset step percentage
 */
function calculateDynamicOffsetStep(groupSize: number, baseOffsetStep: number): number {
  if (groupSize <= 1) {
    return 0;
  }
  
  if (groupSize === 2) {
    return 15;
  }
  
  if (groupSize === 3) {
    return 10;
  }
  
  if (groupSize === 4) {
    return baseOffsetStep;
  }
  
  return Math.max(3, baseOffsetStep * (4 / groupSize));
}

/**
 * Calculates the optimal width percentage based on the number of overlapping events
 * More events = narrower width for better distinction
 * Fewer events = wider width
 * 
 * @param groupSize - Number of overlapping events in the group
 * @param baseWidth - The base width percentage (default 80%)
 * @returns The calculated width percentage
 */
function calculateDynamicWidth(groupSize: number, baseWidth: number): number {
  if (groupSize <= 1) {
    return baseWidth;
  }
  
  if (groupSize === 2) {
    return 75;
  }
  
  if (groupSize === 3) {
    return 70;
  }
  
  if (groupSize === 4) {
    return 65;
  }
  
  return Math.max(50, 65 - (groupSize - 4) * 2);
}

/**
 * Rounds a number to 3 decimal places using standard rounding
 */
function round3(value: number): number {
  return Number(value.toFixed(3));
}

/**
 * Floors a number to 3 decimal places (always rounds down)
 */
function floor3(value: number): number {
  return Math.floor(value * 1000) / 1000;
}

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
 * Dynamically adjusts offset step to prevent overflow when many events overlap
 * Uses safety margin and floor rounding to guarantee no overflow even with CSS box model effects
 */
export function calculateEventLayouts(
  events: CalendarEvent[],
  config: OverlapLayoutConfig = {}
): EventLayout[] {
  const { baseWidthPercent, offsetStepPercent, baseZIndex, safetyMarginPercent } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const sortedEvents = sortEvents(events);
  const groups = buildOverlapGroups(sortedEvents);

  const layouts: EventLayout[] = [];

  groups.forEach((group, groupIndex) => {
    const groupSize = group.length;
    
    const dynamicWidth = calculateDynamicWidth(groupSize, baseWidthPercent);
    const allowedOffsetSpace = Math.max(0, 100 - dynamicWidth - safetyMarginPercent);
    
    const dynamicOffsetStep = calculateDynamicOffsetStep(groupSize, offsetStepPercent);
    
    const stepUsed = Math.min(
      dynamicOffsetStep,
      allowedOffsetSpace / Math.max(1, groupSize - 1)
    );

    group.forEach((event, indexInGroup) => {
      const leftRaw = indexInGroup * stepUsed;
      const left = round3(leftRaw);
      
      const maxWidthCap = 100 - left - safetyMarginPercent;
      const widthCap = Math.min(dynamicWidth, maxWidthCap);
      
      const width = floor3(Math.max(0, widthCap));

      layouts.push({
        event,
        leftOffsetPercent: left,
        widthPercent: width,
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
