import appStoreMock from "../../../../../tests/libs/__mocks__/app-store";
import i18nMock from "../../../../../tests/libs/__mocks__/libServerI18n";
import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { BookingReference, Attendee, Booking, Membership } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { WebhookTriggerEvents } from "@prisma/client";
import type Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { vi } from "vitest";
import "vitest-fetch-mock";
import type { z } from "zod";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { handleStripePaymentSuccess } from "@calcom/features/ee/payments/api/webhook";
import { weekdayToWeekIndex, type WeekDays } from "@calcom/lib/date-fns";
import type { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import type {
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
  WorkflowMethods,
} from "@calcom/prisma/client";
import type { SchedulingType, SMSLockState, TimeUnit } from "@calcom/prisma/enums";
import type { BookingStatus } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { userMetadataType } from "@calcom/prisma/zod-utils";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { AppMeta } from "@calcom/types/App";
import type { NewCalendarEventType } from "@calcom/types/Calendar";
import type { EventBusyDate, IntervalLimit } from "@calcom/types/Calendar";

import { getMockPaymentService } from "./MockPaymentService";
import type { getMockRequestDataForBooking } from "./getMockRequestDataForBooking";

// We don't need to test it. Also, it causes Formbricks error when imported
vi.mock("@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic", () => ({
  default: {},
}));

type Fields = z.infer<typeof eventTypeBookingFields>;

logger.settings.minLevel = 1;
const log = logger.getSubLogger({ prefix: ["[bookingScenario]"] });

type InputWebhook = {
  appId: string | null;
  userId?: number | null;
  teamId?: number | null;
  eventTypeId?: number;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  subscriberUrl: string;
};

type InputWorkflow = {
  id?: number;
  userId?: number | null;
  teamId?: number | null;
  name?: string;
  activeOn?: number[];
  activeOnTeams?: number[];
  trigger: WorkflowTriggerEvents;
  action: WorkflowActions;
  template: WorkflowTemplates;
  time?: number | null;
  timeUnit?: TimeUnit | null;
  sendTo?: string;
};

type InputWorkflowReminder = {
  id?: number;
  bookingUid: string;
  method: WorkflowMethods;
  scheduledDate: Date;
  scheduled: boolean;
  workflowStepId?: number;
  workflowId: number;
};

type InputHost = {
  userId: number;
  isFixed?: boolean;
  scheduleId?: number | null;
};
/**
 * Data to be mocked
 */
export type ScenarioData = {
  /**
   * Prisma would return these eventTypes
   */
  eventTypes: InputEventType[];
  /**
   * Prisma would return these users
   */
  users: InputUser[];
  /**
   * Prisma would return these apps
   */
  apps?: Partial<AppMeta>[];
  bookings?: InputBooking[];
  webhooks?: InputWebhook[];
  workflows?: InputWorkflow[];
};

type InputCredential = typeof TestData.credentials.google & {
  id?: number;
};

type InputSelectedCalendar = typeof TestData.selectedCalendars.google;

type InputUser = Omit<typeof TestData.users.example, "defaultScheduleId"> & {
  id: number;
  defaultScheduleId?: number | null;
  credentials?: InputCredential[];
  organizationId?: number | null;
  selectedCalendars?: InputSelectedCalendar[];
  teams?: {
    membership: Partial<Membership>;
    team: {
      id: number;
      name: string;
      slug: string;
      parentId?: number;
      isPrivate?: boolean;
    };
  }[];
  schedules: {
    // Allows giving id in the input directly so that it can be referenced somewhere else as well
    id?: number;
    name: string;
    availability: {
      days: number[];
      startTime: Date;
      endTime: Date;
      date: string | null;
    }[];
    timeZone: string;
  }[];
  destinationCalendar?: Prisma.DestinationCalendarCreateInput;
  weekStart?: string;
  profiles?: Prisma.ProfileUncheckedCreateWithoutUserInput[];
  completedOnboarding?: boolean;
};

export type InputEventType = {
  id: number;
  title?: string;
  length?: number;
  offsetStart?: number;
  slotInterval?: number;
  userId?: number;
  minimumBookingNotice?: number;
  /**
   * These user ids are `ScenarioData["users"]["id"]`
   */
  users?: { id: number }[];
  hosts?: InputHost[];
  schedulingType?: SchedulingType;
  parent?: { id: number };
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  teamId?: number | null;
  team?: {
    id?: number | null;
    parentId?: number | null;
    bookingLimits?: IntervalLimit;
    includeManagedEventsInLimits?: boolean;
  };
  requiresConfirmation?: boolean;
  destinationCalendar?: Prisma.DestinationCalendarCreateInput;
  schedule?: InputUser["schedules"][number] | null;
  bookingLimits?: IntervalLimit;
  durationLimits?: IntervalLimit;
  owner?: number;
  metadata?: any;
  rescheduleWithSameRoundRobinHost?: boolean;
} & Partial<Omit<Prisma.EventTypeCreateInput, "users" | "schedule" | "bookingLimits" | "durationLimits">>;

type AttendeeBookingSeatInput = Pick<Prisma.BookingSeatCreateInput, "referenceUid" | "data">;

type WhiteListedBookingProps = {
  id?: number;
  uid?: string;
  userId?: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  title?: string;
  status: BookingStatus;
  attendees?: {
    email: string;
    phoneNumber?: string;
    bookingSeat?: AttendeeBookingSeatInput | null;
  }[];
  references?: (Omit<ReturnType<typeof getMockBookingReference>, "credentialId"> & {
    // TODO: Make sure that all references start providing credentialId and then remove this intersection of optional credentialId
    credentialId?: number | null;
  })[];
  user?: { id: number };
  bookingSeat?: Prisma.BookingSeatCreateInput[];
  createdAt?: string;
};

type InputBooking = Partial<Omit<Booking, keyof WhiteListedBookingProps>> & WhiteListedBookingProps;

export const Timezones = {
  "+5:30": "Asia/Kolkata",
  "+6:00": "Asia/Dhaka",
  "-11:00": "Pacific/Pago_Pago",
};

async function addHostsToDb(eventTypes: InputEventType[]) {
  for (const eventType of eventTypes) {
    if (!eventType.hosts?.length) continue;
    for (const host of eventType.hosts) {
      const data: Prisma.HostCreateInput = {
        eventType: {
          connect: {
            id: eventType.id,
          },
        },
        isFixed: host.isFixed ?? false,
        user: {
          connect: {
            id: host.userId,
          },
        },
        schedule: host.scheduleId
          ? {
              connect: {
                id: host.scheduleId,
              },
            }
          : undefined,
      };

      await prismock.host.create({
        data,
      });
    }
  }
}

export async function addEventTypesToDb(
  eventTypes: (Omit<
    Prisma.EventTypeCreateInput,
    "users" | "worflows" | "destinationCalendar" | "schedule"
  > & {
    id?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users?: any[];
    userId?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hosts?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflows?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    destinationCalendar?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schedule?: any;
    metadata?: any;
    team?: { id?: number | null; bookingLimits?: IntervalLimit; includeManagedEventsInLimits?: boolean };
  })[]
) {
  log.silly("TestData: Add EventTypes to DB", JSON.stringify(eventTypes));
  await prismock.eventType.createMany({
    data: eventTypes,
  });
  const allEventTypes = await prismock.eventType.findMany({
    include: {
      users: true,
      workflows: true,
      destinationCalendar: true,
      schedule: true,
    },
  });

  /**
   * This is a hack to get the relationship of schedule to be established with eventType. Looks like a prismock bug that creating eventType along with schedule.create doesn't establish the relationship.
   * HACK STARTS
   */
  log.silly("Fixed possible prismock bug by creating schedule separately");
  for (let i = 0; i < eventTypes.length; i++) {
    const eventType = eventTypes[i];
    const createdEventType = allEventTypes[i];

    if (eventType.schedule) {
      log.silly("TestData: Creating Schedule for EventType", JSON.stringify(eventType));
      await prismock.schedule.create({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        data: {
          ...eventType.schedule.create,
          eventType: {
            connect: {
              id: createdEventType.id,
            },
          },
        },
      });
    }

    if (eventType.team?.id) {
      const createdTeam = await prismock.team.create({
        data: {
          id: eventType.team?.id,
          bookingLimits: eventType.team?.bookingLimits,
          includeManagedEventsInLimits: eventType.team?.includeManagedEventsInLimits,
          name: "",
        },
      });

      await prismock.eventType.update({
        where: { id: eventType.id },
        data: { teamId: createdTeam.id },
      });
    }
  }
  /***
   *  HACK ENDS
   */

  log.silly(
    "TestData: All EventTypes in DB are",
    JSON.stringify({
      eventTypes: allEventTypes,
    })
  );
  return allEventTypes;
}

export async function addEventTypes(eventTypes: InputEventType[], usersStore: InputUser[]) {
  const baseEventType = {
    title: "Base EventType Title",
    slug: "base-event-type-slug",
    timeZone: null,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    bookingLimits: {},
    includeManagedEventsInLimits: false,
    schedulingType: null,
    length: 15,
    //TODO: What is the purpose of periodStartDate and periodEndDate? Test these?
    periodStartDate: new Date("2022-01-21T09:03:48.000Z"),
    periodEndDate: new Date("2022-01-21T09:03:48.000Z"),
    periodCountCalendarDays: false,
    periodDays: 30,
    seatsPerTimeSlot: null,
    metadata: {},
    minimumBookingNotice: 0,
    offsetStart: 0,
  };
  const foundEvents: Record<number, boolean> = {};
  const eventTypesWithUsers = eventTypes.map((eventType) => {
    if (!eventType.slotInterval && !eventType.length) {
      throw new Error("eventTypes[number]: slotInterval or length must be defined");
    }
    if (foundEvents[eventType.id]) {
      throw new Error(`eventTypes[number]: id ${eventType.id} is not unique`);
    }
    foundEvents[eventType.id] = true;
    const users =
      eventType.users?.map((userWithJustId) => {
        return usersStore.find((user) => user.id === userWithJustId.id);
      }) || [];
    const hosts =
      eventType.users?.map((host) => {
        const user = usersStore.find((user) => user.id === host.id);
        return { ...host, user };
      }) || [];
    return {
      ...baseEventType,
      ...eventType,
      workflows: [],
      users,
      hosts,
      destinationCalendar: eventType.destinationCalendar
        ? {
            create: eventType.destinationCalendar,
          }
        : eventType.destinationCalendar,
      schedule: eventType.schedule
        ? {
            create: {
              ...eventType.schedule,
              availability: {
                createMany: {
                  data: eventType.schedule.availability,
                },
              },
            },
          }
        : eventType.schedule,
      owner: eventType.owner ? { connect: { id: eventType.owner } } : undefined,
      schedulingType: eventType.schedulingType,
      parent: eventType.parent ? { connect: { id: eventType.parent.id } } : undefined,
      rescheduleWithSameRoundRobinHost: eventType.rescheduleWithSameRoundRobinHost,
    };
  });
  log.silly("TestData: Creating EventType", JSON.stringify(eventTypesWithUsers));
  return await addEventTypesToDb(eventTypesWithUsers);
}

function addBookingReferencesToDB(bookingReferences: Prisma.BookingReferenceCreateManyInput[]) {
  prismock.bookingReference.createMany({
    data: bookingReferences,
  });
}

async function addBookingsToDb(
  bookings: (Prisma.BookingCreateInput & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    references: any[];
    user?: { id: number };
  })[]
) {
  log.silly("TestData: Creating Bookings", JSON.stringify(bookings));

  function getDateObj(time: string | Date) {
    return time instanceof Date ? time : new Date(time);
  }

  // Make sure that we store the date in Date object always. This is to ensure consistency which Prisma does but not prismock
  log.silly("Handling Prismock bug-3");
  const fixedBookings = bookings.map((booking) => {
    const startTime = getDateObj(booking.startTime);
    const endTime = getDateObj(booking.endTime);
    return { ...booking, startTime, endTime };
  });

  await prismock.booking.createMany({
    data: fixedBookings,
  });
  log.silly(
    "TestData: Bookings as in DB",
    JSON.stringify({
      bookings: await prismock.booking.findMany({
        include: {
          references: true,
          attendees: true,
        },
      }),
    })
  );
}

