import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  getOrganizer,
  getScenarioData,
  TestData,
  createBookingScenario,
  createOrganization,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectSMSWorkflowToBeTriggered,
  expectSMSWorkflowToBeNotTriggered,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, beforeAll, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { BookingStatus, WorkflowMethods, TimeUnit } from "@calcom/prisma/enums";
import {
  deleteRemindersOfActiveOnIds,
  scheduleBookingReminders,
  bookingSelect,
} from "@calcom/trpc/server/routers/viewer/workflows/util";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { deleteWorkfowRemindersOfRemovedMember } from "../../../teams/lib/deleteWorkflowRemindersOfRemovedMember";

const workflowSelect = {
  id: true,
  userId: true,
  isActiveOnAll: true,
  trigger: true,
  time: true,
  timeUnit: true,
  team: {
    select: {
      isOrganization: true,
    },
  },
  teamId: true,
  user: {
    select: {
      teams: true,
    },
  },
  steps: true,
  activeOn: true,
  activeOnTeams: true,
};

beforeAll(() => {
  vi.setSystemTime(new Date("2024-05-20T11:59:59Z"));
});

const mockEventTypes = [
  {
    id: 1,
    slotInterval: 30,
    length: 30,
    useEventTypeDestinationCalendarEmail: true,
    owner: 101,
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
    owner: 101,
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
    startTime: `2024-05-20T14:00:00.000Z`,
    endTime: `2024-05-20T14:30:00.000Z`,
    attendees: [{ email: "attendee@example.com", locale: "en" }],
  },
  {
    uid: "mL4Dx9jTkQbnWEu3pR7yNcF",
    eventTypeId: 1,
    userId: 101,
    status: BookingStatus.ACCEPTED,
    startTime: `2024-05-20T14:30:00.000Z`,
    endTime: `2024-05-20T15:00:00.000Z`,
    attendees: [{ email: "attendee@example.com", locale: "en" }],
  },
  {
    uid: "Fd9Rf8iYsOpmQUw9hB1vKd8",
    eventTypeId: 2,
    userId: 101,
    status: BookingStatus.ACCEPTED,
    startTime: `2024-06-01T04:30:00.000Z`,
    endTime: `2024-06-01T05:00:00.000Z`,
    attendees: [{ email: "attendee@example.com", locale: "en" }],
  },
  {
    uid: "Kd8Dx9jTkQbnWEu3pR7yKdl",
    eventTypeId: 2,
    userId: 101,
    status: BookingStatus.ACCEPTED,
    startTime: `2024-06-02T04:30:00.000Z`,
    endTime: `2024-06-02T05:00:00.000Z`,
    attendees: [{ email: "attendee@example.com", locale: "en" }],
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
    await prismock.workflowReminder.create({
      data,
    });
  }

  return workflow;
}

