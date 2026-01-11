import prismock from "@calcom/testing/lib/__mocks__/prisma";

import {
  getOrganizer,
  getScenarioData,
  TestData,
  createBookingScenario,
  createOrganization,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import {
  expectSMSWorkflowToBeTriggered,
  expectSMSWorkflowToBeNotTriggered,
} from "@calcom/testing/lib/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { v4 as uuidv4 } from "uuid";
import { describe, expect, beforeAll, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { scheduleBookingReminders } from "@calcom/features/ee/workflows/lib/scheduleBookingReminders";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import tasker from "@calcom/features/tasker";
import * as rateLimitModule from "@calcom/lib/checkRateLimitAndThrowError";
import type { Prisma } from "@calcom/prisma/client";
import {
  BookingStatus,
  WorkflowMethods,
  TimeUnit,
  WorkflowTriggerEvents,
  WorkflowActions,
} from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { deleteWorkfowRemindersOfRemovedMember } from "../../../teams/lib/deleteWorkflowRemindersOfRemovedMember";
import { deleteRemindersOfActiveOnIds } from "../deleteRemindersOfActiveOnIds";
import { scheduleAIPhoneCall } from "../reminders/aiPhoneCallManager";
import { scheduleEmailReminder } from "../reminders/emailReminderManager";
import * as emailProvider from "../reminders/providers/emailProvider";
import { bookingSelect } from "../scheduleWorkflowNotifications";

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
} satisfies Prisma.WorkflowSelect;

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
//2024-05-20T11:59:59Z
const mockBookings = [
  {
    uid: "jK7Rf8iYsOpmQUw9hB1vZxP",
    eventTypeId: 1,
    userId: 101,
    status: BookingStatus.ACCEPTED,
    startTime: `2024-05-21T09:00:00.000Z`,
    endTime: `2024-05-21T09:15:00.000Z`,
    attendees: [{ email: "attendee@example.com", locale: "en" }],
  },
  {
    uid: "mL4Dx9jTkQbnWEu3pR7yNcF",
    eventTypeId: 1,
    userId: 101,
    status: BookingStatus.ACCEPTED,
    startTime: `2024-05-21T09:15:00.000Z`,
    endTime: `2024-05-21T09:30:00.000Z`,
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

async function createWorkflowRemindersAndTasksForWorkflow(workflowName: string) {
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
          verifiedAt: true,
        },
      },
    },
  });

  const workflowRemindersData: Prisma.WorkflowReminderCreateInput[] = [
    {
      booking: {
        connect: {
          uid: "jK7Rf8iYsOpmQUw9hB1vZxP",
        },
      },
      uuid: uuidv4(),
      workflowStep: {
        connect: {
          id: workflow?.steps[0]?.id,
        },
      },
      method: WorkflowMethods.EMAIL,
      scheduledDate: `2024-05-22T06:00:00.000Z`,
      scheduled: false,
      retryCount: 0,
    },
    {
      booking: {
        connect: {
          uid: "mL4Dx9jTkQbnWEu3pR7yNcF",
        },
      },
      uuid: uuidv4(),
      workflowStep: {
        connect: {
          id: workflow?.steps[0]?.id,
        },
      },
      method: WorkflowMethods.EMAIL,
      scheduledDate: `2024-05-22T06:30:00.000Z`,
      scheduled: false,
      retryCount: 0,
    },
    {
      booking: {
        connect: {
          uid: "Fd9Rf8iYsOpmQUw9hB1vKd8",
        },
      },
      uuid: uuidv4(),
      workflowStep: {
        connect: {
          id: workflow?.steps[0]?.id,
        },
      },
      method: WorkflowMethods.EMAIL,
      scheduledDate: `2024-05-22T06:30:00.000Z`,
      scheduled: false,
      retryCount: 0,
    },
    {
      booking: {
        connect: {
          uid: "Kd8Dx9jTkQbnWEu3pR7yKdl",
        },
      },
      uuid: uuidv4(),
      workflowStep: {
        connect: {
          id: workflow?.steps[0]?.id,
        },
      },
      method: WorkflowMethods.EMAIL,
      scheduledDate: `2024-05-22T06:30:00.000Z`,
      scheduled: false,
      retryCount: 0,
    },
  ];

  const tasksData = workflowRemindersData.map((reminder) => ({
    type: "sendWorkflowEmails",
    createdAt: new Date(),
    updatedAt: new Date(),
    referenceUid: reminder.uuid,
    payload: "",
    scheduledAt: reminder.scheduledDate,
    attempts: 0,
    maxAttempts: 3,
  }));

  for (const data of workflowRemindersData) {
    await prismock.workflowReminder.create({
      data,
    });
  }

  for (const data of tasksData) {
    await prismock.task.create({
      data,
    });
  }

  return workflow;
}

vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    IS_SMS_CREDITS_ENABLED: false,
  };
});

describe("deleteRemindersOfActiveOnIds", () => {
  test("should delete all reminders and tasks from removed event types", async () => {
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

    const workflow = await createWorkflowRemindersAndTasksForWorkflow("User Workflow");

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
        uuid: true,
        booking: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });

    expect(workflowReminders.filter((reminder) => reminder.booking?.eventTypeId === 1).length).toBe(0);
    expect(workflowReminders.filter((reminder) => reminder.booking?.eventTypeId === 2).length).toBe(2);

    const tasks = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    expect(tasks.map((task) => task.referenceUid)).toEqual(
      workflowReminders.map((reminder) => reminder.uuid)
    );
  });

  test("should delete all reminders from removed event types (org workflow)", async () => {
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

    const workflow = await createWorkflowRemindersAndTasksForWorkflow("Org Workflow");

    let removedActiveOnIds = [1];
    const activeOnIds = [2];

    //workflow removed from team 2, but still active on team 3 --> so reminder should not be removed
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

    const tasksWithOneTeamActive = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    expect(tasksWithOneTeamActive.map((task) => task.referenceUid)).toEqual(
      workflowRemindersWithOneTeamActive.map((reminder) => reminder.uuid)
    );

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

    const tasksWithNoTeamActive = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    expect(tasksWithNoTeamActive.map((task) => task.referenceUid)).toEqual(
      workflowRemindersWithNoTeamActive.map((reminder) => reminder.uuid)
    );
  });
});