export async function addBookings(bookings: InputBooking[]) {
  log.silly("TestData: Creating Bookings", JSON.stringify(bookings));
  const allBookings = [...bookings].map((booking) => {
    if (booking.references) {
      addBookingReferencesToDB(
        booking.references.map((reference) => {
          return {
            ...reference,
            bookingId: booking.id,
          };
        })
      );
    }
    return {
      uid: booking.uid || uuidv4(),
      workflowReminders: [],
      references: [],
      title: "Test Booking Title",
      ...booking,
    };
  });

  await addBookingsToDb(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    allBookings.map((booking) => {
      const bookingCreate = booking;
      if (booking.references) {
        bookingCreate.references = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          createMany: {
            data: booking.references,
          },
        };
      }
      if (booking.attendees) {
        bookingCreate.attendees = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          createMany: {
            data: booking.attendees.map((attendee) => {
              if (attendee.bookingSeat) {
                const { bookingSeat, ...attendeeWithoutBookingSeat } = attendee;
                return {
                  ...attendeeWithoutBookingSeat,
                  bookingSeat: {
                    create: { ...bookingSeat, bookingId: booking.id },
                  },
                };
              } else {
                return attendee;
              }
            }),
          },
        };
      }

      if (booking?.user?.id) {
        bookingCreate.user = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          connect: {
            id: booking.user.id,
          },
        };
      }

      return bookingCreate;
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addWebhooksToDb(webhooks: any[]) {
  await prismock.webhook.createMany({
    data: webhooks,
  });
}

async function addWebhooks(webhooks: InputWebhook[]) {
  log.silly("TestData: Creating Webhooks", safeStringify(webhooks));

  await addWebhooksToDb(webhooks);
}

async function addWorkflowsToDb(workflows: InputWorkflow[]) {
  await Promise.all(
    workflows.map(async (workflow) => {
      const team = await prismock.team.findFirst({
        where: {
          id: workflow.teamId ?? 0,
        },
      });

      if (workflow.teamId && !team) {
        throw new Error(`Team with ID ${workflow.teamId} not found`);
      }

      const isOrg = team?.isOrganization;

      // Create the workflow first
      const createdWorkflow = await prismock.workflow.create({
        data: {
          ...(workflow.id && { id: workflow.id }),
          userId: workflow.userId,
          teamId: workflow.teamId,
          trigger: workflow.trigger,
          name: workflow.name ? workflow.name : "Test Workflow",
          time: workflow.time,
          timeUnit: workflow.timeUnit,
        },
        include: {
          steps: true,
        },
      });

      await prismock.workflowStep.create({
        data: {
          stepNumber: 1,
          action: workflow.action,
          template: workflow.template,
          numberVerificationPending: false,
          includeCalendarEvent: false,
          sendTo: workflow.sendTo,
          workflow: {
            connect: {
              id: createdWorkflow.id,
            },
          },
        },
      });

      //activate event types and teams on workflows
      if (isOrg && workflow.activeOnTeams) {
        await Promise.all(
          workflow.activeOnTeams.map((id) =>
            prismock.workflowsOnTeams.create({
              data: {
                workflowId: createdWorkflow.id,
                teamId: id,
              },
            })
          )
        );
      } else if (workflow.activeOn) {
        await Promise.all(
          workflow.activeOn.map((id) =>
            prismock.workflowsOnEventTypes.create({
              data: {
                workflowId: createdWorkflow.id,
                eventTypeId: id,
              },
            })
          )
        );
      }
    })
  );
}

async function addWorkflows(workflows: InputWorkflow[]) {
  log.silly("TestData: Creating Workflows", safeStringify(workflows));

  return await addWorkflowsToDb(workflows);
}

export async function addWorkflowReminders(workflowReminders: InputWorkflowReminder[]) {
  log.silly("TestData: Creating Workflow Reminders", safeStringify(workflowReminders));

  return await prismock.workflowReminder.createMany({
    data: workflowReminders,
  });
}

export async function addUsersToDb(
  users: (Prisma.UserCreateInput & { schedules: Prisma.ScheduleCreateInput[]; id?: number })[]
) {
  log.silly("TestData: Creating Users", JSON.stringify(users));
  await prismock.user.createMany({
    data: users,
  });

  const allUsers = await prismock.user.findMany({
    include: {
      credentials: true,
      teams: true,
      profiles: true,
      schedules: {
        include: {
          availability: true,
        },
      },
      destinationCalendar: true,
    },
  });

  log.silly(
    "Added users to Db",
    safeStringify({
      allUsers,
    })
  );

  return allUsers;
}

export async function addTeamsToDb(teams: NonNullable<InputUser["teams"]>[number]["team"][]) {
  log.silly("TestData: Creating Teams", JSON.stringify(teams));

  for (const team of teams) {
    const teamsWithParentId = {
      ...team,
      parentId: team.parentId,
    };
    await prismock.team.upsert({
      where: {
        id: teamsWithParentId.id,
      },
      update: {
        ...teamsWithParentId,
      },
      create: {
        ...teamsWithParentId,
      },
    });
  }

  const addedTeams = await prismock.team.findMany({
    where: {
      id: {
        in: teams.map((team) => team.id),
      },
    },
  });
  log.silly(
    "Added teams to Db",
    safeStringify({
      addedTeams,
    })
  );
  return addedTeams;
}

export async function addUsers(users: InputUser[]) {
  const prismaUsersCreate = [];
  for (let i = 0; i < users.length; i++) {
    const newUser = users[i];
    const user = users[i];
    if (user.schedules) {
      newUser.schedules = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        createMany: {
          data: user.schedules.map((schedule) => {
            return {
              ...schedule,
              availability: {
                createMany: {
                  data: schedule.availability,
                },
              },
            };
          }),
        },
      };
    }
    if (user.credentials) {
      newUser.credentials = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        createMany: {
          data: user.credentials,
        },
      };
    }

    if (user.teams) {
      const addedTeams = await addTeamsToDb(user.teams.map((team) => team.team));
      newUser.teams = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        createMany: {
          data: user.teams.map((team, index) => {
            return {
              teamId: addedTeams[index].id,
              ...team.membership,
            };
          }),
        },
      };
    }
    if (user.selectedCalendars) {
      newUser.selectedCalendars = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        createMany: {
          data: user.selectedCalendars,
        },
      };
    }
    if (user.destinationCalendar) {
      newUser.destinationCalendar = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: user.destinationCalendar,
      };
    }
    if (user.profiles) {
      newUser.profiles = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error Not sure why this is not working
        createMany: {
          data: user.profiles,
        },
      };
    }

    prismaUsersCreate.push(newUser);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return await addUsersToDb(prismaUsersCreate);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addAppsToDb(apps: any[]) {
  log.silly("TestData: Creating Apps", JSON.stringify({ apps }));
  await prismock.app.createMany({
    data: apps,
  });
  const allApps = await prismock.app.findMany();
  log.silly("TestData: Apps as in DB", JSON.stringify({ apps: allApps }));
}
export async function createBookingScenario(data: ScenarioData) {
  log.silly("TestData: Creating Scenario", JSON.stringify({ data }));
  await addUsers(data.users);
  if (data.apps) {
    await addAppsToDb(
      data.apps.map((app) => {
        // Enable the app by default
        return { enabled: true, ...app };
      })
    );
  }
  const eventTypes = await addEventTypes(data.eventTypes, data.users);
  await addHostsToDb(data.eventTypes);

  data.bookings = data.bookings || [];
  // allowSuccessfulBookingCreation();
  await addBookings(data.bookings);
  // mockBusyCalendarTimes([]);
  await addWebhooks(data.webhooks || []);
  // addPaymentMock();
  const workflows = await addWorkflows(data.workflows || []);

  return {
    eventTypes,
    workflows,
  };
}

