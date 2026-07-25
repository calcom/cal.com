import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it } from "vitest";
import { getNoShowTaskReferenceUid } from "./noShowTaskReference";
import { cancelNoShowTasksForBooking } from "./scheduleTrigger";

const bookingUid = "booking-uid-1";
const otherBookingUid = "booking-uid-2";

const createTask = (referenceUid: string, type: string) =>
  prismock.task.create({
    data: {
      type,
      payload: "{}",
      referenceUid,
      scheduledAt: new Date("2024-05-01T10:05:00.000Z"),
    },
  });

const getReferenceUids = async (type?: string) => {
  const tasks = await prismock.task.findMany({ where: type ? { type } : undefined });
  return tasks.map((task) => task.referenceUid).sort();
};

describe("cancelNoShowTasksForBooking", () => {
  beforeEach(async () => {
    await prismock.task.deleteMany();
  });

  it("cancels the host no-show task of every subscriber of the booking", async () => {
    const firstReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-1" });
    const secondReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-2" });
    const otherBookingReference = getNoShowTaskReferenceUid({
      bookingUid: otherBookingUid,
      webhookId: "webhook-1",
    });

    await createTask(firstReference, "triggerHostNoShowWebhook");
    await createTask(secondReference, "triggerHostNoShowWebhook");
    await createTask(otherBookingReference, "triggerHostNoShowWebhook");

    await cancelNoShowTasksForBooking({
      bookingUid,
      triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    });

    expect(await getReferenceUids()).toEqual([otherBookingReference]);
  });

  it("cancels only the given subscriber's task when a webhookId is provided", async () => {
    const firstReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-1" });
    const secondReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-2" });

    await createTask(firstReference, "triggerHostNoShowWebhook");
    await createTask(secondReference, "triggerHostNoShowWebhook");

    await cancelNoShowTasksForBooking({
      bookingUid,
      triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      webhookId: "webhook-1",
    });

    expect(await getReferenceUids()).toEqual([secondReference]);
  });

  it("leaves guest no-show tasks untouched when cancelling the host trigger", async () => {
    const hostReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-1" });
    const guestReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-2" });

    await createTask(hostReference, "triggerHostNoShowWebhook");
    await createTask(guestReference, "triggerGuestNoShowWebhook");

    await cancelNoShowTasksForBooking({
      bookingUid,
      triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    });

    expect(await getReferenceUids()).toEqual([guestReference]);
  });

  it("cancels tasks that were scheduled before the reference became webhook scoped", async () => {
    await createTask(bookingUid, "triggerHostNoShowWebhook");

    await cancelNoShowTasksForBooking({
      bookingUid,
      triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    });

    expect(await getReferenceUids()).toEqual([]);
  });

  it("cancels every no-show task of the booking when no trigger is given", async () => {
    const hostReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-1" });
    const guestReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-2" });
    const otherBookingReference = getNoShowTaskReferenceUid({
      bookingUid: otherBookingUid,
      webhookId: "webhook-1",
    });

    await createTask(hostReference, "triggerHostNoShowWebhook");
    await createTask(guestReference, "triggerGuestNoShowWebhook");
    await createTask(otherBookingReference, "triggerHostNoShowWebhook");

    await cancelNoShowTasksForBooking({ bookingUid });

    expect(await getReferenceUids()).toEqual([otherBookingReference]);
  });

  it("ignores triggers that are not no-show triggers", async () => {
    const hostReference = getNoShowTaskReferenceUid({ bookingUid, webhookId: "webhook-1" });
    await createTask(hostReference, "triggerHostNoShowWebhook");

    await cancelNoShowTasksForBooking({
      bookingUid,
      triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
    });

    expect(await getReferenceUids()).toEqual([hostReference]);
  });
});
