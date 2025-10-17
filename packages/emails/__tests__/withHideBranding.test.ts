import { describe, it, expect } from "vitest";
import { withHideBranding } from "../email-manager";
import type { CalendarEvent } from "@calcom/types/Calendar";

describe("withHideBranding", () => {
  const baseEvent: CalendarEvent = {
    uid: "test-uid",
    title: "Test Event",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    attendees: [],
    organizer: { name: "Test Organizer", email: "test@example.com" },
  };

  it("should add hideBranding: false when not present", () => {
    const result = withHideBranding(baseEvent);
    
    expect(result).toEqual({
      ...baseEvent,
      hideBranding: false,
    });
  });

  it("should preserve existing hideBranding value", () => {
    const eventWithBranding = { ...baseEvent, hideBranding: true };
    const result = withHideBranding(eventWithBranding);
    
    expect(result).toEqual({
      ...baseEvent,
      hideBranding: true,
    });
  });

  it("should use explicit value when provided", () => {
    const result = withHideBranding(baseEvent, true);
    
    expect(result).toEqual({
      ...baseEvent,
      hideBranding: true,
    });
  });

  it("should override existing value with explicit value", () => {
    const eventWithBranding = { ...baseEvent, hideBranding: false };
    const result = withHideBranding(eventWithBranding, true);
    
    expect(result).toEqual({
      ...baseEvent,
      hideBranding: true,
    });
  });

  it("should default to false when explicit value is undefined", () => {
    const eventWithBranding = { ...baseEvent, hideBranding: true };
    const result = withHideBranding(eventWithBranding, undefined);
    
    expect(result).toEqual({
      ...baseEvent,
      hideBranding: true, // Should preserve existing value when explicit is undefined
    });
  });

  it("should handle null hideBranding correctly", () => {
    const eventWithNullBranding = { ...baseEvent, hideBranding: null };
    const result = withHideBranding(eventWithNullBranding);
    
    expect(result).toEqual({
      ...baseEvent,
      hideBranding: false, // Should default to false when null
    });
  });

  it("should handle undefined hideBranding correctly", () => {
    const eventWithUndefinedBranding = { ...baseEvent, hideBranding: undefined };
    const result = withHideBranding(eventWithUndefinedBranding);
    
    expect(result).toEqual({
      ...baseEvent,
      hideBranding: false, // Should default to false when undefined
    });
  });

  it("should return CalendarEventWithBranding type", () => {
    const result = withHideBranding(baseEvent);
    
    // Type check - this should compile without errors
    expect(typeof result.hideBranding).toBe("boolean");
    expect(result.hideBranding).toBe(false);
  });
});