type TeamCreateReturnType = Awaited<ReturnType<typeof prismock.team.create>>;

function assertNonNullableSlug<T extends { slug: string | null }>(
  org: T
): asserts org is T & { slug: string } {
  if (org.slug === null) {
    throw new Error("Slug cannot be null");
  }
}

export async function createOrganization(orgData: {
  name: string;
  slug: string;
  metadata?: z.infer<typeof teamMetadataSchema>;
  withTeam?: boolean;
}): Promise<TeamCreateReturnType & { slug: NonNullable<TeamCreateReturnType["slug"]> }> {
  const org = await prismock.team.create({
    data: {
      name: orgData.name,
      slug: orgData.slug,
      isOrganization: true,
      metadata: {
        ...(orgData.metadata || {}),
        isOrganization: true,
      },
    },
  });
  if (orgData.withTeam) {
    await prismock.team.create({
      data: {
        name: "Org Team",
        slug: "org-team",
        isOrganization: false,
        parent: {
          connect: {
            id: org.id,
          },
        },
      },
    });
  }
  assertNonNullableSlug(org);
  return org;
}

export async function createCredentials(
  credentialData: {
    type: string;
    key: any;
    id?: number;
    userId?: number | null;
    teamId?: number | null;
  }[]
) {
  const credentials = await prismock.credential.createMany({
    data: credentialData,
  });
  return credentials;
}

