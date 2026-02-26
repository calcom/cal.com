import { describe, expect, it } from "vitest";
import { eventTypeScheduleSelect, eventTypeSelect } from "./eventTypeSelect";

describe("eventTypeSelect", () => {
  it("includes id field", () => {
    expect(eventTypeSelect.id).toBe(true);
  });

  it("includes teamId field", () => {
    expect(eventTypeSelect.teamId).toBe(true);
  });

  it("includes schedulingType field", () => {
    expect(eventTypeSelect.schedulingType).toBe(true);
  });

  it("includes title field", () => {
    expect(eventTypeSelect.title).toBe(true);
  });

  it("includes slug field", () => {
    expect(eventTypeSelect.slug).toBe(true);
  });

  it("includes locations field", () => {
    expect(eventTypeSelect.locations).toBe(true);
  });

  it("includes bookingFields field", () => {
    expect(eventTypeSelect.bookingFields).toBe(true);
  });

  it("has owner with nested timeZone select", () => {
    expect(eventTypeSelect.owner).toEqual({ select: { timeZone: true } });
  });

  it("includes instantMeetingSchedule with id and name", () => {
    expect(eventTypeSelect.instantMeetingSchedule).toEqual({ select: { id: true, name: true } });
  });
});

describe("eventTypeScheduleSelect", () => {
  it("includes all fields from eventTypeSelect", () => {
    for (const key of Object.keys(eventTypeSelect)) {
      expect(eventTypeScheduleSelect).toHaveProperty(key);
    }
  });

  it("adds schedule with id and name select", () => {
    expect(eventTypeScheduleSelect.schedule).toEqual({ select: { id: true, name: true } });
  });

  it("adds restrictionSchedule with id and name select", () => {
    expect(eventTypeScheduleSelect.restrictionSchedule).toEqual({ select: { id: true, name: true } });
  });
});
