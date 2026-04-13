import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { EventType, User } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InstantBookingCreateService } from "./InstantBookingCreateService";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let organizer: User;
let personalEventType: EventType;
let teamId: number;

const bookingIds: number[] = [];

describe("InstantBookingCreateService - integration", () => {
  beforeAll(async () => {
    organizer = await prisma.user.create({
      data: {
        username: `instant-org-${timestamp}-${unique()}`,
        email: `instant-org-${timestamp}-${unique()}@example.com`,
        name: "Instant Organizer",
      },
    });

    const team = await prisma.team.create({
      data: {
        name: `Instant Team ${timestamp}`,
        slug: `instant-team-${timestamp}-${unique()}`,
        members: {
          create: {
            userId: organizer.id,
            role: "OWNER",
            accepted: true,
          },
        },
      },
    });
    teamId = team.id;

    // Personal event type (not team) — should fail for instant bookings
    personalEventType = await prisma.eventType.create({
      data: {
        title: `Instant Personal ET ${timestamp}`,
        slug: `instant-personal-${timestamp}-${unique()}`,
        length: 30,
        userId: organizer.id,
      },
    });
  });

  afterAll(async () => {
    try {
      if (bookingIds.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      if (personalEventType?.id) {
        await prisma.eventType.deleteMany({ where: { id: personalEventType.id } });
      }
      if (organizer?.id) {
        await prisma.membership.deleteMany({ where: { userId: organizer.id } });
      }
      if (teamId) {
        await prisma.eventType.deleteMany({ where: { teamId } });
        await prisma.team.deleteMany({ where: { id: teamId } });
      }
      if (organizer?.id) {
        await prisma.user.deleteMany({ where: { id: organizer.id } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw when eventTypeId does not exist in the database", async () => {
    const service = new InstantBookingCreateService({ prismaClient: prisma });

    await expect(
      service.createBooking({
        bookingData: {
          eventTypeId: 999999,
          start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
          responses: {
            name: "Test",
            email: `instant-noet-${unique()}@example.com`,
            location: { optionValue: "", value: "" },
          },
          timeZone: "UTC",
          language: "en",
          metadata: {},
        },
      })
    ).rejects.toThrow();
  });

  it("should throw for a personal (non-team) event type", async () => {
    const service = new InstantBookingCreateService({ prismaClient: prisma });

    await expect(
      service.createBooking({
        bookingData: {
          eventTypeId: personalEventType.id,
          start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
          responses: {
            name: "Test User",
            email: `instant-personal-${unique()}@example.com`,
            location: { optionValue: "", value: "" },
          },
          timeZone: "UTC",
          language: "en",
          metadata: {},
        },
      })
    ).rejects.toThrow("Only Team Event Types are supported for Instant Meeting");
  });

  it("should be instantiable with prismaClient dependency", () => {
    const service = new InstantBookingCreateService({ prismaClient: prisma });
    expect(service).toBeDefined();
    expect(typeof service.createBooking).toBe("function");
  });
});