describe("scheduleBookingReminders", () => {
  setupAndTeardown();

  test("schedules workflow notifications with before event trigger and email to host action", async () => {
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
      null, //teamId
      false //isOrg
    );

    const scheduledWorkflowReminders = await prismock.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflowId: workflow.id,
        },
      },
    });

    const tasks = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    scheduledWorkflowReminders.sort((a, b) =>
      dayjs(a.scheduledDate).isBefore(dayjs(b.scheduledDate)) ? -1 : 1
    );

    const expectedScheduledDates = [
      new Date("2024-05-21T08:00:00.000"),
      new Date("2024-05-21T08:15:00.000Z"),
      new Date("2024-06-01T03:30:00.000Z"),
      new Date("2024-06-02T03:30:00.000Z"),
    ];

    expect(tasks.length).toBe(scheduledWorkflowReminders.length);

    scheduledWorkflowReminders.forEach((reminder, index) => {
      expect(expectedScheduledDates[index].toISOString()).toStrictEqual(reminder.scheduledDate.toISOString());
      expect(reminder.method).toBe(WorkflowMethods.EMAIL);
      expect(reminder.scheduled).toBe(true);
      const task = tasks.find((task) => reminder.uuid === task.referenceUid);
      expect(task).not.toBeNull();
      expect(task?.scheduledAt.toISOString()).toStrictEqual(expectedScheduledDates[index].toISOString());
    });
  });

  test("schedules workflow notifications with after event trigger and email to host action", async () => {
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
      null, //teamId
      false //orgId
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
      new Date("2024-05-21T10:15:00.000"),
      new Date("2024-05-21T10:30:00.000Z"),
      new Date("2024-06-01T06:00:00.000Z"),
      new Date("2024-06-02T06:00:00.000Z"),
    ];

    const tasks = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    scheduledWorkflowReminders.forEach((reminder, index) => {
      expect(expectedScheduledDates[index].toISOString()).toStrictEqual(reminder.scheduledDate.toISOString());
      expect(reminder.method).toBe(WorkflowMethods.EMAIL);
      expect(reminder.scheduled).toBe(true);
      const task = tasks.find((task) => reminder.uuid === task.referenceUid);
      expect(task).not.toBeNull();
      expect(task?.scheduledAt.toISOString()).toStrictEqual(expectedScheduledDates[index].toISOString());
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
            trigger: "BEFORE_EVENT",
            action: "SMS_NUMBER",
            template: "REMINDER",
            activeOn: [],
            time: 20,
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
      null, //teamId,
      true
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

    await scheduleBookingReminders(
      bookings,
      workflow.steps,
      workflow.time,
      workflow.timeUnit,
      workflow.trigger,
      organizer.id,
      null, //teamId
      true
    );

    // two sms should be scheduled
    expectSMSWorkflowToBeTriggered({
      sms,
      toNumber: "000",
      includedString: "2024 May 21 at 2:30pm Asia/Kolkata",
    });

    expectSMSWorkflowToBeTriggered({
      sms,
      toNumber: "000",
      includedString: "2024 May 21 at 2:45pm Asia/Kolkata",
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
      new Date("2024-05-20T13:00:00.000"),
      new Date("2024-05-20T13:15:00.000Z"),
      new Date("2024-05-31T08:30:00.000Z"),
      new Date("2024-06-01T08:30:00.000Z"),
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

  test("should not schedule reminders if date is already in the past", async () => {
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      defaultScheduleId: null,
      schedules: [TestData.schedules.IstMorningShift],
    });

    const pastBooking = {
      uid: "past-booking-uid",
      eventTypeId: 1,
      userId: 101,
      status: BookingStatus.ACCEPTED,
      startTime: `2024-05-21T09:00:00.000Z`,
      endTime: `2024-05-21T09:15:00.000Z`,
      attendees: [{ email: "attendee@example.com", locale: "en" }],
    };

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            name: "Past Workflow",
            userId: 101,
            trigger: "BEFORE_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeOn: [],
            time: 5,
            timeUnit: TimeUnit.DAY,
          },
        ],
        eventTypes: mockEventTypes,
        bookings: [pastBooking],
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
      null, //teamId
      false //isOrg
    );

    const tasks = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    // No tasks should be created for past reminders
    expect(tasks.length).toBe(0);
  });
});

