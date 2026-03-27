import { describe, expect, it } from "vitest";

import { getBookingDuration } from "./getBookingDuration";

describe("getBookingDuration", () => {
  it("returns the correct duration when it matches a config option", () => {
    const startTime = "2024-01-15T10:00:00.000Z";
    const endTime = "2024-01-15T10:40:00.000Z";
    const durationConfig = [20, 40, 60];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBe(40);
  });

  it("returns null when the computed duration is not in the config", () => {
    const startTime = "2024-01-15T10:00:00.000Z";
    const endTime = "2024-01-15T10:45:00.000Z";
    const durationConfig = [20, 40, 60];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBeNull();
  });

  it("handles 20-minute bookings correctly", () => {
    const startTime = "2024-01-15T14:00:00.000Z";
    const endTime = "2024-01-15T14:20:00.000Z";
    const durationConfig = [20, 40];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBe(20);
  });

  it("handles 60-minute bookings correctly", () => {
    const startTime = "2024-01-15T09:00:00.000Z";
    const endTime = "2024-01-15T10:00:00.000Z";
    const durationConfig = [15, 30, 60];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBe(60);
  });

  it("handles Date objects as inputs", () => {
    const startTime = new Date("2024-01-15T10:00:00.000Z");
    const endTime = new Date("2024-01-15T10:30:00.000Z");
    const durationConfig = [15, 30, 60];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBe(30);
  });

  it("returns null for an empty duration config", () => {
    const startTime = "2024-01-15T10:00:00.000Z";
    const endTime = "2024-01-15T10:30:00.000Z";
    const durationConfig: number[] = [];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBeNull();
  });

  it("handles bookings that span across midnight", () => {
    const startTime = "2024-01-15T23:30:00.000Z";
    const endTime = "2024-01-16T00:00:00.000Z";
    const durationConfig = [30, 60];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBe(30);
  });

  it("handles 90-minute bookings correctly", () => {
    const startTime = "2024-01-15T10:00:00.000Z";
    const endTime = "2024-01-15T11:30:00.000Z";
    const durationConfig = [30, 60, 90];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBe(90);
  });

  it("returns null when duration doesn't match due to external time adjustments", () => {
    const startTime = "2024-01-15T10:00:00.000Z";
    const endTime = "2024-01-15T10:40:00.000Z";
    const durationConfig = [30, 60];

    expect(getBookingDuration(startTime, endTime, durationConfig)).toBeNull();
  });
});