describe("deleteRemindersOfActiveOnIds", () => {
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
            time: 1,
            timeUnit: TimeUnit.HOUR,
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

    await deleteRemindersOfActiveOnIds({
      removedActiveOnIds,
      workflowSteps: workflow?.steps || [],
      isOrg: false,
      activeOnIds,
    });

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
            activeOnTeams: [2, 3, 4],
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
    await deleteRemindersOfActiveOnIds({
      removedActiveOnIds,
      workflowSteps: workflow?.steps || [],
      isOrg: true,
      activeOnIds,
    });

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
    await deleteRemindersOfActiveOnIds({
      removedActiveOnIds,
      workflowSteps: workflow?.steps || [],
      isOrg: true,
      activeOnIds,
    });

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

describe("scheduleBookingReminders", () => {
  setupAndTeardown();

  test("schedules workflow notifications with before event trigger and email to host action", async ({}) => {
    // organizer is part of org and two teams
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      defaultScheduleId: null,
      schedules: [TestData.schedules.IstMorningShift],
    });

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            name: "Workflow",
            userId: 101,
            trigger: "BEFORE_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [],
            time: 1,
            timeUnit: TimeUnit.HOUR,
          },
        ],
        eventTypes: mockEventTypes,
        bookings: mockBookings,
        organizer,
      })
    );

    const workflow = await prismock.workflow.findFirst({
      select: workflowSelect,
    });

    const bookings = await prismock.booking.findMany({
      where: {
        userId: organizer.id,
      },
      select: bookingSelect,
    });

    expect(workflow).not.toBeNull();

    if (!workflow) return;

    await scheduleBookingReminders(
      bookings,
      workflow.steps,
      workflow.time,
      workflow.timeUnit,
      workflow.trigger,
      organizer.id,
      null //teamId
    );

    const scheduledWorkflowReminders = await prismock.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflowId: workflow.id,
        },
      },
    });
    scheduledWorkflowReminders.sort((a, b) =>
      dayjs(a.scheduledDate).isBefore(dayjs(b.scheduledDate)) ? -1 : 1
    );

    const expectedScheduledDates = [
      new Date("2024-05-20T13:00:00.000"),
      new Date("2024-05-20T13:30:00.000Z"),
      new Date("2024-06-01T03:30:00.000Z"),
      new Date("2024-06-02T03:30:00.000Z"),
    ];

    scheduledWorkflowReminders.forEach((reminder, index) => {
      expect(expectedScheduledDates[index].toISOString()).toStrictEqual(reminder.scheduledDate.toISOString());
      expect(reminder.method).toBe(WorkflowMethods.EMAIL);
      if (index < 2) {
        expect(reminder.scheduled).toBe(true);
      } else {
        expect(reminder.scheduled).toBe(false);
      }
    });
  });

  test("schedules workflow notifications with after event trigger and email to host action", async ({}) => {
    // organizer is part of org and two teams
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      defaultScheduleId: null,
      schedules: [TestData.schedules.IstMorningShift],
    });

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            name: "Workflow",
            userId: 101,
            trigger: "AFTER_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [],
            time: 1,
            timeUnit: TimeUnit.HOUR,
          },
        ],
        eventTypes: mockEventTypes,
        bookings: mockBookings,
        organizer,
      })
    );

    const workflow = await prismock.workflow.findFirst({
      select: workflowSelect,
    });

    const bookings = await prismock.booking.findMany({
      where: {
        userId: organizer.id,
      },
      select: bookingSelect,
    });

    expect(workflow).not.toBeNull();

    if (!workflow) return;

    await scheduleBookingReminders(
      bookings,
      workflow.steps,
      workflow.time,
      workflow.timeUnit,
      workflow.trigger,
      organizer.id,
      null //teamId
    );

    const scheduledWorkflowReminders = await prismock.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflowId: workflow.id,
        },
      },
    });
    scheduledWorkflowReminders.sort((a, b) =>
      dayjs(a.scheduledDate).isBefore(dayjs(b.scheduledDate)) ? -1 : 1
    );

    const expectedScheduledDates = [
      new Date("2024-05-20T15:30:00.000"),
      new Date("2024-05-20T16:00:00.000Z"),
      new Date("2024-06-01T06:00:00.000Z"),
      new Date("2024-06-02T06:00:00.000Z"),
    ];

    scheduledWorkflowReminders.forEach((reminder, index) => {
      expect(expectedScheduledDates[index].toISOString()).toStrictEqual(reminder.scheduledDate.toISOString());
      expect(reminder.method).toBe(WorkflowMethods.EMAIL);
      expect(reminder.scheduled).toBe(false); // all are more than 2 hours in advance
    });
  });

  test("send sms to specific number for bookings", async ({ sms }) => {
    // organizer is part of org and two teams
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      defaultScheduleId: null,
      schedules: [TestData.schedules.IstMorningShift],
    });

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            name: "Workflow",
            userId: 101,
            trigger: "AFTER_EVENT",
            action: "SMS_NUMBER",
            template: "REMINDER",
            activeOn: [],
            time: 3,
            timeUnit: TimeUnit.HOUR,
            sendTo: "000",
          },
        ],
        eventTypes: mockEventTypes,
        bookings: mockBookings,
        organizer,
      })
    );

    const workflow = await prismock.workflow.findFirst({
      select: workflowSelect,
    });

    const bookings = await prismock.booking.findMany({
      where: {
        userId: organizer.id,
      },
      select: bookingSelect,
    });

    expect(workflow).not.toBeNull();

    if (!workflow) return;

    await scheduleBookingReminders(
      bookings,
      workflow.steps,
      workflow.time,
      workflow.timeUnit,
      workflow.trigger,
      organizer.id,
      null //teamId
    );

    // number is not verified, so sms should not send
    expectSMSWorkflowToBeNotTriggered({
      sms,
      toNumber: "000",
    });

    await prismock.verifiedNumber.create({
      data: {
        userId: organizer.id,
        phoneNumber: "000",
      },
    });

    const allVerified = await prismock.verifiedNumber.findMany();
    await scheduleBookingReminders(
      bookings,
      workflow.steps,
      workflow.time,
      workflow.timeUnit,
      workflow.trigger,
      organizer.id,
      null //teamId
    );

    // two sms schould be scheduled
    expectSMSWorkflowToBeTriggered({
      sms,
      toNumber: "000",
      includedString: "2024 May 20 at 7:30pm Asia/Kolkata",
    });

    expectSMSWorkflowToBeTriggered({
      sms,
      toNumber: "000",
      includedString: "2024 May 20 at 8:00pm Asia/Kolkata",
    });

    // sms are too far in future
    expectSMSWorkflowToBeNotTriggered({
      sms,
      toNumber: "000",
      includedString: "2024 June 1 at 10:00am Asia/Kolkata",
    });

    expectSMSWorkflowToBeNotTriggered({
      sms,
      toNumber: "000",
      includedString: "2024 June 2 at 10:00am Asia/Kolkata",
    });

    const scheduledWorkflowReminders = await prismock.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflowId: workflow.id,
        },
      },
    });
    scheduledWorkflowReminders.sort((a, b) =>
      dayjs(a.scheduledDate).isBefore(dayjs(b.scheduledDate)) ? -1 : 1
    );

    const expectedScheduledDates = [
      new Date("2024-05-20T17:30:00.000"),
      new Date("2024-05-20T18:00:00.000Z"),
      new Date("2024-06-01T08:00:00.000Z"),
      new Date("2024-06-02T08:00:00.000Z"),
    ];

    scheduledWorkflowReminders.forEach((reminder, index) => {
      expect(expectedScheduledDates[index].toISOString()).toStrictEqual(reminder.scheduledDate.toISOString());
      expect(reminder.method).toBe(WorkflowMethods.SMS);
      if (index < 2) {
        expect(reminder.scheduled).toBe(true);
      } else {
        expect(reminder.scheduled).toBe(false);
      }
    });
  });
});