// async function addPaymentsToDb(payments: Prisma.PaymentCreateInput[]) {
//   await prismaMock.payment.createMany({
//     data: payments,
//   });
// }

/**
 * This fn indents to /ally compute day, month, year for the purpose of testing.
 * We are not using DayJS because that's actually being tested by this code.
 * - `dateIncrement` adds the increment to current day
 * - `monthIncrement` adds the increment to current month
 * - `yearIncrement` adds the increment to current year
 * - `fromDate` starts incrementing from this date (default: today)
 *  @deprecated Stop using this function as it is not timezone aware and can return wrong date depending on the time of the day and timezone. Instead
 *  use vi.setSystemTime to fix the date and time and then use hardcoded days instead of dynamic date calculation.
 */
export const getDate = (
  param: {
    dateIncrement?: number;
    monthIncrement?: number;
    yearIncrement?: number;
    fromDate?: Date;
  } = {}
) => {
  let { dateIncrement, monthIncrement, yearIncrement, fromDate } = param;

  dateIncrement = dateIncrement || 0;
  monthIncrement = monthIncrement || 0;
  yearIncrement = yearIncrement || 0;
  fromDate = fromDate || new Date();

  fromDate.setDate(fromDate.getDate() + dateIncrement);
  fromDate.setMonth(fromDate.getMonth() + monthIncrement);
  fromDate.setFullYear(fromDate.getFullYear() + yearIncrement);

  let _date = fromDate.getDate();
  let year = fromDate.getFullYear();

  // Make it start with 1 to match with DayJS requiremet
  let _month = fromDate.getMonth() + 1;

  // If last day of the month(As _month is plus 1 already it is going to be the 0th day of next month which is the last day of current month)
  const lastDayOfMonth = new Date(year, _month, 0).getDate();
  const numberOfDaysForNextMonth = +_date - +lastDayOfMonth;
  if (numberOfDaysForNextMonth > 0) {
    _date = numberOfDaysForNextMonth;
    _month = _month + 1;
  }

  if (_month === 13) {
    _month = 1;
    year = year + 1;
  }

  const date = _date < 10 ? `0${_date}` : _date;
  const month = _month < 10 ? `0${_month}` : _month;

  return {
    date: String(date),
    month: String(month),
    year: String(year),
    dateString: `${year}-${month}-${date}`,
  };
};

const isWeekStart = (date: Date, weekStart: WeekDays) => {
  return date.getDay() === weekdayToWeekIndex(weekStart);
};

export const getNextMonthNotStartingOnWeekStart = (weekStart: WeekDays, from?: Date) => {
  const date = from ?? new Date();

  const incrementMonth = (date: Date) => {
    date.setMonth(date.getMonth() + 1);
  };

  // start searching from the 1st day of next month
  incrementMonth(date);
  date.setDate(1);

  while (isWeekStart(date, weekStart)) {
    incrementMonth(date);
  }

  return getDate({ fromDate: date });
};

export function getMockedCredential({
  metadataLookupKey,
  key,
}: {
  metadataLookupKey: string;
  key: {
    expiry_date?: number;
    token_type?: string;
    access_token?: string;
    refresh_token?: string;
    scope: string;
  };
}) {
  const app = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];
  return {
    type: app.type,
    appId: app.slug,
    app: app,
    key: {
      expiry_date: Date.now() + 1000000,
      token_type: "Bearer",
      access_token: "ACCESS_TOKEN",
      refresh_token: "REFRESH_TOKEN",
      ...key,
    },
  };
}

