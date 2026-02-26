import { describe, expect, it, vi } from "vitest";

import {
  getPiiFreeBooking,
  getPiiFreeCredential,
  getPiiFreeDestinationCalendar,
  getPiiFreeEventType,
  getPiiFreeSelectedCalendar,
  getPiiFreeUser,
} from "./piiFreeData";

describe("getPiiFreeBooking", () => {
  it("preserves non-PII fields", () => {
    const booking = {
      id: 1,
      uid: "abc-123",
      userId: 42,
      startTime: new Date("2024-06-15T10:00:00Z"),
      endTime: new Date("2024-06-15T11:00:00Z"),
      title: "Meeting with John",
    };
    const result = getPiiFreeBooking(booking);
    expect(result.id).toBe(1);
    expect(result.uid).toBe("abc-123");
    expect(result.userId).toBe(42);
    expect(result.startTime).toEqual(booking.startTime);
    expect(result.endTime).toEqual(booking.endTime);
  });

  it("redacts title in production", () => {
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");

    const booking = {
      id: 1,
      uid: "abc",
      userId: 1,
      startTime: new Date(),
      endTime: new Date(),
      title: "Secret Meeting",
    };
    const result = getPiiFreeBooking(booking);
    expect(result.title).toBe("PiiFree:true");

    vi.stubEnv("NODE_ENV", originalEnv ?? "test");
  });

  it("passes title through in non-production", () => {
    vi.stubEnv("NODE_ENV", "test");

    const booking = {
      id: 1,
      uid: "abc",
      userId: 1,
      startTime: new Date(),
      endTime: new Date(),
      title: "My Meeting",
    };
    const result = getPiiFreeBooking(booking);
    expect(result.title).toBe("My Meeting");
  });

  it("handles empty title", () => {
    vi.stubEnv("NODE_ENV", "production");

    const booking = {
      id: 1,
      uid: "abc",
      userId: null,
      startTime: new Date(),
      endTime: new Date(),
      title: "",
    };
    const result = getPiiFreeBooking(booking);
    expect(result.title).toBe("PiiFree:false");
    expect(result.userId).toBeNull();

    vi.stubEnv("NODE_ENV", "test");
  });
});

describe("getPiiFreeCredential", () => {
  it("redacts key in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const credential = { id: 1, key: { token: "secret-token" }, type: "google_calendar" };
    const result = getPiiFreeCredential(credential);
    expect(result.key).toBe("PiiFree:true");
    expect(result.type).toBe("google_calendar");
    expect(result.id).toBe(1);

    vi.stubEnv("NODE_ENV", "test");
  });

  it("redacts delegatedTo as boolean", () => {
    const credential = { id: 1, key: {}, delegatedTo: { id: 5, name: "delegate" } };
    const result = getPiiFreeCredential(credential);
    expect(result.delegatedTo).toBe(true);
  });

  it("handles missing delegatedTo", () => {
    const credential = { id: 1, key: {} };
    const result = getPiiFreeCredential(credential);
    expect(result.delegatedTo).toBe(false);
  });

  it("handles null key in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const credential = { id: 1, key: null };
    const result = getPiiFreeCredential(credential);
    expect(result.key).toBe("PiiFree:false");

    vi.stubEnv("NODE_ENV", "test");
  });
});

describe("getPiiFreeSelectedCalendar", () => {
  it("truncates externalId to 3 characters", () => {
    const selectedCalendar = {
      integration: "google_calendar",
      userId: 42,
      externalId: "longexternalid@example.com",
      credentialId: 5,
    };
    const result = getPiiFreeSelectedCalendar(selectedCalendar);
    expect(result.externalId).toBe("lon");
    expect(result.integration).toBe("google_calendar");
    expect(result.userId).toBe(42);
    expect(result.credentialId).toBe(true);
  });

  it("handles undefined externalId", () => {
    const selectedCalendar = { integration: "outlook", userId: 1 };
    const result = getPiiFreeSelectedCalendar(selectedCalendar);
    expect(result.externalId).toBeUndefined();
  });

  it("handles missing credentialId", () => {
    const selectedCalendar = { integration: "google_calendar", userId: 1 };
    const result = getPiiFreeSelectedCalendar(selectedCalendar);
    expect(result.credentialId).toBe(false);
  });
});

describe("getPiiFreeDestinationCalendar", () => {
  it("redacts externalId in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const destCal = {
      integration: "google_calendar",
      userId: 42,
      credentialId: 5,
      externalId: "secret@example.com",
    };
    const result = getPiiFreeDestinationCalendar(destCal);
    expect(result.externalId).toBe("PiiFree:true");
    expect(result.integration).toBe("google_calendar");
    expect(result.userId).toBe(42);
    expect(result.credentialId).toBe(5);

    vi.stubEnv("NODE_ENV", "test");
  });

  it("handles missing externalId in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const destCal = { integration: "outlook", userId: 1, credentialId: 2 };
    const result = getPiiFreeDestinationCalendar(destCal);
    expect(result.externalId).toBe("PiiFree:false");

    vi.stubEnv("NODE_ENV", "test");
  });
});

describe("getPiiFreeEventType", () => {
  it("returns only id, schedulingType, and seatsPerTimeSlot", () => {
    const eventType = { id: 10, schedulingType: "ROUND_ROBIN" as const, seatsPerTimeSlot: 5 };
    const result = getPiiFreeEventType(eventType);
    expect(result).toEqual({ id: 10, schedulingType: "ROUND_ROBIN", seatsPerTimeSlot: 5 });
  });

  it("handles partial event type", () => {
    const eventType = { id: 10 };
    const result = getPiiFreeEventType(eventType);
    expect(result).toEqual({ id: 10, schedulingType: undefined, seatsPerTimeSlot: undefined });
  });
});

describe("getPiiFreeUser", () => {
  it("preserves non-PII user fields", () => {
    const user = {
      id: 1,
      username: "johndoe",
      isFixed: false,
      timeZone: "America/New_York",
      allowDynamicBooking: true,
      defaultScheduleId: 5,
      organizationId: null,
    };
    const result = getPiiFreeUser(user);
    expect(result.id).toBe(1);
    expect(result.username).toBe("johndoe");
    expect(result.timeZone).toBe("America/New_York");
    expect(result.organizationId).toBeNull();
  });

  it("redacts credentials", () => {
    vi.stubEnv("NODE_ENV", "production");

    const user = {
      id: 1,
      credentials: [{ id: 10, key: { token: "secret" }, type: "google" }],
    };
    const result = getPiiFreeUser(user);
    expect(result.credentials).toHaveLength(1);
    expect(result.credentials?.[0].key).toBe("PiiFree:true");

    vi.stubEnv("NODE_ENV", "test");
  });

  it("redacts destinationCalendar", () => {
    vi.stubEnv("NODE_ENV", "production");

    const user = {
      id: 1,
      destinationCalendar: {
        id: 5,
        integration: "google_calendar",
        externalId: "secret@gmail.com",
        eventTypeId: null,
        userId: 1,
        credentialId: 10,
      },
    };
    const result = getPiiFreeUser(user);
    expect(result.destinationCalendar?.externalId).toBe("PiiFree:true");

    vi.stubEnv("NODE_ENV", "test");
  });

  it("handles null destinationCalendar", () => {
    const user = { id: 1, destinationCalendar: null };
    const result = getPiiFreeUser(user);
    expect(result.destinationCalendar).toBeNull();
  });

  it("handles undefined credentials", () => {
    const user = { id: 1 };
    const result = getPiiFreeUser(user);
    expect(result.credentials).toBeUndefined();
  });
});
