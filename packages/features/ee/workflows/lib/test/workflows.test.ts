import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  getOrganizer,
  getScenarioData,
  TestData,
  createBookingScenario,
  createOrganization,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, expect, beforeAll, vi } from "vitest";

import { BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import { deleteRemindersOfActiveOnIds } from "@calcom/trpc/server/routers/viewer/workflows/util";
import { test } from "@calcom/web/test/fixtures/fixtures";

beforeAll(() => {
  vi.setSystemTime(new Date("2024-05-20T11:59:59Z"));
});

const mockEventTypes = [
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
];

const mockBookings = [
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
];

async function createWorkflowRemindersForWorkflow(workflowName: string) {
  const workflow = await prismock.workflow.findFirst({
    where: {
      name: workflowName,
    },
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
      booking: {
        connect: {
          bookingUid: "jK7Rf8iYsOpmQUw9hB1vZxP",
        },
      },
      bookingUid: "jK7Rf8iYsOpmQUw9hB1vZxP",
      workflowStepId: workflow?.steps[0]?.id,
      method: WorkflowMethods.EMAIL,
      scheduledDate: `2024-05-22T06:00:00.000Z`,
      scheduled: false,
      retryCount: 0,
    },
    {
      booking: {
        connect: {
          bookingUid: "mL4Dx9jTkQbnWEu3pR7yNcF",
        },
      },
      bookingUid: "mL4Dx9jTkQbnWEu3pR7yNcF",
      workflowStepId: workflow?.steps[0]?.id,
      method: WorkflowMethods.EMAIL,
      scheduledDate: `2024-05-22T06:30:00.000Z`,
      scheduled: false,
      retryCount: 0,
    },
    {
      booking: {
        connect: {
          bookingUid: "Fd9Rf8iYsOpmQUw9hB1vKd8",
        },
      },
      bookingUid: "Fd9Rf8iYsOpmQUw9hB1vKd8",
      workflowStepId: workflow?.steps[0]?.id,
      method: WorkflowMethods.EMAIL,
      scheduledDate: `2024-05-22T06:30:00.000Z`,
      scheduled: false,
      retryCount: 0,
    },
    {
      booking: {
        connect: {
          bookingUid: "Kd8Dx9jTkQbnWEu3pR7yKdl",
        },
      },
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

  return workflow;
}

describe("deleteRemindersFromRemovedActiveOn", () => {
  test("should delete all reminders from removed event types", async ({}) => {
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            name: "User Workflow",
            userId: organizer.id,
            trigger: "BEFORE_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [1],
          },
        ],
        eventTypes: mockEventTypes,
        bookings: mockBookings,
        organizer,
      })
    );

    const workflow = await createWorkflowRemindersForWorkflow("User Workflow");

    const removedActiveOnIds = [1];
    const activeOnIds = [2];

    await deleteRemindersOfActiveOnIds(
      removedActiveOnIds,
      workflow?.steps || [],
      false,
      prismock,
      activeOnIds
    );

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

  test("should delete all reminders from removed event types (org workflow)", async ({}) => {
    const org = await createOrganization({
      name: "Test Org",
      slug: "testorg",
      withTeam: true,
    });

    // organizer is part of org and two teams
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      defaultScheduleId: null,
      organizationId: org.id,
      teams: [
        {
          membership: {
            accepted: true,
          },
          team: {
            id: 3,
            name: "Team 1",
            slug: "team-1",
            parentId: org.id,
          },
        },
        {
          membership: {
            accepted: true,
          },
          team: {
            id: 4,
            name: "Team 2",
            slug: "team-2",
            parentId: org.id,
          },
        },
      ],
      schedules: [TestData.schedules.IstMorningShift],
    });

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            name: "Org Workflow",
            teamId: 1,
            trigger: "BEFORE_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [2, 3, 4],
          },
        ],
        eventTypes: mockEventTypes,
        bookings: mockBookings,
        organizer,
      })
    );

    const workflow = await createWorkflowRemindersForWorkflow("Org Workflow");

    let removedActiveOnIds = [1];
    const activeOnIds = [2];

    //workflow removed from team 2, but still acitve on team 3 --> so reminder should not be removed
    await deleteRemindersOfActiveOnIds(
      removedActiveOnIds,
      workflow?.steps || [],
      true,
      prismock,
      activeOnIds
    );

    // get all reminders from organizer's bookings
    const workflowRemindersWithOneTeamActive = await prismock.workflowReminder.findMany({
      where: {
        booking: {
          userId: organizer.id,
        },
      },
    });

    removedActiveOnIds = [3];

    // should still be active on all 4 bookings
    expect(workflowRemindersWithOneTeamActive.length).toBe(4);
    await deleteRemindersOfActiveOnIds(
      removedActiveOnIds,
      workflow?.steps || [],
      true,
      prismock,
      activeOnIds
    );

    const workflowRemindersWithNoTeamActive = await prismock.workflowReminder.findMany({
      where: {
        booking: {
          userId: organizer.id,
        },
      },
    });

    expect(workflowRemindersWithNoTeamActive.length).toBe(0);
  });
});