export function getGoogleCalendarCredential() {
  return getMockedCredential({
    metadataLookupKey: "googlecalendar",
    key: {
      scope:
        "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    },
  });
}

export function getGoogleMeetCredential() {
  return getMockedCredential({
    metadataLookupKey: "googlevideo",
    key: {
      scope: "",
    },
  });
}

export function getAppleCalendarCredential() {
  return getMockedCredential({
    metadataLookupKey: "applecalendar",
    key: {
      scope:
        "https://www.applecalendar.example/auth/calendar.events https://www.applecalendar.example/auth/calendar.readonly",
    },
  });
}

export function getZoomAppCredential() {
  return getMockedCredential({
    metadataLookupKey: "zoomvideo",
    key: {
      scope: "meeting:write",
    },
  });
}

export function getStripeAppCredential() {
  return getMockedCredential({
    metadataLookupKey: "stripepayment",
    key: {
      scope: "read_write",
    },
  });
}

export const TestData = {
  selectedCalendars: {
    google: {
      integration: "google_calendar",
      externalId: "john@example.com",
    },
  },
  credentials: {
    google: getGoogleCalendarCredential(),
  },
  schedules: {
    IstWorkHours: {
      id: 1,
      name: "9:30AM to 6PM in India - 4:00AM to 12:30PM in GMT",
      availability: [
        {
          // userId: null,
          // eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:30:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    },
    /**
     * Has an overlap with IstEveningShift from 5PM to 6PM IST(11:30AM to 12:30PM GMT)
     */
    IstMorningShift: {
      name: "9:30AM to 6PM in India - 4:00AM to 12:30PM in GMT",
      availability: [
        {
          // userId: null,
          // eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:30:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    },
    /**
     * Has an overlap with IstMorningShift and IstEveningShift
     */
    IstMidShift: {
      name: "12:30AM to 8PM in India - 7:00AM to 14:30PM in GMT",
      availability: [
        {
          // userId: null,
          // eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T12:30:00.000Z"),
          endTime: new Date("1970-01-01T20:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    },
    /**
     * Has an overlap with IstMorningShift from 5PM to 6PM IST(11:30AM to 12:30PM GMT)
     */
    IstEveningShift: {
      name: "5:00PM to 10PM in India - 11:30AM to 16:30PM in GMT",
      availability: [
        {
          // userId: null,
          // eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T17:00:00.000Z"),
          endTime: new Date("1970-01-01T22:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    },
    EmptyAvailability: {
      name: "Empty Availability",
      availability: [],
      timeZone: Timezones["+5:30"],
    },
    IstWorkHoursWithDateOverride: (dateString: string) => ({
      name: "9:30AM to 6PM in India - 4:00AM to 12:30PM in GMT but with a Date Override for 2PM to 6PM IST(in GST time it is 8:30AM to 12:30PM)",
      availability: [
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:30:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: null,
        },
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date(`1970-01-01T14:00:00.000Z`),
          endTime: new Date(`1970-01-01T18:00:00.000Z`),
          date: dateString,
        },
      ],
      timeZone: Timezones["+5:30"],
    }),
    IstWorkHoursNoWeekends: {
      id: 1,
      name: "9:30AM to 6PM in India - 4:00AM to 12:30PM in GMT",
      availability: [
        {
          // userId: null,
          // eventTypeId: null,
          days: [/*0*/ 1, 2, 3, 4, 5 /*6*/],
          startTime: new Date("1970-01-01T09:30:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    },
  },
  users: {
    example: {
      name: "Example",
      email: "example@example.com",
      username: "example.username",
      defaultScheduleId: 1,
      timeZone: Timezones["+5:30"],
    },
  },
  apps: {
    "google-calendar": {
      ...appStoreMetadata.googlecalendar,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      keys: {
        expiry_date: Infinity,
        client_id: "client_id",
        client_secret: "client_secret",
        redirect_uris: ["http://localhost:3000/auth/callback"],
      },
    },
    "google-meet": {
      ...appStoreMetadata.googlevideo,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      keys: {
        expiry_date: Infinity,
        client_id: "client_id",
        client_secret: "client_secret",
        redirect_uris: ["http://localhost:3000/auth/callback"],
      },
    },
    "daily-video": {
      ...appStoreMetadata.dailyvideo,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      keys: {
        expiry_date: Infinity,
        api_key: "",
        scale_plan: "false",
        client_id: "client_id",
        client_secret: "client_secret",
        redirect_uris: ["http://localhost:3000/auth/callback"],
      },
    },
    zoomvideo: {
      ...appStoreMetadata.zoomvideo,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      keys: {
        expiry_date: Infinity,
        api_key: "",
        scale_plan: "false",
        client_id: "client_id",
        client_secret: "client_secret",
        redirect_uris: ["http://localhost:3000/auth/callback"],
      },
    },
    "stripe-payment": {
      ...appStoreMetadata.stripepayment,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      keys: {
        expiry_date: Infinity,
        api_key: "",
        scale_plan: "false",
        client_id: "client_id",
        client_secret: "client_secret",
        redirect_uris: ["http://localhost:3000/auth/callback"],
      },
    },
  },
};

export class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockError";
  }
}

export function getOrganizer({
  name,
  email,
  id,
  schedules,
  credentials,
  selectedCalendars,
  destinationCalendar,
  defaultScheduleId,
  weekStart = "Sunday",
  teams,
  organizationId,
  metadata,
  smsLockState,
  completedOnboarding,
}: {
  name: string;
  email: string;
  id: number;
  organizationId?: number | null;
  schedules: InputUser["schedules"];
  credentials?: InputCredential[];
  selectedCalendars?: InputSelectedCalendar[];
  defaultScheduleId?: number | null;
  destinationCalendar?: Prisma.DestinationCalendarCreateInput;
  weekStart?: WeekDays;
  teams?: InputUser["teams"];
  metadata?: userMetadataType;
  smsLockState?: SMSLockState;
  completedOnboarding?: boolean;
}) {
  return {
    ...TestData.users.example,
    name,
    email,
    id,
    schedules,
    credentials,
    selectedCalendars,
    destinationCalendar,
    defaultScheduleId,
    weekStart,
    teams,
    organizationId,
    profiles: [],
    metadata,
    smsLockState,
    completedOnboarding,
  };
}

export function getScenarioData(
  {
    /**
     * organizer has no special meaning. It is a regular user. It is supposed to be deprecated along with `usersApartFromOrganizer` and we should introduce a new `users` field instead
     */
    organizer,
    eventTypes,
    usersApartFromOrganizer = [],
    apps = [],
    webhooks,
    workflows,
    bookings,
  }: {
    organizer: ReturnType<typeof getOrganizer>;
    eventTypes: ScenarioData["eventTypes"];
    apps?: ScenarioData["apps"];
    usersApartFromOrganizer?: ScenarioData["users"];
    webhooks?: ScenarioData["webhooks"];
    workflows?: ScenarioData["workflows"];
    bookings?: ScenarioData["bookings"];
  },
  org?: { id: number | null } | undefined | null
) {
  const users = [organizer, ...usersApartFromOrganizer];
  if (org) {
    const orgId = org.id;
    if (!orgId) {
      throw new Error("If org is specified org.id is required");
    }
    users.forEach((user) => {
      user.profiles = [
        {
          organizationId: orgId,
          username: user.username || "",
          uid: ProfileRepository.generateProfileUid(),
        },
      ];
    });
  }
  eventTypes.forEach((eventType) => {
    if (
      eventType.users?.filter((eventTypeUser) => {
        return !users.find((userToCreate) => userToCreate.id === eventTypeUser.id);
      }).length
    ) {
      throw new Error(`EventType ${eventType.id} has users that are not present in ScenarioData["users"]`);
    }
  });
  return {
    eventTypes: eventTypes.map((eventType, index) => {
      return {
        ...eventType,
        teamId: eventType.teamId || null,
        team: {
          id: eventType.teamId ?? eventType.team?.id,
          parentId: org ? org.id : null,
          bookingLimits: eventType?.team?.bookingLimits,
          includeManagedEventsInLimits: eventType?.team?.includeManagedEventsInLimits,
        },
        title: `Test Event Type - ${index + 1}`,
        description: `It's a test event type - ${index + 1}`,
      };
    }),
    users: users.map((user) => {
      const newUser = {
        ...user,
        organizationId: user.organizationId ?? null,
      };
      return newUser;
    }),
    apps: [...apps],
    webhooks,
    bookings: bookings || [],
    workflows,
  } satisfies ScenarioData;
}

export function enableEmailFeature() {
  prismock.feature.create({
    data: {
      slug: "emails",
      enabled: false,
      type: "KILL_SWITCH",
    },
  });
}

export function mockNoTranslations() {
  log.silly("Mocking i18n.getTranslation to return identity function");
  i18nMock.getTranslation.mockImplementation(() => {
    return new Promise((resolve) => {
      const identityFn = (key: string) => key;
      // @ts-expect-error FIXME
      resolve(identityFn);
    });
  });
}

export const enum BookingLocations {
  CalVideo = "integrations:daily",
  ZoomVideo = "integrations:zoom",
  GoogleMeet = "integrations:google:meet",
}

/**
 * @param metadataLookupKey
 * @param calendarData Specify uids and other data to be faked to be returned by createEvent and updateEvent
 */
export function mockCalendar(
  metadataLookupKey: keyof typeof appStoreMetadata,
  calendarData?: {
    create?: {
      id?: string;
      uid?: string;
      iCalUID?: string;
    };
    update?: {
      id?: string;
      uid: string;
      iCalUID?: string;
    };
    busySlots?: { start: `${string}Z`; end: `${string}Z` }[];
    creationCrash?: boolean;
    updationCrash?: boolean;
    getAvailabilityCrash?: boolean;
  }
) {
  const appStoreLookupKey = metadataLookupKey;
  const normalizedCalendarData = calendarData || {
    create: {
      uid: "MOCK_ID",
    },
    update: {
      uid: "UPDATED_MOCK_ID",
    },
  };
  log.silly(`Mocking ${appStoreLookupKey} on appStoreMock`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createEventCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateEventCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteEventCalls: any[] = [];
  const app = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];

  const appMock = appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default];

  appMock &&
    `mockResolvedValue` in appMock &&
    appMock.mockResolvedValue({
      lib: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        CalendarService: function MockCalendarService() {
          return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createEvent: async function (...rest: any[]): Promise<NewCalendarEventType> {
              if (calendarData?.creationCrash) {
                throw new Error("MockCalendarService.createEvent fake error");
              }
              const [calEvent, credentialId] = rest;
              log.silly("mockCalendar.createEvent", JSON.stringify({ calEvent, credentialId }));
              createEventCalls.push(rest);
              return Promise.resolve({
                type: app.type,
                additionalInfo: {},
                uid: "PROBABLY_UNUSED_UID",
                // A Calendar is always expected to return an id.
                id: normalizedCalendarData.create?.id || "FALLBACK_MOCK_CALENDAR_EVENT_ID",
                iCalUID: normalizedCalendarData.create?.iCalUID,
                // Password and URL seems useless for CalendarService, plan to remove them if that's the case
                password: "MOCK_PASSWORD",
                url: "https://UNUSED_URL",
              });
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateEvent: async function (...rest: any[]): Promise<NewCalendarEventType> {
              if (calendarData?.updationCrash) {
                throw new Error("MockCalendarService.updateEvent fake error");
              }
              const [uid, event, externalCalendarId] = rest;
              log.silly("mockCalendar.updateEvent", JSON.stringify({ uid, event, externalCalendarId }));
              // eslint-disable-next-line prefer-rest-params
              updateEventCalls.push(rest);
              const isGoogleMeetLocation = event.location === BookingLocations.GoogleMeet;
              return Promise.resolve({
                type: app.type,
                additionalInfo: {},
                uid: "PROBABLY_UNUSED_UID",
                iCalUID: normalizedCalendarData.update?.iCalUID,

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                id: normalizedCalendarData.update?.uid || "FALLBACK_MOCK_ID",
                // Password and URL seems useless for CalendarService, plan to remove them if that's the case
                password: "MOCK_PASSWORD",
                url: "https://UNUSED_URL",
                location: isGoogleMeetLocation ? "https://UNUSED_URL" : undefined,
                hangoutLink: isGoogleMeetLocation ? "https://UNUSED_URL" : undefined,
                conferenceData: isGoogleMeetLocation ? event.conferenceData : undefined,
              });
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            deleteEvent: async (...rest: any[]) => {
              log.silly("mockCalendar.deleteEvent", JSON.stringify({ rest }));
              // eslint-disable-next-line prefer-rest-params
              deleteEventCalls.push(rest);
            },
            getAvailability: async (): Promise<EventBusyDate[]> => {
              if (calendarData?.getAvailabilityCrash) {
                throw new Error("MockCalendarService.getAvailability fake error");
              }
              return new Promise((resolve) => {
                resolve(calendarData?.busySlots || []);
              });
            },
          };
        },
      },
    });
  return {
    createEventCalls,
    deleteEventCalls,
    updateEventCalls,
  };
}

export function mockCalendarToHaveNoBusySlots(
  metadataLookupKey: keyof typeof appStoreMetadata,
  calendarData?: Parameters<typeof mockCalendar>[1]
) {
  calendarData = calendarData || {
    create: {
      uid: "MOCK_ID",
    },
    update: {
      uid: "UPDATED_MOCK_ID",
    },
  };
  return mockCalendar(metadataLookupKey, { ...calendarData, busySlots: [] });
}

export function mockCalendarToCrashOnCreateEvent(metadataLookupKey: keyof typeof appStoreMetadata) {
  return mockCalendar(metadataLookupKey, { creationCrash: true });
}

export function mockCalendarToCrashOnUpdateEvent(metadataLookupKey: keyof typeof appStoreMetadata) {
  return mockCalendar(metadataLookupKey, { updationCrash: true });
}

export function mockVideoApp({
  metadataLookupKey,
  appStoreLookupKey,
  videoMeetingData,
  creationCrash,
  updationCrash,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
  videoMeetingData?: {
    password: string;
    id: string;
    url: string;
  };
  creationCrash?: boolean;
  updationCrash?: boolean;
}) {
  appStoreLookupKey = appStoreLookupKey || metadataLookupKey;
  videoMeetingData = videoMeetingData || {
    id: "MOCK_ID",
    password: "MOCK_PASS",
    url: `http://mock-${metadataLookupKey}.example.com`,
  };
  log.silly("mockVideoApp", JSON.stringify({ metadataLookupKey, appStoreLookupKey }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMeetingCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMeetingCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteMeetingCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default].mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          VideoApiAdapter: (credential) => {
            return {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              createMeeting: (...rest: any[]) => {
                if (creationCrash) {
                  throw new Error("MockVideoApiAdapter.createMeeting fake error");
                }
                createMeetingCalls.push({
                  credential,
                  args: rest,
                });

                return Promise.resolve({
                  type: appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata].type,
                  ...videoMeetingData,
                });
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              updateMeeting: async (...rest: any[]) => {
                if (updationCrash) {
                  throw new Error("MockVideoApiAdapter.updateMeeting fake error");
                }
                const [bookingRef, calEvent] = rest;
                updateMeetingCalls.push({
                  credential,
                  args: rest,
                });
                if (!bookingRef.type) {
                  throw new Error("bookingRef.type is not defined");
                }
                if (!calEvent.organizer) {
                  throw new Error("calEvent.organizer is not defined");
                }
                log.silly("MockVideoApiAdapter.updateMeeting", JSON.stringify({ bookingRef, calEvent }));
                return Promise.resolve({
                  type: appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata].type,
                  ...videoMeetingData,
                });
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              deleteMeeting: async (...rest: any[]) => {
                log.silly("MockVideoApiAdapter.deleteMeeting", JSON.stringify(rest));
                deleteMeetingCalls.push({
                  credential,
                  args: rest,
                });
              },
            };
          },
        },
      });
    });
  });
  return {
    createMeetingCalls,
    updateMeetingCalls,
    deleteMeetingCalls,
  };
}

export function mockSuccessfulVideoMeetingCreation({
  metadataLookupKey,
  appStoreLookupKey,
  videoMeetingData,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
  videoMeetingData?: {
    password: string;
    id: string;
    url: string;
  };
}) {
  return mockVideoApp({
    metadataLookupKey,
    appStoreLookupKey,
    videoMeetingData,
  });
}

export function mockVideoAppToCrashOnCreateMeeting({
  metadataLookupKey,
  appStoreLookupKey,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
}) {
  return mockVideoApp({
    metadataLookupKey,
    appStoreLookupKey,
    creationCrash: true,
  });
}

export function mockPaymentApp({
  metadataLookupKey,
  appStoreLookupKey,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
}) {
  appStoreLookupKey = appStoreLookupKey || metadataLookupKey;
  const { paymentUid, externalId, MockPaymentService } = getMockPaymentService();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default].mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          PaymentService: MockPaymentService,
        },
      });
    });
  });

  return {
    paymentUid,
    externalId,
  };
}

