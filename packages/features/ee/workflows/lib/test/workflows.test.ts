import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  getOrganizer,
  getScenarioData,
  TestData,
  createBookingScenario,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, expect, beforeAll, vi } from "vitest";

import { BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import { deleteRemindersFromRemovedActiveOn } from "@calcom/trpc/server/routers/viewer/workflows/util";
import { test } from "@calcom/web/test/fixtures/fixtures";

beforeAll(() => {
  vi.setSystemTime(new Date("2024-05-20T11:59:59Z"));
});

describe("deleteRemindersFromRemovedActiveOn", () => {
  test("should delete all reminders from removed teams", async ({}) => {
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    // todo: change that

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            userId: organizer.id,
            trigger: "BEFORE_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [1],
          },
        ],
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            useEventTypeDestinationCalendarEmail: true,
            users: [
              {
                id: 101,
              },
            ],
          },
          {
            id: 2,
            slotInterval: 30,
            length: 30,
            useEventTypeDestinationCalendarEmail: true,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            uid: "jK7Rf8iYsOpmQUw9hB1vZxP",
            eventTypeId: 1,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: `2024-05-22T04:00:00.000Z`,
            endTime: `2024-05-22T04:30:00.000Z`,
          },
          {
            uid: "mL4Dx9jTkQbnWEu3pR7yNcF",
            eventTypeId: 1,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: `2024-05-22T04:00:00.000Z`,
            endTime: `2024-05-22T04:30:00.000Z`,
          },
          {
            uid: "Fd9Rf8iYsOpmQUw9hB1vKd8",
            eventTypeId: 2,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: `2024-05-22T04:30:00.000Z`,
            endTime: `2024-05-22T05:00:00.000Z`,
          },
          {
            uid: "Kd8Dx9jTkQbnWEu3pR7yKdl",
            eventTypeId: 2,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: `2024-05-22T04:30:00.000Z`,
            endTime: `2024-05-22T05:00:00.000Z`,
          },
        ],
        organizer,
      })
    );

    const workflow = await prismock.workflow.findFirst({
      select: {
        steps: {
          select: {
            id: true,
            stepNumber: true,
            action: true,
            workflowId: true,
            sendTo: true,
            reminderBody: true,
            emailSubject: true,
            template: true,
            numberRequired: true,
            sender: true,
            numberVerificationPending: true,
            includeCalendarEvent: true,
          },
        },
      },
    });

    const workflowRemindersData = [
      {
        bookingUid: "jK7Rf8iYsOpmQUw9hB1vZxP",
        workflowStepId: workflow?.steps[0]?.id,
        method: WorkflowMethods.EMAIL,
        scheduledDate: `2024-05-22T06:00:00.000Z`,
        scheduled: false,
        retryCount: 0,
      },
      {
        bookingUid: "mL4Dx9jTkQbnWEu3pR7yNcF",
        workflowStepId: workflow?.steps[0]?.id,
        method: WorkflowMethods.EMAIL,
        scheduledDate: `2024-05-22T06:30:00.000Z`,
        scheduled: false,
        retryCount: 0,
      },
      {
        bookingUid: "Fd9Rf8iYsOpmQUw9hB1vKd8",
        workflowStepId: workflow?.steps[0]?.id,
        method: WorkflowMethods.EMAIL,
        scheduledDate: `2024-05-22T06:30:00.000Z`,
        scheduled: false,
        retryCount: 0,
      },
      {
        bookingUid: "Kd8Dx9jTkQbnWEu3pR7yKdl",
        workflowStepId: workflow?.steps[0]?.id,
        method: WorkflowMethods.EMAIL,
        scheduledDate: `2024-05-22T06:30:00.000Z`,
        scheduled: false,
        retryCount: 0,
      },
    ];

    for (const data of workflowRemindersData) {
      prismock.workflowReminder.create({
        data,
      });
    }

    await deleteRemindersFromRemovedActiveOn([1], workflow?.steps || [], false, prismock, [2]);

    const workflowReminders = await prismock.workflowReminder.findMany({
      select: {
        booking: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });
    expect(workflowReminders.filter((reminder) => reminder.booking?.eventTypeId === 1).length).toBe(0);
    expect(workflowReminders.filter((reminder) => reminder.booking?.eventTypeId === 2).length).toBe(2);
  });
});
