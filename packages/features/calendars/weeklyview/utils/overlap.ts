import dayjs from "@calcom/dayjs";

import type { CalendarEvent } from "../types/events";

export interface OverlapLayoutConfig {
  baseZIndex?: number;
  safetyMarginPercent?: number;
  minWidthPercent?: number;
  curveExponent?: number;
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
  baseZIndex: 60,
  safetyMarginPercent: 0.5,
  minWidthPercent: 25,
  curveExponent: 1.3,
};

/**
 * Calculates variable widths for each event in a cascade based on position
 * Leftmost (longest) events get more width, rightmost (shortest) get less width
 * Uses anchor points for 2-4 events and smooth easing curve for 5+ events
 *
 * @param groupSize - Number of overlapping events in the group
 * @param minWidthPercent - Minimum width to maintain readability (default 25%)
 * @param curveExponent - Easing curve exponent for width distribution (default 1.3)
 * @returns Array of width percentages, one for each position in the cascade
 */
function calculateVariableWidths(
  groupSize: number,
  minWidthPercent: number,
  curveExponent: number
): number[] {
  if (groupSize <= 1) {
    return [100]; // Single event gets full width (100%)
  }

  // Define anchor points for first and last widths based on group size
  let wFirst: number;
  let wLast: number;

  if (groupSize === 2) {
    wFirst = 80;
    wLast = 50;
  } else if (groupSize === 3) {
    wFirst = 55;
    wLast = 33;
  } else if (groupSize === 4) {
    wFirst = 40;
    wLast = 25;
  } else {
    wFirst = Math.max(30, 40 - 3 * (groupSize - 4));
    wLast = minWidthPercent;
  }

  const widths: number[] = [];
  for (let i = 0; i < groupSize; i++) {
    const t = groupSize > 1 ? i / (groupSize - 1) : 0;
    const easedT = Math.pow(1 - t, curveExponent);
    const width = wLast + (wFirst - wLast) * easedT;
    widths.push(Math.max(minWidthPercent, width));
  }

  return widths;
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
 * Uses variable widths and spreads events across full width with last event aligned to right edge
 */
export function calculateEventLayouts(
  events: CalendarEvent[],
  config: OverlapLayoutConfig = {}
): EventLayout[] {
  const { baseZIndex, safetyMarginPercent, minWidthPercent, curveExponent } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const sortedEvents = sortEvents(events);
  const groups = buildOverlapGroups(sortedEvents);

  const layouts: EventLayout[] = [];

  groups.forEach((group, groupIndex) => {
    const groupSize = group.length;

    const widths = calculateVariableWidths(groupSize, minWidthPercent, curveExponent);
    const Rmax = 100 - safetyMarginPercent;

    if (groupSize === 1) {
      const width = floor3(Math.min(widths[0], Rmax));
      layouts.push({
        event: group[0],
        leftOffsetPercent: 0,
        widthPercent: width,
        baseZIndex: baseZIndex,
        groupIndex,
        indexInGroup: 0,
      });
    } else {
      const Rmin = widths[0];

      group.forEach((event, indexInGroup) => {
        const t = indexInGroup / (groupSize - 1);
        const ri = Rmin + (Rmax - Rmin) * t;
        const leftRaw = ri - widths[indexInGroup];
        const left = round3(leftRaw);

        const maxWidthCap = Rmax - left;
        const widthCap = Math.min(widths[indexInGroup], maxWidthCap);
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
    }
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