export function mockErrorOnVideoMeetingCreation({
  metadataLookupKey,
  appStoreLookupKey,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
}) {
  appStoreLookupKey = appStoreLookupKey || metadataLookupKey;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.default[appStoreLookupKey].mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          VideoApiAdapter: () => ({
            createMeeting: () => {
              throw new MockError("Error creating Video meeting");
            },
          }),
        },
      });
    });
  });
}

export function mockCrmApp(
  metadataLookupKey: string,
  crmData?: {
    createContacts?: {
      id: string;
      email: string;
    }[];
    getContacts?: {
      id: string;
      email: string;
      ownerEmail: string;
    }[];
  }
) {
  let contactsCreated: {
    id: string;
    email: string;
  }[] = [];
  let contactsQueried: {
    id: string;
    email: string;
    ownerEmail: string;
  }[] = [];
  const eventsCreated: boolean[] = [];
  const app = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];
  const appMock = appStoreMock.default[metadataLookupKey as keyof typeof appStoreMock.default];
  appMock &&
    `mockResolvedValue` in appMock &&
    appMock.mockResolvedValue({
      lib: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        CrmService: class {
          constructor() {
            log.debug("Create CrmSerive");
          }

          createContact() {
            if (crmData?.createContacts) {
              contactsCreated = crmData.createContacts;
              return Promise.resolve(crmData?.createContacts);
            }
          }

          getContacts(email: string) {
            if (crmData?.getContacts) {
              contactsQueried = crmData?.getContacts;
              const contactsOfEmail = contactsQueried.filter((contact) => contact.email === email);

              return Promise.resolve(contactsOfEmail);
            }
          }

          createEvent() {
            eventsCreated.push(true);
            return Promise.resolve({});
          }
        },
      },
    });

  return {
    contactsCreated,
    contactsQueried,
    eventsCreated,
  };
}

