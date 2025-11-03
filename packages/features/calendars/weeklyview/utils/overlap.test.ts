import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "../types/events";
import {
  buildOverlapGroups,
  calculateEventLayouts,
  createLayoutMap,
  sortEvents,
} from "./overlap";

describe("overlap utility", () => {
  describe("sortEvents", () => {
    it("should sort events by start time ascending", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T09:00:00"), end: new Date("2024-01-01T10:00:00") },
        { id: 3, title: "Event 3", start: new Date("2024-01-01T11:00:00"), end: new Date("2024-01-01T12:00:00") },
      ];

      const sorted = sortEvents(events);

      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(3);
    });

    it("should sort events with same start time by end time descending (longer first)", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T12:00:00") },
        { id: 3, title: "Event 3", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T10:30:00") },
      ];

      const sorted = sortEvents(events);

      expect(sorted[0].id).toBe(2); // Longest (2 hours)
      expect(sorted[1].id).toBe(1); // Medium (1 hour)
      expect(sorted[2].id).toBe(3); // Shortest (30 min)
    });

    it("should not mutate the original array", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T09:00:00"), end: new Date("2024-01-01T10:00:00") },
      ];

      const originalFirstId = events[0].id;
      sortEvents(events);

      expect(events[0].id).toBe(originalFirstId);
    });
  });

  describe("buildOverlapGroups", () => {
    it("should return empty array for no events", () => {
      const groups = buildOverlapGroups([]);
      expect(groups).toEqual([]);
    });

    it("should return single group for single event", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
      ];

      const groups = buildOverlapGroups(events);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(1);
      expect(groups[0][0].id).toBe(1);
    });

    it("should group two overlapping events together", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:30:00"), end: new Date("2024-01-01T11:30:00") },
      ];

      const sorted = sortEvents(events);
      const groups = buildOverlapGroups(sorted);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(2);
      expect(groups[0][0].id).toBe(1);
      expect(groups[0][1].id).toBe(2);
    });

    it("should separate non-overlapping events into different groups", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T11:00:00"), end: new Date("2024-01-01T12:00:00") },
      ];

      const sorted = sortEvents(events);
      const groups = buildOverlapGroups(sorted);

      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(1);
      expect(groups[1]).toHaveLength(1);
      expect(groups[0][0].id).toBe(1);
      expect(groups[1][0].id).toBe(2);
    });

    it("should handle chain overlaps (A overlaps B, B overlaps C)", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:30:00"), end: new Date("2024-01-01T11:30:00") },
        { id: 3, title: "Event 3", start: new Date("2024-01-01T11:00:00"), end: new Date("2024-01-01T12:00:00") },
      ];

      const sorted = sortEvents(events);
      const groups = buildOverlapGroups(sorted);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(3);
      expect(groups[0][0].id).toBe(1);
      expect(groups[0][1].id).toBe(2);
      expect(groups[0][2].id).toBe(3);
    });

    it("should handle multiple separate overlap groups", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T09:00:00"), end: new Date("2024-01-01T10:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T09:30:00"), end: new Date("2024-01-01T10:30:00") },
        { id: 3, title: "Event 3", start: new Date("2024-01-01T11:00:00"), end: new Date("2024-01-01T12:00:00") },
        { id: 4, title: "Event 4", start: new Date("2024-01-01T11:30:00"), end: new Date("2024-01-01T12:30:00") },
      ];

      const sorted = sortEvents(events);
      const groups = buildOverlapGroups(sorted);

      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2);
      expect(groups[1]).toHaveLength(2);
      expect(groups[0][0].id).toBe(1);
      expect(groups[0][1].id).toBe(2);
      expect(groups[1][0].id).toBe(3);
      expect(groups[1][1].id).toBe(4);
    });

    it("should handle events that start at the same time", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T12:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 3, title: "Event 3", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T10:30:00") },
      ];

      const sorted = sortEvents(events);
      const groups = buildOverlapGroups(sorted);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(3);
    });
  });

  describe("calculateEventLayouts", () => {
    it("should calculate layout for single event", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
      ];

      const layouts = calculateEventLayouts(events);

      expect(layouts).toHaveLength(1);
      expect(layouts[0].event.id).toBe(1);
      expect(layouts[0].leftOffsetPercent).toBe(0);
      expect(layouts[0].widthPercent).toBe(80);
      expect(layouts[0].baseZIndex).toBe(60);
      expect(layouts[0].groupIndex).toBe(0);
      expect(layouts[0].indexInGroup).toBe(0);
    });

    it("should calculate cascading layout for two overlapping events", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:30:00"), end: new Date("2024-01-01T11:30:00") },
      ];

      const layouts = calculateEventLayouts(events);

      expect(layouts).toHaveLength(2);
      
      expect(layouts[0].event.id).toBe(1);
      expect(layouts[0].leftOffsetPercent).toBe(0);
      expect(layouts[0].widthPercent).toBe(80);
      expect(layouts[0].baseZIndex).toBe(60);
      
      expect(layouts[1].event.id).toBe(2);
      expect(layouts[1].leftOffsetPercent).toBe(8);
      expect(layouts[1].widthPercent).toBe(80);
      expect(layouts[1].baseZIndex).toBe(61);
    });

    it("should calculate cascading layout for three overlapping events", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:30:00"), end: new Date("2024-01-01T11:30:00") },
        { id: 3, title: "Event 3", start: new Date("2024-01-01T11:00:00"), end: new Date("2024-01-01T12:00:00") },
      ];

      const layouts = calculateEventLayouts(events);

      expect(layouts).toHaveLength(3);
      
      expect(layouts[0].leftOffsetPercent).toBe(0);
      expect(layouts[1].leftOffsetPercent).toBe(8);
      expect(layouts[2].leftOffsetPercent).toBe(16);
      
      expect(layouts[0].baseZIndex).toBe(60);
      expect(layouts[1].baseZIndex).toBe(61);
      expect(layouts[2].baseZIndex).toBe(62);
    });

    it("should respect custom configuration", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:30:00"), end: new Date("2024-01-01T11:30:00") },
      ];

      const layouts = calculateEventLayouts(events, {
        baseWidthPercent: 70,
        offsetStepPercent: 10,
        baseZIndex: 50,
      });

      expect(layouts[0].widthPercent).toBe(70);
      expect(layouts[0].leftOffsetPercent).toBe(0);
      expect(layouts[0].baseZIndex).toBe(50);
      
      expect(layouts[1].widthPercent).toBe(70);
      expect(layouts[1].leftOffsetPercent).toBe(10);
      expect(layouts[1].baseZIndex).toBe(51);
    });

    it("should handle non-overlapping events in separate groups", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T11:00:00"), end: new Date("2024-01-01T12:00:00") },
      ];

      const layouts = calculateEventLayouts(events);

      expect(layouts).toHaveLength(2);
      
      expect(layouts[0].groupIndex).toBe(0);
      expect(layouts[0].indexInGroup).toBe(0);
      expect(layouts[0].leftOffsetPercent).toBe(0);
      
      expect(layouts[1].groupIndex).toBe(1);
      expect(layouts[1].indexInGroup).toBe(0);
      expect(layouts[1].leftOffsetPercent).toBe(0);
    });
  });

  describe("createLayoutMap", () => {
    it("should create a map from event ID to layout", () => {
      const events: CalendarEvent[] = [
        { id: 1, title: "Event 1", start: new Date("2024-01-01T10:00:00"), end: new Date("2024-01-01T11:00:00") },
        { id: 2, title: "Event 2", start: new Date("2024-01-01T10:30:00"), end: new Date("2024-01-01T11:30:00") },
      ];

      const layouts = calculateEventLayouts(events);
      const map = createLayoutMap(layouts);

      expect(map.size).toBe(2);
      expect(map.get(1)?.event.id).toBe(1);
      expect(map.get(2)?.event.id).toBe(2);
      expect(map.get(1)?.leftOffsetPercent).toBe(0);
      expect(map.get(2)?.leftOffsetPercent).toBe(8);
    });

    it("should handle empty layouts", () => {
      const map = createLayoutMap([]);
      expect(map.size).toBe(0);
    });
  });
});
