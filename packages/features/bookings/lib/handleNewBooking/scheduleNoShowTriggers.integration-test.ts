import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { DailyLocationType } from "@calcom/app-store/constants";
import { getMeetingSessionsFromRoomName } from "@calcom/features/tasker/tasks/triggerNoShow/getMeetingSessionsFromRoomName";
import { triggerHostNoShow } from "@calcom/features/tasker/tasks/triggerNoShow/triggerHostNoShow";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { prisma } from "@calcom/prisma";
import type { Booking, User, Webhook } from "@calcom/prisma/client";
import { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";

import { scheduleNoShowTriggers } from "./scheduleNoShowTriggers";

vi.mock("@calcom/features/tasker/tasks/triggerNoShow/getMeetingSessionsFromRoomName", () => ({
  getMeetingSessionsFromRoomName: vi.fn(),
}));

vi.mock("@calcom/features/webhooks/lib/sendPayload", () => ({
  sendGenericWebhookPayload: vi.fn().mockResolvedValue({}),
}));

describe("scheduleNoShowTriggers Integration", () => {
  let testUser: User;
  let hostWebhook: Webhook;
  let guestWebhook: Webhook;
  const testEventTypeId = 67890;
  const testBookingIds = [98765, 98766];
  const testBookingId = 123456;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: "test-user-no-show@example.com",
        username: "test-user-no-show",
        name: "Test User No Show",
      },
    });

    [hostWebhook, guestWebhook] = await Promise.all([
      prisma.webhook.create({
        data: {
          id: "test-host-webhook-id",
          userId: testUser.id,
          subscriberUrl: "https://example.com/host-webhook",
          eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
          active: true,
          time: 5,
          timeUnit: TimeUnit.MINUTE,
        },
      }),
      prisma.webhook.create({
        data: {
          id: "test-guest-webhook-id",
          userId: testUser.id,
          subscriberUrl: "https://example.com/guest-webhook",
          eventTriggers: [WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW],
          active: true,
          time: 10,
          timeUnit: TimeUnit.MINUTE,
        },
      }),
    ]);
  });

  afterAll(async () => {
    await prisma.task.deleteMany({
      where: {
        OR: [{ type: "triggerHostNoShowWebhook" }, { type: "triggerGuestNoShowWebhook" }],
      },
    });

    await prisma.webhook.deleteMany({
      where: {
        userId: testUser.id,
      },
    });

    await prisma.booking.deleteMany({
      where: {
        id: testBookingId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: testUser.id,
      },
    });

    await prisma.eventType.deleteMany({
      where: {
        id: testEventTypeId,
      },
    });
  });

  test("scheduling a webhook creates the correct Tasker jobs for no-show webhooks", async () => {
    const currentDate = new Date("2023-01-01T10:00:00.000Z");
    const bookingData: Partial<Booking> & { startTime: Date; id: number; location: string } = {
      id: testBookingIds[0],
      startTime: currentDate,
      endTime: new Date("2023-01-01T10:30:00.000Z"),
      location: DailyLocationType,
    };

    await scheduleNoShowTriggers({
      booking: bookingData,
      organizerUser: { id: testUser.id },
      eventTypeId: testEventTypeId,
      triggerForUser: true,
    });

    const createdTasks = await prisma.task.findMany({
      where: {
        OR: [{ type: "triggerHostNoShowWebhook" }, { type: "triggerGuestNoShowWebhook" }],
      },
    });

    expect(createdTasks.length).toBe(2);

    const hostTask = createdTasks.find((task) => task.type === "triggerHostNoShowWebhook");
    expect(hostTask).toBeDefined();

    const guestTask = createdTasks.find((task) => task.type === "triggerGuestNoShowWebhook");
    expect(guestTask).toBeDefined();
  });

  test("created task payloads for no-show webhooks are correct", async () => {
    const currentDate = new Date("2023-01-01T11:00:00.000Z");
    const bookingData: Partial<Booking> & { startTime: Date; id: number; location: string } = {
      id: testBookingIds[1],
      startTime: currentDate,
      endTime: new Date("2023-01-01T11:30:00.000Z"),
      location: DailyLocationType,
    };

    await scheduleNoShowTriggers({
      booking: bookingData,
      organizerUser: { id: testUser.id },
      eventTypeId: testEventTypeId,
      triggerForUser: true,
    });

    const createdTasks = await prisma.task.findMany({
      where: {
        OR: [{ type: "triggerHostNoShowWebhook" }, { type: "triggerGuestNoShowWebhook" }],
        payload: {
          contains: bookingData.id.toString(),
        },
      },
    });

    const hostTask = createdTasks.find((task) => task.type === "triggerHostNoShowWebhook");
    expect(hostTask).toBeDefined();

    let hostPayload;
    try {
      hostPayload = JSON.parse(hostTask?.payload ?? "");
    } catch (e) {
      console.error("Failed to parse host task payload.");
      throw e;
    }

    expect(hostPayload).toEqual({
      triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      bookingId: bookingData.id,
      webhook: expect.objectContaining({
        id: hostWebhook.id,
        subscriberUrl: "https://example.com/host-webhook",
        eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
        time: 5,
        timeUnit: TimeUnit.MINUTE,
      }),
    });

    const guestTask = createdTasks.find((task) => task.type === "triggerGuestNoShowWebhook");
    expect(guestTask).toBeDefined();

    let guestPayload;
    try {
      guestPayload = JSON.parse(guestTask?.payload ?? "");
    } catch (e) {
      console.error("Failed to parse guest task payload.");
      throw e;
    }

    expect(guestPayload).toEqual({
      triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
      bookingId: bookingData.id,
      webhook: expect.objectContaining({
        id: guestWebhook.id,
        subscriberUrl: "https://example.com/guest-webhook",
        eventTriggers: [WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW],
        time: 10,
        timeUnit: TimeUnit.MINUTE,
      }),
    });
  });

  test("task handler runs properly with the correct payload", async () => {
    await prisma.eventType.create({
      data: {
        id: testEventTypeId,
        title: "Test Event Type",
        slug: "test-event-type",
        length: 30,
        userId: testUser.id,
        description: "Test description",
      },
    });

    const now = new Date();

    await prisma.booking.create({
      data: {
        id: testBookingId,
        uid: "test-uid-no-show",
        title: "Test No-Show",
        eventTypeId: testEventTypeId,
        status: "ACCEPTED",
        startTime: now,
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
        location: DailyLocationType,
        userId: testUser.id,
        references: {
          create: {
            type: "daily_video",
            uid: "meeting-test-uid",
          },
        },
      },
    });

    vi.mocked(getMeetingSessionsFromRoomName).mockResolvedValue({
      total_count: 1,
      data: [
        {
          id: "meeting-test-id",
          room: "meeting-test-uid",
          start_time: Math.floor(now.getTime() / 1000),
          duration: 30,
          max_participants: 1,
          participants: [
            {
              user_id: "999999",
              participant_id: "participant-test-id",
              user_name: "Guest User",
              join_time: Math.floor(now.getTime() / 1000),
              duration: 30,
            },
          ],
        },
      ],
    });

    const taskPayload = JSON.stringify({
      triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      bookingId: testBookingId,
      webhook: {
        id: hostWebhook.id,
        subscriberUrl: "https://example.com/host-webhook",
        eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
        active: true,
        time: 5,
        timeUnit: TimeUnit.MINUTE,
        payloadTemplate: null,
        secret: null,
        appId: null,
      },
    });

    await triggerHostNoShow(taskPayload);

    expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook: expect.objectContaining({
          id: hostWebhook.id,
          subscriberUrl: "https://example.com/host-webhook",
        }),
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        data: expect.objectContaining({
          bookingId: testBookingId,
          bookingUid: "test-uid-no-show",
          message: expect.stringContaining("Host with email"),
          participants: expect.arrayContaining([
            expect.objectContaining({
              user_id: "999999",
              user_name: "Guest User",
            }),
          ]),
        }),
      })
    );

    const updatedBooking = await prisma.booking.findUnique({
      where: {
        id: testBookingId,
      },
    });

    expect(updatedBooking?.noShowHost).toBe(true);
  });
});