export function getBooker({
  name,
  email,
  attendeePhoneNumber,
}: {
  name: string;
  email: string;
  attendeePhoneNumber?: string;
}) {
  return {
    name,
    email,
    attendeePhoneNumber,
  };
}

export function getMockedStripePaymentEvent({ paymentIntentId }: { paymentIntentId: string }) {
  return {
    id: null,
    data: {
      object: {
        id: paymentIntentId,
      },
    },
  } as unknown as Stripe.Event;
}

export async function mockPaymentSuccessWebhookFromStripe({ externalId }: { externalId: string }) {
  let webhookResponse = null;
  try {
    await handleStripePaymentSuccess(getMockedStripePaymentEvent({ paymentIntentId: externalId }));
  } catch (e) {
    log.silly("mockPaymentSuccessWebhookFromStripe:catch", JSON.stringify(e));
    webhookResponse = e as HttpError;
  }
  return { webhookResponse };
}

export function getExpectedCalEventForBookingRequest({
  bookingRequest,
  eventType,
}: {
  bookingRequest: ReturnType<typeof getMockRequestDataForBooking>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventType: any;
}) {
  return {
    // keep adding more fields as needed, so that they can be verified in all scenarios
    type: eventType.slug,
    // Not sure why, but milliseconds are missing in cal Event.
    startTime: bookingRequest.start.replace(".000Z", "Z"),
    endTime: bookingRequest.end.replace(".000Z", "Z"),
  };
}

