import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Booking, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handlePayment } from "./handlePayment";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let organizer: User;
let eventType: EventType;
let booking: Booking;

function makeEvt() {
  return {
    type: "test",
    title: "Test",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    organizer: {
      id: organizer.id,
      email: organizer.email,
      name: organizer.name ?? "",
      timeZone: "UTC",
      language: { translate: ((key: string) => key) as never, locale: "en" },
    },
    attendees: [],
  };
}

function makeBookingArg() {
  return {
    user: {
      email: organizer.email,
      name: organizer.name,
      timeZone: "UTC",
      username: organizer.username,
    },
    id: booking.id,
    userId: organizer.id,
    startTime: booking.startTime,
    uid: booking.uid,
  };
}

describe("handlePayment - integration", () => {
  beforeAll(async () => {
    organizer = await prisma.user.create({
      data: {
        username: `payment-org-${timestamp}-${unique()}`,
        email: `payment-org-${timestamp}-${unique()}@example.com`,
        name: "Payment Organizer",
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Payment Event ${timestamp}`,
        slug: `payment-event-${timestamp}-${unique()}`,
        length: 30,
        userId: organizer.id,
      },
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    booking = await prisma.booking.create({
      data: {
        uid: `payment-booking-${unique()}`,
        title: "Payment Booking",
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
        userId: organizer.id,
        eventTypeId: eventType.id,
        status: BookingStatus.PENDING,
      },
    });
  });

  afterAll(async () => {
    try {
      if (booking?.id) {
        await prisma.booking.deleteMany({ where: { id: booking.id } });
      }
      if (eventType?.id) {
        await prisma.eventType.deleteMany({ where: { id: eventType.id } });
      }
      if (organizer?.id) {
        await prisma.user.deleteMany({ where: { id: organizer.id } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return null immediately when isDryRun is true (no payment processing)", async () => {
    const result = await handlePayment({
      evt: makeEvt(),
      selectedEventType: { metadata: null, title: "Test Event" },
      paymentAppCredentials: {
        key: {},
        appId: "stripe" as never,
        app: { dirName: "stripe", categories: [] },
      },
      booking: makeBookingArg(),
      bookerName: "Test Booker",
      bookerEmail: "booker@example.com",
      isDryRun: true,
    });

    expect(result).toBeNull();
  });

  it("should return null when payment app dirName is not in PaymentServiceMap", async () => {
    const result = await handlePayment({
      evt: makeEvt(),
      selectedEventType: { metadata: null, title: "Test Event" },
      paymentAppCredentials: {
        key: {},
        appId: "nonexistent-app" as never,
        app: { dirName: "nonexistent-payment-app-xyz", categories: [] },
      },
      booking: makeBookingArg(),
      bookerName: "Test Booker",
      bookerEmail: "booker@example.com",
    });

    expect(result).toBeNull();
  });

  it("should return null when app is null (no dirName to look up)", async () => {
    const result = await handlePayment({
      evt: makeEvt(),
      selectedEventType: { metadata: null, title: "Test Event" },
      paymentAppCredentials: {
        key: {},
        appId: "stripe" as never,
        app: null,
      },
      booking: makeBookingArg(),
      bookerName: "Test Booker",
      bookerEmail: "booker@example.com",
    });

    expect(result).toBeNull();
  });

  it("should return null when isDryRun is true regardless of valid payment app", async () => {
    const result = await handlePayment({
      evt: makeEvt(),
      selectedEventType: {
        metadata: { apps: { stripe: { price: 1000, currency: "usd", paymentOption: "ON_BOOKING" } } },
        title: "Paid Event",
      },
      paymentAppCredentials: {
        key: { stripe_user_id: "acct_test" },
        appId: "stripe" as never,
        app: { dirName: "stripe", categories: ["payment"] as never },
      },
      booking: makeBookingArg(),
      bookerName: "Test Booker",
      bookerEmail: "booker@example.com",
      isDryRun: true,
    });

    // isDryRun short-circuits before any app lookup
    expect(result).toBeNull();
  });

  it("should return null when dirName is an empty string", async () => {
    const result = await handlePayment({
      evt: makeEvt(),
      selectedEventType: { metadata: null, title: "Test Event" },
      paymentAppCredentials: {
        key: {},
        appId: "stripe" as never,
        app: { dirName: "", categories: [] },
      },
      booking: makeBookingArg(),
      bookerName: "Test Booker",
      bookerEmail: "booker@example.com",
    });

    expect(result).toBeNull();
  });
});
