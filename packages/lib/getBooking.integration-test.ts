import "@calcom/testing/lib/__mocks__/prisma";
import { describe, it, expect } from "vitest";

import { prisma } from "@calcom/prisma";

import getBooking from "./getBooking";

describe("getBooking integration tests", () => {
  it("returns null for a non-existent UID", async () => {
    const result = await getBooking(prisma, `nonexistent-${Date.now()}`);
    expect(result).toBeNull();
  });

  it("returns booking with responses field directly when present", async () => {
    const user = await prisma.user.create({
      data: {
        email: `resp-user-${Date.now()}@test.com`,
        username: `resp-user-${Date.now()}`,
      },
    });

    const uid = `resp-${Date.now()}`;
    const responses = { name: "Test User", email: "test@example.com", notes: "Hello" };

    await prisma.booking.create({
      data: {
        uid,
        title: "Test Booking",
        startTime: new Date("2025-06-15T10:00:00Z"),
        endTime: new Date("2025-06-15T10:30:00Z"),
        userId: user.id,
        responses,
      },
    });

    const result = await getBooking(prisma, uid);
    expect(result).not.toBeNull();
    expect(result!.responses).toEqual(responses);
    expect(result!.uid).toBe(uid);
  });

  it("transforms legacy customInputs to responses format when responses is null", async () => {
    const user = await prisma.user.create({
      data: {
        email: `legacy-user-${Date.now()}@test.com`,
        username: `legacy-user-${Date.now()}`,
      },
    });

    const uid = `legacy-${Date.now()}`;
    const customInputs = { "Phone Number": "1234567890", "Company Name": "Acme" };

    const booking = await prisma.booking.create({
      data: {
        uid,
        title: "Legacy Booking",
        startTime: new Date("2025-06-15T11:00:00Z"),
        endTime: new Date("2025-06-15T11:30:00Z"),
        userId: user.id,
        customInputs,
      },
    });

    await prisma.attendee.create({
      data: {
        email: "legacy@example.com",
        name: "Legacy User",
        timeZone: "UTC",
        bookingId: booking.id,
      },
    });

    const result = await getBooking(prisma, uid);
    expect(result).not.toBeNull();
    expect(result!.responses["phone-number"]).toBe("1234567890");
    expect(result!.responses["company-name"]).toBe("Acme");
    expect(result!.responses.name).toBe("Legacy User");
    expect(result!.responses.email).toBe("legacy@example.com");
  });

  it("returns first attendee as name/email and rest as guests in legacy format", async () => {
    const user = await prisma.user.create({
      data: {
        email: `multi-user-${Date.now()}@test.com`,
        username: `multi-user-${Date.now()}`,
      },
    });

    const uid = `multi-att-${Date.now()}`;

    const booking = await prisma.booking.create({
      data: {
        uid,
        title: "Multi Attendee Booking",
        startTime: new Date("2025-06-15T12:00:00Z"),
        endTime: new Date("2025-06-15T12:30:00Z"),
        userId: user.id,
      },
    });

    await prisma.attendee.create({
      data: { email: "first@example.com", name: "First", timeZone: "UTC", bookingId: booking.id },
    });
    await prisma.attendee.create({
      data: { email: "second@example.com", name: "Second", timeZone: "UTC", bookingId: booking.id },
    });
    await prisma.attendee.create({
      data: { email: "third@example.com", name: "Third", timeZone: "UTC", bookingId: booking.id },
    });

    const result = await getBooking(prisma, uid);
    expect(result).not.toBeNull();
    expect(result!.responses.name).toBe("First");
    expect(result!.responses.email).toBe("first@example.com");
    expect(result!.responses.guests).toEqual(["second@example.com", "third@example.com"]);
  });

  it("returns Nameless when booking has no attendees and null responses", async () => {
    const user = await prisma.user.create({
      data: {
        email: `noatt-user-${Date.now()}@test.com`,
        username: `noatt-user-${Date.now()}`,
      },
    });

    const uid = `noatt-${Date.now()}`;

    await prisma.booking.create({
      data: {
        uid,
        title: "No Attendee Booking",
        startTime: new Date("2025-06-15T13:00:00Z"),
        endTime: new Date("2025-06-15T13:30:00Z"),
        userId: user.id,
      },
    });

    const result = await getBooking(prisma, uid);
    expect(result).not.toBeNull();
    expect(result!.responses.name).toBe("Nameless");
  });

  it("serializes startTime to ISO string", async () => {
    const user = await prisma.user.create({
      data: {
        email: `iso-user-${Date.now()}@test.com`,
        username: `iso-user-${Date.now()}`,
      },
    });

    const uid = `iso-${Date.now()}`;
    const startTime = new Date("2025-06-15T14:00:00Z");

    await prisma.booking.create({
      data: {
        uid,
        title: "ISO Booking",
        startTime,
        endTime: new Date("2025-06-15T14:30:00Z"),
        userId: user.id,
        responses: { name: "ISO Test" },
      },
    });

    const result = await getBooking(prisma, uid);
    expect(result).not.toBeNull();
    expect(typeof result!.startTime).toBe("string");
    expect(result!.startTime).toBe("2025-06-15T14:00:00.000Z");
  });
});
