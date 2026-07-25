import { DailyLocationType } from "@calcom/app-store/constants";
import type { WebhookSubscriber } from "@calcom/features/webhooks/lib/dto/types";
import { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/tasker", () => ({
  default: { create: vi.fn() },
}));

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn(),
}));

import tasker from "@calcom/features/tasker";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { scheduleNoShowTriggers } from "./scheduleNoShowTriggers";

type CreatedTask = { type: string; payload: unknown; referenceUid?: string };

const booking = {
  id: 101,
  uid: "booking-uid-1",
  startTime: new Date("2024-05-01T10:00:00.000Z"),
  location: DailyLocationType,
};

const buildSubscriber = (id: string, triggerEvent: WebhookTriggerEvents): WebhookSubscriber => ({
  id,
  subscriberUrl: `https://example.com/${id}`,
  payloadTemplate: null,
  appId: null,
  secret: null,
  time: 5,
  timeUnit: TimeUnit.MINUTE,
  eventTriggers: [triggerEvent],
  version: "2021-10-20",
});

/**
 * The Task table enforces `@@unique([referenceUid, type])`, so a fake that ignores that
 * constraint would hide the very collision this suite guards against.
 */
const createTaskerFake = () => {
  const tasks: CreatedTask[] = [];
  const uniqueKeys = new Set<string>();

  const create = vi.fn(async (type: string, payload: unknown, options?: { referenceUid?: string }) => {
    const referenceUid = options?.referenceUid;
    const uniqueKey = `${referenceUid}:${type}`;

    if (referenceUid !== undefined && uniqueKeys.has(uniqueKey)) {
      throw new Error(`Unique constraint failed on the fields: (referenceUid, type) for ${uniqueKey}`);
    }

    uniqueKeys.add(uniqueKey);
    tasks.push({ type, payload, referenceUid });
    return `task-${tasks.length}`;
  });

  return { create, tasks };
};

describe("scheduleNoShowTriggers", () => {
  let taskerFake: ReturnType<typeof createTaskerFake>;

  beforeEach(() => {
    vi.clearAllMocks();
    taskerFake = createTaskerFake();
    vi.mocked(tasker.create).mockImplementation(taskerFake.create as unknown as typeof tasker.create);
  });

  const mockSubscribers = ({
    hosts = [],
    guests = [],
  }: {
    hosts?: WebhookSubscriber[];
    guests?: WebhookSubscriber[];
  }) => {
    vi.mocked(getWebhooks).mockImplementation(async ({ triggerEvent }) =>
      triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ? hosts : guests
    );
  };

  it("schedules an independent task for every host no-show subscriber", async () => {
    mockSubscribers({
      hosts: [
        buildSubscriber("host-webhook-1", WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW),
        buildSubscriber("host-webhook-2", WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW),
      ],
    });

    await scheduleNoShowTriggers({
      booking,
      organizerUser: { id: 1 },
      eventTypeId: 5,
      triggerForUser: true,
    });

    const hostTasks = taskerFake.tasks.filter((task) => task.type === "triggerHostNoShowWebhook");
    expect(hostTasks).toHaveLength(2);
    expect(new Set(hostTasks.map((task) => task.referenceUid)).size).toBe(2);
  });

  it("schedules an independent task for every guest no-show subscriber", async () => {
    mockSubscribers({
      guests: [
        buildSubscriber("guest-webhook-1", WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW),
        buildSubscriber("guest-webhook-2", WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW),
      ],
    });

    await scheduleNoShowTriggers({
      booking,
      organizerUser: { id: 1 },
      eventTypeId: 5,
      triggerForUser: true,
    });

    const guestTasks = taskerFake.tasks.filter((task) => task.type === "triggerGuestNoShowWebhook");
    expect(guestTasks).toHaveLength(2);
    expect(new Set(guestTasks.map((task) => task.referenceUid)).size).toBe(2);
  });

  it("does not reject when several subscribers share the same trigger", async () => {
    mockSubscribers({
      hosts: [
        buildSubscriber("host-webhook-1", WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW),
        buildSubscriber("host-webhook-2", WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW),
      ],
      guests: [
        buildSubscriber("guest-webhook-1", WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW),
        buildSubscriber("guest-webhook-2", WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW),
      ],
    });

    await expect(
      scheduleNoShowTriggers({
        booking,
        organizerUser: { id: 1 },
        eventTypeId: 5,
        triggerForUser: true,
      })
    ).resolves.not.toThrow();

    expect(taskerFake.tasks).toHaveLength(4);
  });

  it("keeps the booking uid recoverable from the task reference so cancellation still matches", async () => {
    mockSubscribers({
      hosts: [buildSubscriber("host-webhook-1", WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW)],
    });

    await scheduleNoShowTriggers({
      booking,
      organizerUser: { id: 1 },
      eventTypeId: 5,
      triggerForUser: true,
    });

    const [hostTask] = taskerFake.tasks;
    expect(hostTask.referenceUid).toMatch(new RegExp(`^${booking.uid}(_|$)`));
  });

  it("skips scheduling for non Cal Video locations", async () => {
    mockSubscribers({
      hosts: [buildSubscriber("host-webhook-1", WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW)],
    });

    await scheduleNoShowTriggers({
      booking: { ...booking, location: "integrations:zoom" },
      organizerUser: { id: 1 },
      eventTypeId: 5,
      triggerForUser: true,
    });

    expect(taskerFake.tasks).toHaveLength(0);
  });
});
