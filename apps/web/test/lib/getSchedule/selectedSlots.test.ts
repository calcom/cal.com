import {
  createBookingScenario,
  getGoogleCalendarCredential,
  mockCalendarToHaveNoBusySlots,
  type ScenarioData,
  TestData,
  Timezones,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import type { IncomingMessage } from "node:http";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { GetScheduleOptions, getScheduleSchema } from "@calcom/trpc/server/routers/viewer/slots/types";
import { beforeEach, describe, test, vi } from "vitest";
import type { z } from "zod";
import { expect } from "./expects";
import { setupAndTeardown } from "./setupAndTeardown";

type ScheduleScenario = {
  eventTypes: ScenarioData["eventTypes"];
  users: ScenarioData["users"];
  apps: ScenarioData["apps"];
  selectedSlots?: ScenarioData["selectedSlots"];
};

const getTestScheduleInput = ({
  yesterdayDateString,
  plus5DateString,
}: {
  yesterdayDateString: string;
  plus5DateString: string;
}): z.infer<typeof getScheduleSchema> => ({
  eventTypeId: 1,
  eventTypeSlug: "",
  startTime: `${yesterdayDateString}T18:30:00.000Z`,
  endTime: `${plus5DateString}T18:29:59.999Z`,
  timeZone: Timezones["+5:30"],
  isTeamEvent: false,
  orgSlug: null,
});

const getBaseScenarioData = (): ScheduleScenario => ({
  eventTypes: [
    {
      id: 1,
      slotInterval: 45,
      length: 45,
      users: [{ id: 101 }],
    },
  ],
  users: [
    {
      ...TestData.users.example,
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    },
  ],
  apps: [TestData.apps["google-calendar"]],
});

describe("getSchedule", () => {
  const availableSlotsService = getAvailableSlotsService();
  setupAndTeardown();

  describe("Reserved Slots", () => {
    beforeEach(async () => {
      // Clear any existing selected slots before each test
      await prisma.selectedSlots.deleteMany({});
    });

    test("should block slot from being available when reserved by another user", async () => {
      // In IST timezone, it is 2024-05-31T07:00:00
      vi.setSystemTime("2024-05-31T01:30:00Z");
      const yesterdayDateString = "2024-05-30";
      const plus2DateString = "2024-06-02";
      const plus5DateString = "2024-06-05";

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        selectedSlots: [
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
            uid: "other-user-uid",
            releaseAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
          },
        ],
      };

      await createBookingScenario(scenarioData);

      await mockCalendarToHaveNoBusySlots("googlecalendar");

      const schedule = await availableSlotsService.getAvailableSlots({
        input: getTestScheduleInput({ yesterdayDateString, plus5DateString }),
      });

      // The 4:00 slot should not be available as it's reserved by another user
      expect(schedule).not.toHaveTimeSlots([`04:00:00.000Z`], {
        dateString: plus2DateString,
      });
    });

    test("should keep all slots available when slot is reserved by the same user", async () => {
      // In IST timezone, it is 2024-05-31T07:00:00
      vi.setSystemTime("2024-05-31T01:30:00Z");
      const yesterdayDateString = "2024-05-30";
      const plus2DateString = "2024-06-02";
      const plus5DateString = "2024-06-05";

      const bookerClientUid = "same-user-uid";

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        selectedSlots: [
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
            uid: bookerClientUid,
            releaseAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
          },
        ],
      };

      await createBookingScenario(scenarioData);

      await mockCalendarToHaveNoBusySlots("googlecalendar");

      const schedule = await availableSlotsService.getAvailableSlots({
        input: getTestScheduleInput({ yesterdayDateString, plus5DateString }),
        ctx: {
          req: {
            cookies: {
              uid: bookerClientUid,
            },
          } as IncomingMessage & { cookies: { uid: string } },
        },
      } satisfies GetScheduleOptions);

      // All slots should be available as they're reserved by the same user
      expect(schedule).toHaveTimeSlots(
        [
          "04:00:00.000Z",
          "04:45:00.000Z",
          "05:30:00.000Z",
          "06:15:00.000Z",
          "07:00:00.000Z",
          "07:45:00.000Z",
          "08:30:00.000Z",
          "09:15:00.000Z",
          "10:00:00.000Z",
          "10:45:00.000Z",
          "11:30:00.000Z",
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("should make all slots available when reservation is expired", async () => {
      // In IST timezone, it is 2024-05-31T07:00:00
      vi.setSystemTime("2024-05-31T01:30:00Z");
      const yesterdayDateString = "2024-05-30";
      const plus2DateString = "2024-06-02";
      const plus5DateString = "2024-06-05";

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        selectedSlots: [
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
            uid: "expired-slot-uid",
            releaseAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (expired)
          },
        ],
      };

      await createBookingScenario(scenarioData);

      await mockCalendarToHaveNoBusySlots("googlecalendar");

      const schedule = await availableSlotsService.getAvailableSlots({
        input: getTestScheduleInput({ yesterdayDateString, plus5DateString }),
      });

      // All slots should be available as the reservation is expired
      expect(schedule).toHaveTimeSlots(
        [
          "04:00:00.000Z",
          "04:45:00.000Z",
          "05:30:00.000Z",
          "06:15:00.000Z",
          "07:00:00.000Z",
          "07:45:00.000Z",
          "08:30:00.000Z",
          "09:15:00.000Z",
          "10:00:00.000Z",
          "10:45:00.000Z",
          "11:30:00.000Z",
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("should show correct attendee count as per reserved slots", async () => {
      // In IST timezone, it is 2024-05-31T07:00:00
      vi.setSystemTime("2024-05-31T01:30:00Z");
      const yesterdayDateString = "2024-05-30";
      const plus2DateString = "2024-06-02";
      const plus5DateString = "2024-06-05";

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        eventTypes: [
          {
            ...getBaseScenarioData().eventTypes[0],
            seatsPerTimeSlot: 5, // Total seats available
          },
        ],
        selectedSlots: [
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
            uid: "other-user-uid",
            releaseAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
            isSeat: true,
          },
        ],
      };

      await createBookingScenario(scenarioData);

      await mockCalendarToHaveNoBusySlots("googlecalendar");

      const schedule = await availableSlotsService.getAvailableSlots({
        input: getTestScheduleInput({ yesterdayDateString, plus5DateString }),
      });

      // The 4:00 slot should show 1 seat taken
      const slot = schedule.slots[plus2DateString].find(
        (slot) => slot.time === `${plus2DateString}T04:00:00.000Z`
      );
      expect(slot).toBeDefined();
      expect(slot?.attendees).toBe(1);
    });

    test("should block slots even when reservation is for a different event type", async () => {
      // In IST timezone, it is 2024-05-31T07:00:00
      vi.setSystemTime("2024-05-31T01:30:00Z");
      const yesterdayDateString = "2024-05-30";
      const plus2DateString = "2024-06-02";
      const plus5DateString = "2024-06-05";
      const differentEventTypeId = 2;
      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        eventTypes: [
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [{ id: 101 }],
          },
          {
            id: differentEventTypeId,
            slotInterval: 45,
            length: 45,
            users: [{ id: 101 }],
          },
        ],
        selectedSlots: [
          {
            eventTypeId: differentEventTypeId, // Different event type
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
            uid: "other-user-uid",
            releaseAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
          },
        ],
      };

      await createBookingScenario(scenarioData);

      await mockCalendarToHaveNoBusySlots("googlecalendar");

      const schedule = await availableSlotsService.getAvailableSlots({
        input: getTestScheduleInput({ yesterdayDateString, plus5DateString }),
      });

      // The 4:00 slot should still be unavailable even when the reservation is for a different event type
      expect(schedule).toHaveTimeSlots(
        [
          // "04:00:00.000Z",
          "04:45:00.000Z",
          "05:30:00.000Z",
          "06:15:00.000Z",
          "07:00:00.000Z",
          "07:45:00.000Z",
          "08:30:00.000Z",
          "09:15:00.000Z",
          "10:00:00.000Z",
          "10:45:00.000Z",
          "11:30:00.000Z",
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("should clean up only expired slots", async () => {
      // In IST timezone, it is 2024-05-31T07:00:00
      vi.setSystemTime("2024-05-31T01:30:00Z");
      const yesterdayDateString = "2024-05-30";
      const plus2DateString = "2024-06-02";
      const plus5DateString = "2024-06-05";

      const bookerClientUid = "same-user-uid";
      const expiredTime = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago (expired)
      const notExpiredTime = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now (not expired)
      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        selectedSlots: [
          // Will be deleted
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T04:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T04:45:00.000Z`),
            uid: bookerClientUid,
            releaseAt: expiredTime,
          },
          // Will be not deleted
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T05:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T05:45:00.000Z`),
            uid: bookerClientUid,
            releaseAt: notExpiredTime,
          },
          // Will be not deleted
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T06:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T06:45:00.000Z`),
            uid: "another-user-uid",
            releaseAt: notExpiredTime,
          },
          // Will be deleted
          {
            eventTypeId: 1,
            userId: 101,
            slotUtcStartDate: new Date(`${plus2DateString}T07:00:00.000Z`),
            slotUtcEndDate: new Date(`${plus2DateString}T07:45:00.000Z`),
            uid: "another-user-uid",
            releaseAt: expiredTime,
          },
        ],
      };

      await createBookingScenario(scenarioData);

      await availableSlotsService.getAvailableSlots({
        input: getTestScheduleInput({ yesterdayDateString, plus5DateString }),
        ctx: {
          req: {
            cookies: {
              uid: bookerClientUid,
            },
          } as IncomingMessage & { cookies: { uid: string } },
        },
      } satisfies GetScheduleOptions);

      // Verify that both slots are cleaned up from DB for this event type
      const remainingSlots = await prisma.selectedSlots.findMany({
        where: {
          userId: 101,
          eventTypeId: 1,
        },
      });

      // There are two unexpired slots
      expect(remainingSlots).toHaveLength(2);
    });
  });
});
