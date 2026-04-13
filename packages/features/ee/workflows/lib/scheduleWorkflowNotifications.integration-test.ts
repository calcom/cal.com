import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { EventType, User } from "@calcom/prisma/client";
import { BookingStatus, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bookingSelect, getBookings, scheduleWorkflowNotifications } from "./scheduleWorkflowNotifications";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let organizer: User;
let eventType: EventType;
let teamId: number;

const bookingIds: number[] = [];

describe("scheduleWorkflowNotifications - integration", () => {
  beforeAll(async () => {
    organizer = await prisma.user.create({
      data: {
        username: `wf-notif-org-${timestamp}-${unique()}`,
        email: `wf-notif-org-${timestamp}-${unique()}@example.com`,
        name: "Workflow Organizer",
      },
    });

    const team = await prisma.team.create({
      data: {
        name: `WF Notif Team ${timestamp}`,
        slug: `wf-notif-team-${timestamp}-${unique()}`,
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

    eventType = await prisma.eventType.create({
      data: {
        title: `WF Notif Event ${timestamp}`,
        slug: `wf-notif-event-${timestamp}-${unique()}`,
        length: 30,
        userId: organizer.id,
      },
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        uid: `wf-notif-booking-${unique()}`,
        title: "WF Notification Booking",
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
        userId: organizer.id,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: `wf-att-${unique()}@example.com`,
            name: "WF Attendee",
            timeZone: "UTC",
          },
        },
      },
    });
    bookingIds.push(booking.id);

    // Past booking (should not be fetched)
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pastBooking = await prisma.booking.create({
      data: {
        uid: `wf-notif-past-${unique()}`,
        title: "Past WF Booking",
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 30 * 60 * 1000),
        userId: organizer.id,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
      },
    });
    bookingIds.push(pastBooking.id);

    // Cancelled booking (should not be fetched)
    const cancelledBooking = await prisma.booking.create({
      data: {
        uid: `wf-notif-cancelled-${unique()}`,
        title: "Cancelled WF Booking",
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
        userId: organizer.id,
        eventTypeId: eventType.id,
        status: BookingStatus.CANCELLED,
      },
    });
    bookingIds.push(cancelledBooking.id);
  });

  afterAll(async () => {
    try {
      if (bookingIds.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      if (eventType?.id) {
        await prisma.eventType.deleteMany({ where: { id: eventType.id } });
      }
      if (organizer?.id) {
        await prisma.membership.deleteMany({ where: { userId: organizer.id } });
      }
      if (teamId) {
        await prisma.team.deleteMany({ where: { id: teamId } });
      }
      if (organizer?.id) {
        await prisma.user.deleteMany({ where: { id: organizer.id } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  describe("getBookings", () => {
    it("should return only future ACCEPTED bookings for given event type IDs", async () => {
      const bookings = await getBookings([eventType.id], false);

      expect(bookings.length).toBeGreaterThanOrEqual(1);
      for (const b of bookings) {
        expect(new Date(b.startTime).getTime()).toBeGreaterThan(Date.now());
      }
    });

    it("should return empty array when activeOn is empty", async () => {
      const bookings = await getBookings([], false);
      expect(bookings).toEqual([]);
    });

    it("should not include past bookings", async () => {
      const bookings = await getBookings([eventType.id], false);
      const pastBookings = bookings.filter((b) => new Date(b.startTime).getTime() < Date.now());
      expect(pastBookings).toHaveLength(0);
    });

    it("should not include cancelled bookings", async () => {
      const bookings = await getBookings([eventType.id], false);
      const uids = bookings.map((b) => b.uid);
      const hasCancelled = uids.some((uid) => uid.includes("cancelled"));
      expect(hasCancelled).toBe(false);
    });

    it("should return bookings with the correct select shape", async () => {
      const bookings = await getBookings([eventType.id], false);
      if (bookings.length > 0) {
        const b = bookings[0];
        expect(b).toHaveProperty("startTime");
        expect(b).toHaveProperty("endTime");
        expect(b).toHaveProperty("title");
        expect(b).toHaveProperty("uid");
        expect(b).toHaveProperty("attendees");
      }
    });
  });

  describe("scheduleWorkflowNotifications trigger filtering", () => {
    it("should return early for NEW_EVENT trigger (not BEFORE_EVENT or AFTER_EVENT)", async () => {
      const result = await scheduleWorkflowNotifications({
        activeOn: [eventType.id],
        isOrg: false,
        workflowSteps: [],
        time: 24,
        timeUnit: "HOUR",
        trigger: WorkflowTriggerEvents.NEW_EVENT,
        userId: organizer.id,
        teamId: null,
      });

      expect(result).toBeUndefined();
    });

    it("should return early for RESCHEDULE_EVENT trigger", async () => {
      const result = await scheduleWorkflowNotifications({
        activeOn: [eventType.id],
        isOrg: false,
        workflowSteps: [],
        time: 24,
        timeUnit: "HOUR",
        trigger: WorkflowTriggerEvents.RESCHEDULE_EVENT,
        userId: organizer.id,
        teamId: null,
      });

      expect(result).toBeUndefined();
    });

    it("should return early for EVENT_CANCELLED trigger", async () => {
      const result = await scheduleWorkflowNotifications({
        activeOn: [eventType.id],
        isOrg: false,
        workflowSteps: [],
        time: 24,
        timeUnit: "HOUR",
        trigger: WorkflowTriggerEvents.EVENT_CANCELLED,
        userId: organizer.id,
        teamId: null,
      });

      expect(result).toBeUndefined();
    });
  });

  describe("bookingSelect shape", () => {
    it("should include required fields for workflow processing", () => {
      expect(bookingSelect).toHaveProperty("startTime");
      expect(bookingSelect).toHaveProperty("endTime");
      expect(bookingSelect).toHaveProperty("title");
      expect(bookingSelect).toHaveProperty("uid");
      expect(bookingSelect).toHaveProperty("attendees");
      expect(bookingSelect).toHaveProperty("eventType");
      expect(bookingSelect).toHaveProperty("user");
    });
  });
});