describe("deleteWorkfowRemindersOfRemovedMember", () => {
  test("deletes all workflow reminders when member is removed from org", async () => {
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

    await createWorkflowRemindersAndTasksForWorkflow("Org Workflow");

    await deleteWorkfowRemindersOfRemovedMember(org, 101, true);

    const workflowReminders = await prismock.workflowReminder.findMany();

    expect(workflowReminders.length).toBe(0);

    const tasks = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    expect(tasks.length).toBe(0);
  });

  test("deletes reminders if member is removed from an org team ", async () => {
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

    await createWorkflowRemindersAndTasksForWorkflow("Org Workflow 1");
    await createWorkflowRemindersAndTasksForWorkflow("Org Workflow 2");

    await prismock.membership.delete({
      where: {
        userId_teamId: {
          teamId: 2, // removing from team 2
          userId: 101, // organizer's userId
        },
      },
    });

    await deleteWorkfowRemindersOfRemovedMember({ id: 2, parentId: org.id }, 101, false);

    const workflowReminders = await prismock.workflowReminder.findMany({
      select: {
        uuid: true,
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

    const tasks = await prismock.task.findMany({
      where: {
        type: "sendWorkflowEmails",
      },
    });

    expect(tasks.length).toBe(4);

    expect(tasks.map((task) => task.referenceUid)).toEqual(
      workflowReminders.map((reminder) => reminder.uuid)
    );
  });
});

describe("Workflow SMTP Emails Feature Flag", () => {
  vi.spyOn(emailProvider, "sendOrScheduleWorkflowEmails");

  const mockEvt = {
    uid: "test-uid",
    title: "Test Event",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    bookerUrl: "https://cal.com",
    attendees: [
      {
        name: "Test Attendee",
        email: "attendee@test.com",
        timeZone: "UTC",
        language: { locale: "en" },
      },
    ],
    organizer: {
      name: "Test Organizer",
      email: "organizer@test.com",
      timeZone: "UTC",
      language: { locale: "en" },
    },
  };

  const baseArgs = {
    evt: mockEvt,
    triggerEvent: WorkflowTriggerEvents.NEW_EVENT,
    timeSpan: { time: 1, timeUnit: TimeUnit.HOUR },
    sendTo: ["test@example.com"],
    action: WorkflowActions.EMAIL_ATTENDEE,
    verifiedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should use SMTP", async () => {
    await scheduleEmailReminder(baseArgs);
    expect(emailProvider.sendOrScheduleWorkflowEmails).toHaveBeenCalled();
  });
});

describe("Routing Form Variables", () => {
  beforeEach(() => {
    // Reset global test storage
    globalThis.testEmails = [];
    globalThis.testSMS = [];
  });

  test("should substitute routing form variables in email subject and body", async () => {
    const mockFormData = {
      responses: {
        "contact person": {
          value: "Jane Smith",
          response: "Jane Smith",
        },
        "company name": {
          value: "Acme Solutions",
          response: "Acme Solutions",
        },
        department: {
          value: "Engineering",
          response: "Engineering",
        },
      },
      routedEventTypeId: null,
      user: {
        email: "user@test.com",
        timeFormat: 12,
        locale: "en",
      },
    };

    const emailArgs = {
      emailBody: "Dear {CONTACT_PERSON} from {COMPANY_NAME} ({DEPARTMENT}), thank you for your submission.",
      emailSubject: "Welcome {COMPANY_NAME} - {DEPARTMENT} Team",
      triggerEvent: WorkflowTriggerEvents.FORM_SUBMITTED,
      sendTo: ["recipient@test.com"],
      action: WorkflowActions.EMAIL_HOST,
      verifiedAt: new Date(),
      formData: mockFormData,
    };

    await scheduleEmailReminder(emailArgs);

    // Check that email was sent with processed variables
    expect(globalThis.testEmails).toHaveLength(1);
    const sentEmail = globalThis.testEmails[0];

    expect(sentEmail.subject).toBe("Welcome Acme Solutions - Engineering Team");
    expect(sentEmail.html).toContain("Dear Jane Smith from Acme Solutions (Engineering)");
  });

  test("should handle array values in routing form variables", async () => {
    // Using actual structure - for multi-select fields, value is array of labels, response is array of objects
    const mockFormData = {
      responses: {
        "selected services": {
          value: ["web development", "mobile app", "consulting"],
          response: [
            { label: "web development", id: "web-dev" },
            { label: "mobile app", id: "mobile" },
            { label: "consulting", id: "consulting" },
          ],
        },
        "company name": {
          value: "Digital Corp",
          response: "Digital Corp",
        },
      },
      routedEventTypeId: null,
      user: {
        email: "user@test.com",
        timeFormat: 12,
        locale: "en",
      },
    };

    const emailArgs = {
      emailBody: "Hello {COMPANY_NAME}, you selected: {SELECTED_SERVICES}",
      emailSubject: "Services for {COMPANY_NAME}",
      triggerEvent: WorkflowTriggerEvents.FORM_SUBMITTED,
      sendTo: ["test@example.com"],
      action: WorkflowActions.EMAIL_HOST,
      verifiedAt: new Date(),
      formData: mockFormData,
    };

    await scheduleEmailReminder(emailArgs);

    expect(globalThis.testEmails).toHaveLength(1);
    const sentEmail = globalThis.testEmails[0];

    expect(sentEmail.subject).toBe("Services for Digital Corp");
    expect(sentEmail.html).toContain(
      "Hello Digital Corp, you selected: web development, mobile app, consulting"
    );
  });

  test("should handle field names with special characters in routing forms", async () => {
    const mockFormData = {
      responses: {
        "company-name!@#": {
          value: "Special Characters LLC",
          response: "Special Characters LLC",
        },
        "phone number (primary)": {
          value: "+1-555-0123",
          response: "+1-555-0123",
        },
      },
      routedEventTypeId: null,
      user: {
        email: "user@test.com",
        timeFormat: 12,
        locale: "en",
      },
    };

    const emailArgs = {
      emailBody: "Company: {COMPANYNAME}, Phone: {PHONE_NUMBER_PRIMARY}",
      emailSubject: "Contact info for {COMPANYNAME}",
      triggerEvent: WorkflowTriggerEvents.FORM_SUBMITTED,
      sendTo: ["test@example.com"],
      action: WorkflowActions.EMAIL_HOST,
      verifiedAt: new Date(),
      formData: mockFormData,
    };

    await scheduleEmailReminder(emailArgs);

    expect(globalThis.testEmails).toHaveLength(1);
    const sentEmail = globalThis.testEmails[0];

    expect(sentEmail.subject).toBe("Contact info for Special Characters LLC");
    expect(sentEmail.html).toContain("Company: Special Characters LLC, Phone: +1-555-0123");
  });

  test("should pass routing form responses to AI phone call workflows", async () => {
    // Mock the feature flag
    const mockCheckFeature = vi
      .spyOn(FeaturesRepository.prototype, "checkIfFeatureIsEnabledGlobally")
      .mockResolvedValue(true);

    // Mock rate limiting
    const mockRateLimit = vi
      .spyOn(rateLimitModule, "checkRateLimitAndThrowError")
      .mockResolvedValue(undefined);

    // Mock the AI agent setup
    await prismock.agent.create({
      data: {
        id: "test-agent-id",
        providerAgentId: "provider-123",
        outboundPhoneNumbers: {
          create: {
            phoneNumber: "+1234567890",
            subscriptionStatus: "ACTIVE",
          },
        },
      },
    });

    await prismock.workflowStep.create({
      data: {
        id: 999,
        stepNumber: 1,
        action: WorkflowActions.CAL_AI_PHONE_CALL,
        workflowId: 1,
        agentId: "test-agent-id",
        verifiedAt: new Date(),
      },
    });

    const mockFormData = {
      responses: {
        "customer name": {
          value: "John Doe",
          response: "John Doe",
        },
        "phone preference": {
          value: "mobile",
          response: { label: "mobile", id: "mobile" },
        },
        priority: {
          value: "high",
          response: { label: "high", id: "high" },
        },
      },
      routedEventTypeId: 123,
      user: {
        email: "user@test.com",
        timeFormat: 12,
        locale: "en",
      },
    };

    const aiPhoneArgs = {
      submittedPhoneNumber: "+1-555-9999",
      triggerEvent: WorkflowTriggerEvents.FORM_SUBMITTED,
      timeSpan: { time: null, timeUnit: null },
      workflowStepId: 999,
      userId: 1,
      teamId: null,
      verifiedAt: new Date(),
      formData: mockFormData,
      routedEventTypeId: 123,
    };

    const mockTaskerCreate = vi.spyOn(tasker, "create").mockResolvedValue("task-id");

    await scheduleAIPhoneCall(aiPhoneArgs);

    // Verify that the task was created with form responses
    expect(mockTaskerCreate).toHaveBeenCalled();
    expect(mockTaskerCreate).toHaveBeenCalledWith(
      "executeAIPhoneCall",
      expect.any(Object),
      expect.any(Object)
    );
    const taskData = mockTaskerCreate.mock.calls[0][1] as {
      responses?: typeof mockFormData.responses;
      routedEventTypeId?: number;
    };
    expect(taskData.responses).toEqual(mockFormData.responses);
    expect(taskData.routedEventTypeId).toBe(123);

    // Clean up
    mockTaskerCreate.mockRestore();
    mockCheckFeature.mockRestore();
    mockRateLimit.mockRestore();
  });
});
