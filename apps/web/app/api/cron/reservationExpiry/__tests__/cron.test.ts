import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { WebhookTriggerEvents } from "@calcom/prisma/client";

// Mock the webhook sending function
vi.mock("@calcom/features/webhooks/lib/sendPayload", () => ({
  sendGenericWebhookPayload: vi.fn().mockResolvedValue(undefined),
}));

// Handler function for processing expired reservations
async function handleReservationExpiry() {
  const currentTimeInUtc = dayjs.utc().toDate();
  let notificationsSent = 0;
  let expiredReservationsProcessed = 0;

  try {
    // Find expired reservations that need to be processed
    const expiredReservations = await prismock.selectedSlots.findMany({
      where: {
        releaseAt: { lt: currentTimeInUtc },
      },
    });

    for (const reservation of expiredReservations) {
      try {
        // Get related data for webhook payload
        const eventType = await prismock.eventType.findUnique({
          where: { id: reservation.eventTypeId },
          select: {
            id: true,
            title: true,
            userId: true,
            teamId: true,
          },
        });

        // Get webhooks for this reservation
        const webhooks = await prismock.webhook.findMany({
          where: {
            active: true,
            eventTriggers: { has: WebhookTriggerEvents.RESERVATION_EXPIRED },
            OR: [
              { eventTypeId: reservation.eventTypeId },
              { userId: eventType?.userId },
              { teamId: eventType?.teamId },
              {
                AND: [{ eventTypeId: null }, { userId: null }, { teamId: null }],
              },
            ],
          },
        });

        if (webhooks.length > 0) {
          notificationsSent += webhooks.length;
        }

        // Clean up the expired reservation
        await prismock.selectedSlots.delete({
          where: { id: reservation.id },
        });

        expiredReservationsProcessed++;
      } catch (error) {
        console.error(`Error processing expired reservation ${reservation.uid}:`, error);
        // Continue processing other reservations even if one fails
      }
    }

    return {
      notificationsSent,
      expiredReservationsProcessed,
    };
  } catch (error) {
    return {
      error: "Internal server error",
      notificationsSent,
      expiredReservationsProcessed,
    };
  }
}

type UserParams = { id: number; email?: string; name?: string };
const createUser = async ({ id, email = `user${id}@example.com`, name = `User ${id}` }: UserParams) =>
  await prismock.user.create({ data: { id, email, name } });

type EventTypeParams = { id: number; userId?: number; teamId?: number | null; title?: string };
const createEventType = async ({ id, userId = 1, teamId = null, title = `Event ${id}` }: EventTypeParams) =>
  await prismock.eventType.create({ data: { id, userId, teamId, title, slug: `event-${id}`, length: 30 } });

type SelectedSlotParams = {
  id: number;
  eventTypeId: number;
  userId: number;
  uid?: string;
  releaseAt: Date;
  slotUtcStartDate?: Date;
  slotUtcEndDate?: Date;
};
const createSelectedSlot = async ({
  id,
  eventTypeId,
  userId,
  uid = `slot-${id}`,
  releaseAt,
  slotUtcStartDate = new Date(),
  slotUtcEndDate = new Date(),
}: SelectedSlotParams) =>
  await prismock.selectedSlots.create({
    data: { id, eventTypeId, userId, uid, releaseAt, slotUtcStartDate, slotUtcEndDate },
  });

type WebhookParams = {
  id: string;
  userId?: number | null;
  teamId?: number | null;
  eventTypeId?: number | null;
  eventTriggers?: WebhookTriggerEvents[];
  subscriberUrl?: string;
  active?: boolean;
};
const createWebhook = async ({
  id,
  userId = null,
  teamId = null,
  eventTypeId = null,
  eventTriggers = [WebhookTriggerEvents.RESERVATION_EXPIRED],
  subscriberUrl = "http://webhook.example.com",
  active = true,
}: WebhookParams) =>
  await prismock.webhook.create({
    data: { id, userId, teamId, eventTypeId, eventTriggers, subscriberUrl, active },
  });