export function getMockBookingReference(
  bookingReference: Partial<BookingReference> & Pick<BookingReference, "type" | "uid" | "credentialId">
) {
  let credentialId = bookingReference.credentialId;
  if (bookingReference.type === appStoreMetadata.dailyvideo.type) {
    // Right now we seems to be storing credentialId for `dailyvideo` in BookingReference as null. Another possible value is 0 in there.
    credentialId = null;
    log.debug("Ensuring null credentialId for dailyvideo");
  }
  return {
    ...bookingReference,
    credentialId,
  };
}

export function getMockBookingAttendee(
  attendee: Omit<Attendee, "bookingId" | "phoneNumber" | "email" | "noShow"> & {
    bookingSeat?: AttendeeBookingSeatInput;
    phoneNumber?: string | null;
    email: string;
    noShow?: boolean;
  }
) {
  return {
    id: attendee.id,
    timeZone: attendee.timeZone,
    name: attendee.name,
    email: attendee.email,
    locale: attendee.locale,
    bookingSeat: attendee.bookingSeat || null,
    phoneNumber: attendee.phoneNumber ?? undefined,
    noShow: attendee.noShow ?? false,
  };
}

const getMockAppStatus = ({
  slug,
  failures,
  success,
  overrideName,
}: {
  slug: string;
  failures: number;
  success: number;
  overrideName?: string;
}) => {
  const foundEntry = Object.entries(appStoreMetadata).find(([, app]) => {
    return app.slug === slug;
  });
  if (!foundEntry) {
    throw new Error("App not found for the slug");
  }
  const foundApp = foundEntry[1];
  return {
    appName: overrideName ?? foundApp.slug,
    type: foundApp.type,
    failures,
    success,
    errors: [],
  };
};
export const getMockFailingAppStatus = ({ slug }: { slug: string }) => {
  return getMockAppStatus({ slug, failures: 1, success: 0 });
};

export const getMockPassingAppStatus = ({ slug, overrideName }: { slug: string; overrideName?: string }) => {
  return getMockAppStatus({ slug, overrideName, failures: 0, success: 1 });
};

export const replaceDates = (dates: string[], replacement: Record<string, string>) => {
  return dates.map((date) => {
    return date.replace(/(.*)T/, (_, group1) => `${replacement[group1]}T`);
  });
};

export const getDefaultBookingFields = ({
  emailField,
  bookingFields = [],
}: {
  emailField?: Fields[number];
  bookingFields: Fields;
}) => {
  return [
    {
      name: "name",
      type: "name",
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system",
      required: true,
      defaultLabel: "your_name",
    },
    !!emailField
      ? emailField
      : {
          name: "email",
          type: "email",
          label: "",
          hidden: false,
          sources: [{ id: "default", type: "default", label: "Default" }],
          editable: "system",
          required: true,
          placeholder: "",
          defaultLabel: "email_address",
        },
    {
      name: "location",
      type: "radioInput",
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system",
      required: false,
      defaultLabel: "location",
      getOptionsAt: "locations",
      optionsInputs: {
        phone: { type: "phone", required: true, placeholder: "" },
        attendeeInPerson: { type: "address", required: true, placeholder: "" },
      },
      hideWhenJustOneOption: true,
    },
    {
      name: "title",
      type: "text",
      hidden: true,
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system-but-optional",
      required: true,
      defaultLabel: "what_is_this_meeting_about",
      defaultPlaceholder: "",
    },
    {
      name: "notes",
      type: "textarea",
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system-but-optional",
      required: false,
      defaultLabel: "additional_notes",
      defaultPlaceholder: "share_additional_notes",
    },
    {
      name: "guests",
      type: "multiemail",
      hidden: false,
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system-but-optional",
      required: false,
      defaultLabel: "additional_guests",
      defaultPlaceholder: "email",
    },
    {
      name: "rescheduleReason",
      type: "textarea",
      views: [{ id: "reschedule", label: "Reschedule View" }],
      sources: [{ id: "default", type: "default", label: "Default" }],
      editable: "system-but-optional",
      required: false,
      defaultLabel: "reason_for_reschedule",
      defaultPlaceholder: "reschedule_placeholder",
    },
    ...bookingFields,
  ] as Fields;
};