describe("deleteWorkfowRemindersOfRemovedMember", () => {
  test("deletes all workflow reminders when member is removed from org", async ({}) => {
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
            activeOnTeams: [2, 3, 4],
          },
        ],
        eventTypes: mockEventTypes,
        bookings: mockBookings,
        organizer,
      })
    );

    await createWorkflowRemindersForWorkflow("Org Workflow");

    await deleteWorkfowRemindersOfRemovedMember(org, 101, true);

    const workflowReminders = await prismock.workflowReminder.findMany();
    expect(workflowReminders.length).toBe(0);
  });

  test("deletes reminders if member is removed from an org team ", async ({}) => {
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
            id: 2,
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
            id: 3,
            name: "Team 2",
            slug: "team-2",
            parentId: org.id,
          },
        },
        {
          membership: {
            accepted: true,
          },
          team: {
            id: 4,
            name: "Team 3",
            slug: "team-3",
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
            name: "Org Workflow 1",
            teamId: 1,
            trigger: "BEFORE_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOnTeams: [2, 3, 4],
          },
          {
            name: "Org Workflow 2",
            teamId: 1,
            trigger: "BEFORE_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOnTeams: [2],
          },
        ],
        eventTypes: mockEventTypes,
        bookings: mockBookings,
        organizer,
      })
    );

    await createWorkflowRemindersForWorkflow("Org Workflow 1");
    await createWorkflowRemindersForWorkflow("Org Workflow 2");

    const tes = await prismock.membership.findMany();

    await prismock.membership.delete({
      where: {
        userId: 101,
        teamId: 2,
      },
    });

    await deleteWorkfowRemindersOfRemovedMember({ id: 2, parentId: org.id }, 101, false);

    const workflowReminders = await prismock.workflowReminder.findMany({
      select: {
        workflowStep: {
          select: {
            workflow: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const workflow1Reminders = workflowReminders.filter(
      (reminder) => reminder.workflowStep?.workflow.name === "Org Workflow 1"
    );
    const workflow2Reminders = workflowReminders.filter(
      (reminder) => reminder.workflowStep?.workflow.name === "Org Workflow 2"
    );

    expect(workflow1Reminders.length).toBe(4);
    expect(workflow2Reminders.length).toBe(0);
  });
});
