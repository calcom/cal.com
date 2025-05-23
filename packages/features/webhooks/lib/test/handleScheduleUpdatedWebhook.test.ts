import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { expectWebhookToHaveBeenCalledWith } from "@calcom/web/test/utils/bookingScenario/expects";

import { afterEach, beforeEach, describe, expect, vi } from "vitest";

import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { buildWebhook } from "@calcom/lib/test/builder";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { createHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/create.handler";
import { deleteHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/delete.handler";
import { updateHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.handler";
import { test } from "@calcom/web/test/fixtures/fixtures";

describe("Schedule Updated Webhook Trigger Tests", () => {
  let user;
  let ctx;

  beforeEach(async () => {
    fetchMock.resetMocks();

    vi.mock("@calcom/lib/server/repository/user", () => ({
      UserRepository: {
        findTeamsByUserId: () =>
          Promise.resolve({
            teams: [],
            memberships: [],
            acceptedTeamMemberships: [],
            pendingTeamMemberships: [],
          }),
      },
    }));

    vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
      default: () => Promise.resolve(null),
    }));

    user = await prismock.user.create({
      data: {
        id: 1,
        username: "test-user",
        email: "test@example.com",
        name: "Test User",
        timeZone: "Europe/London",
      },
    });

    await prismock.webhook.create({
      data: buildWebhook({
        userId: user.id,
        active: true,
        eventTriggers: [WebhookTriggerEvents.SCHEDULE_UPDATED],
        subscriberUrl: "https://example.com/webhook",
      }),
    });

    ctx = {
      user: {
        id: user.id,
        defaultScheduleId: null,
        email: user.email,
        name: user.name,
        username: user.username,
        timeZone: user.timeZone,
      },
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
    fetchMock.resetMocks();
  });

  test("Schedule Creation: should trigger webhook when schedule is created", async () => {
    const input = {
      name: "Test Schedule",
      schedule: DEFAULT_SCHEDULE,
    };

    await createHandler({ ctx, input });

    const createdSchedule = await prismock.schedule.findFirst({
      where: { name: "Test Schedule" },
      include: { availability: true },
    });

    expect(createdSchedule).not.toBeNull();
    expect(createdSchedule?.name).toBe("Test Schedule");

    const availability = createdSchedule?.availability.map((avail) => ({
      days: avail.days,
      startTime: avail.startTime.toISOString(),
      endTime: avail.endTime.toISOString(),
      date: avail.date?.toISOString() || undefined,
    }));

    expectWebhookToHaveBeenCalledWith("https://example.com/webhook", {
      triggerEvent: WebhookTriggerEvents.SCHEDULE_UPDATED,
      payload: {
        event: "Schedule Created",
        userId: user.id,
        scheduleId: createdSchedule?.id,
        scheduleName: "Test Schedule",
        newAvailability: availability,
        timeZone: user.timeZone,
      },
    });
  });

  test("Schedule Update: should trigger webhook when schedule is updated", async () => {
    const schedule = await prismock.schedule.create({
      data: {
        name: "Test Schedule",
        userId: user.id,
        timeZone: user.timeZone,
        availability: {
          createMany: {
            data: [
              {
                days: [0, 1, 2, 3, 4],
                startTime: new Date(new Date().setUTCHours(9, 0, 0, 0)),
                endTime: new Date(new Date().setUTCHours(17, 0, 0, 0)),
              },
            ],
          },
        },
      },
      include: {
        availability: true,
      },
    });

    const updatedSchedule = [
      [
        {
          day: 0,
          start: new Date(new Date().setUTCHours(10, 0, 0, 0)),
          end: new Date(new Date().setUTCHours(18, 0, 0, 0)),
        },
        {
          day: 1,
          start: new Date(new Date().setUTCHours(10, 0, 0, 0)),
          end: new Date(new Date().setUTCHours(18, 0, 0, 0)),
        },
        {
          day: 2,
          start: new Date(new Date().setUTCHours(10, 0, 0, 0)),
          end: new Date(new Date().setUTCHours(18, 0, 0, 0)),
        },
        {
          day: 3,
          start: new Date(new Date().setUTCHours(10, 0, 0, 0)),
          end: new Date(new Date().setUTCHours(18, 0, 0, 0)),
        },
        {
          day: 4,
          start: new Date(new Date().setUTCHours(10, 0, 0, 0)),
          end: new Date(new Date().setUTCHours(18, 0, 0, 0)),
        },
      ],
    ];

    const updateInput = {
      scheduleId: schedule.id,
      name: "Updated Test Schedule",
      schedule: updatedSchedule,
      timeZone: user.timeZone,
    };

    await updateHandler({ ctx, input: updateInput });

    const updatedScheduleFromDb = await prismock.schedule.findFirst({
      where: { id: schedule.id },
      include: { availability: true },
    });

    expect(updatedScheduleFromDb).not.toBeNull();
    expect(updatedScheduleFromDb?.name).toBe("Updated Test Schedule");

    const prevAvailability = schedule.availability.map((avail) => ({
      days: avail.days,
      startTime: avail.startTime.toISOString(),
      endTime: avail.endTime.toISOString(),
      date: avail.date?.toISOString() || undefined,
    }));

    const newAvailability = updatedScheduleFromDb?.availability.map((avail) => ({
      days: avail.days,
      startTime: avail.startTime.toISOString(),
      endTime: avail.endTime.toISOString(),
      date: avail.date?.toISOString() || undefined,
    }));

    expectWebhookToHaveBeenCalledWith("https://example.com/webhook", {
      triggerEvent: WebhookTriggerEvents.SCHEDULE_UPDATED,
      payload: {
        event: "Schedule Updated",
        userId: user.id,
        scheduleId: schedule.id,
        scheduleName: "Updated Test Schedule",
        prevAvailability: prevAvailability,
        newAvailability: newAvailability,
        timeZone: user.timeZone,
      },
    });
  });

  test("Schedule Deletion: should trigger webhook when schedule is deleted", async () => {
    const backupSchedule = await prismock.schedule.create({
      data: {
        name: "Backup Schedule",
        userId: user.id,
        timeZone: user.timeZone,
        availability: {
          createMany: {
            data: [
              {
                days: [0, 1, 2, 3, 4],
                startTime: new Date(new Date().setUTCHours(9, 0, 0, 0)),
                endTime: new Date(new Date().setUTCHours(17, 0, 0, 0)),
              },
            ],
          },
        },
      },
    });

    ctx.user.defaultScheduleId = backupSchedule.id;

    const scheduleToDelete = await prismock.schedule.create({
      data: {
        name: "Schedule To Delete",
        userId: user.id,
        timeZone: user.timeZone,
        availability: {
          createMany: {
            data: [
              {
                days: [0, 1, 2, 3, 4],
                startTime: new Date(new Date().setUTCHours(10, 0, 0, 0)),
                endTime: new Date(new Date().setUTCHours(18, 0, 0, 0)),
              },
            ],
          },
        },
      },
      include: {
        availability: true,
      },
    });

    const deleteInput = {
      scheduleId: scheduleToDelete.id,
    };

    const prevAvailability = scheduleToDelete.availability.map((avail) => ({
      days: avail.days,
      startTime: avail.startTime.toISOString(),
      endTime: avail.endTime.toISOString(),
      date: avail.date?.toISOString() || undefined,
    }));

    await deleteHandler({ ctx, input: deleteInput });

    const deletedSchedule = await prismock.schedule.findFirst({
      where: { id: scheduleToDelete.id },
    });

    expect(deletedSchedule).toBeNull();

    expectWebhookToHaveBeenCalledWith("https://example.com/webhook", {
      triggerEvent: WebhookTriggerEvents.SCHEDULE_UPDATED,
      payload: {
        event: "Schedule Deleted",
        userId: user.id,
        scheduleId: scheduleToDelete.id,
        scheduleName: "Schedule To Delete",
        prevAvailability: prevAvailability,
        newAvailability: [],
        timeZone: user.timeZone,
      },
    });
  });
});