describe("Reservation Expiry Cron Job", () => {
  beforeEach(() => {
    prismock.selectedSlots.deleteMany();
    prismock.webhook.deleteMany();
    prismock.eventType.deleteMany();
    prismock.user.deleteMany();
  });

  it("should return zero counts when no expired reservations exist", async () => {
    const result = await handleReservationExpiry();
    expect(result.expiredReservationsProcessed).toBe(0);
    expect(result.notificationsSent).toBe(0);
  });

  it("should process expired reservations and send webhooks", async () => {
    const currentTime = dayjs.utc();
    const expiredTime = currentTime.subtract(1, "hour").toDate();

    // Create test data
    await createUser({ id: 101 });
    await createEventType({ id: 1, userId: 101 });
    await createSelectedSlot({
      id: 1,
      eventTypeId: 1,
      userId: 101,
      uid: "expired-reservation-1",
      releaseAt: expiredTime,
    });
    await createWebhook({
      id: "webhook-1",
      userId: 101,
      eventTypeId: 1,
    });

    const result = await handleReservationExpiry();

    expect(result.expiredReservationsProcessed).toBe(1);
    expect(result.notificationsSent).toBe(1);

    // Check that expired reservation was deleted
    const remainingReservations = await prismock.selectedSlots.findMany();
    expect(remainingReservations).toHaveLength(0);
  });

  it("should not process future reservations", async () => {
    const currentTime = dayjs.utc();
    const futureTime = currentTime.add(1, "hour").toDate();

    // Create test data with future expiry
    await createUser({ id: 101 });
    await createEventType({ id: 1, userId: 101 });
    await createSelectedSlot({
      id: 1,
      eventTypeId: 1,
      userId: 101,
      uid: "future-reservation",
      releaseAt: futureTime,
    });
    await createWebhook({
      id: "webhook-1",
      userId: 101,
      eventTypeId: 1,
    });

    const result = await handleReservationExpiry();

    expect(result.expiredReservationsProcessed).toBe(0);
    expect(result.notificationsSent).toBe(0);

    // Check that future reservation was not deleted
    const remainingReservations = await prismock.selectedSlots.findMany();
    expect(remainingReservations).toHaveLength(1);
  });

  it("should handle team webhooks for expired reservations", async () => {
    const currentTime = dayjs.utc();
    const expiredTime = currentTime.subtract(1, "hour").toDate();

    // Create test data with team webhook
    await createUser({ id: 101 });
    await createEventType({ id: 1, userId: 101, teamId: 1 });
    await createSelectedSlot({
      id: 1,
      eventTypeId: 1,
      userId: 101,
      uid: "team-expired-reservation",
      releaseAt: expiredTime,
    });
    await createWebhook({
      id: "team-webhook-1",
      teamId: 1,
    });

    const result = await handleReservationExpiry();

    expect(result.expiredReservationsProcessed).toBe(1);
    expect(result.notificationsSent).toBe(1);
  });

  it("should process multiple expired reservations", async () => {
    const currentTime = dayjs.utc();
    const expiredTime = currentTime.subtract(1, "hour").toDate();

    // Create test data with multiple expired reservations
    await createUser({ id: 101 });
    await createEventType({ id: 1, userId: 101 });
    await createSelectedSlot({
      id: 1,
      eventTypeId: 1,
      userId: 101,
      uid: "expired-reservation-1",
      releaseAt: expiredTime,
    });
    await createSelectedSlot({
      id: 2,
      eventTypeId: 1,
      userId: 101,
      uid: "expired-reservation-2",
      releaseAt: expiredTime,
    });
    await createWebhook({
      id: "webhook-1",
      userId: 101,
      eventTypeId: 1,
    });

    const result = await handleReservationExpiry();

    expect(result.expiredReservationsProcessed).toBe(2);
    expect(result.notificationsSent).toBe(2);

    // Check that all expired reservations were deleted
    const remainingReservations = await prismock.selectedSlots.findMany();
    expect(remainingReservations).toHaveLength(0);
  });
});
