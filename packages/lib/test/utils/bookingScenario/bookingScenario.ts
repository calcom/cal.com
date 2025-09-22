import i18nMock from "../../../../../tests/libs/__mocks__/libServerI18n";
import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { vi } from "vitest";
import "vitest-fetch-mock";
import type { z } from "zod";

// TODO: Find alternative approach (important-comment)
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import type {
  Attendee,
  Booking,
  BookingReference,
  Credential,
  DestinationCalendar,
  EventType,
  Host,
  Prisma,
  Schedule,
  SelectedCalendar,
  User,
  Webhook,
  WorkflowReminder,
  App,
  Team,
  Membership,
  Profile,
} from "@calcom/prisma/client";
import {
  AppCategories,
  BookingStatus,
  MembershipRole,
  PeriodType,
  SchedulingType,
  WorkflowActions,
  WorkflowMethods,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, VideoCallData } from "@calcom/types/Calendar";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

// Import restrictions prevent importing from @calcom/app-store in @calcom/lib
// These imports have been removed to fix architectural dependency issues
type LocationObject = any; // TODO: Define proper type or find alternative (important-comment)
const MeetLocationType = "integrations:meet"; // TODO: Import from proper location (important-comment)
const appStoreMetadata: any = {}; // TODO: Find alternative approach (important-comment)
const _getAppFromSlug = (slug: string) => appStoreMetadata[slug]; // TODO: Find alternative approach (important-comment)

type ScenarioData = {
  eventTypes: any[];
  users: any[];
  apps?: any[];
  webhooks?: any[];
  workflows?: any[];
  bookings?: any[];
  selectedSlots?: any[];
  credentials?: any;
  schedules?: any[];
};

const log = logger.getSubLogger({ prefix: ["[bookingScenario]"] });

type WhiteListedBookingProps = {
  id?: number;
  uid?: string;
  userId?: number | null;
  eventTypeId?: number | null;
  title?: string;
  description?: string | null;
  startTime?: Date;
  endTime?: Date;
  location?: string | null;
  paid?: boolean;
  status?: BookingStatus;
  rescheduled?: boolean | null;
  references?: Partial<BookingReference>[];
  attendees?: {
    email: string;
    name: string;
    timeZone: string;
    locale?: string;
  }[];
  user?: Partial<User>;
  responses?: Prisma.JsonValue | null;
  metadata?: Prisma.JsonValue | null;
  smsReminderNumber?: string | null;
  workflowReminders?: WorkflowReminder[];
  customInputs?: Prisma.JsonValue | null;
  dynamicEventSlugRef?: string | null;
  dynamicGroupSlugRef?: string | null;
  iCalUID?: string | null;
  iCalSequence?: number;
  fromReschedule?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  recurringEventId?: string | null;
  isRecorded?: boolean;
  rating?: number | null;
  ratingFeedback?: string | null;
  noShowHost?: boolean | null;
  oneTimePassword?: string | null;
  destinationCalendarId?: number | null;
  reassignById?: number | null;
  reassignReason?: string | null;
  rescheduledBy?: string | null;
};

type InputUser = Partial<
  Omit<
    User,
    | "createdDate"
    | "password"
    | "emailVerified"
    | "identityProvider"
    | "identityProviderId"
    | "invitedTo"
    | "allowDynamicBooking"
    | "avatar"
    | "completedOnboarding"
    | "locale"
    | "timeFormat"
    | "twoFactorSecret"
    | "twoFactorEnabled"
    | "backupCodes"
    | "role"
    | "organizationId"
    | "allowSEOIndexing"
    | "receiveMonthlyDigestEmail"
    | "movedToProfileId"
    | "isPlatformManaged"
    | "smsLockState"
  >
> & {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  schedules: {
    // Allows giving id in the input directly so that it can be referenced somewhere else as well
    id?: number;
    name: string;
    availability: {
      userId?: number | null;
      eventTypeId?: number | null;
      days: number[];
      startTime: Date;
      endTime: Date;
      date: string | null;
    }[];
    timeZone: string;
    dateOverrides?: {
      date: string;
      startTime: Date;
      endTime: Date;
    }[];
  }[];
  credentials?: InputCredential[];
  selectedCalendars?: Partial<SelectedCalendar>[];
  destinationCalendar?: Partial<DestinationCalendar>;
  teams?: {
    membership: Partial<Membership>;
    team: Partial<Team>;
  }[];
  profiles?: Partial<Profile>[];
};

type InputCredential = Partial<Credential> & {
  id?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: any;
  type: string;
  appId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
};

type InputSelectedCalendar = Partial<SelectedCalendar> & {
  externalId: string;
};

type InputEventType = Partial<
  Omit<EventType, "users" | "schedule" | "availability" | "bookingLimits" | "durationLimits">
> & {
  id: number;
  title?: string;
  length?: number;
  slotInterval?: number | null;
  minimumBookingNotice?: number;
  /**
   * These user ids are `ScenarioData["users"]` user ids not the actual user ids.
   * This is done to make it easy to create a scenario with multiple users.
   */
  users?: { id: number; priority?: number; weight?: number }[];
  hosts?: { userId: number; isFixed?: boolean; priority?: number; weight?: number }[];
  schedulingType?: SchedulingType | null;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  requiresConfirmation?: boolean;
  destinationCalendar?: Partial<DestinationCalendar>;
  schedule?: InputSchedule;
  bookingLimits?: any;
  durationLimits?: any;
  recurringEvent?: Prisma.JsonValue;
  locations?: LocationObject[];
  metadata?: Prisma.JsonValue;
  workflows?: {
    workflowId: number;
  }[];
  bookingFields?: any;
  disableGuests?: boolean;
  assignAllTeamMembers?: boolean;
  rescheduleWithSameRoundRobinHost?: boolean;
  includeNoShowInRRCalculation?: boolean;
  isRRWeightsEnabled?: boolean;
  assignRRMembersUsingSegment?: boolean;
  rrSegmentQueryValue?: string | null;
  useEventLevelSelectedCalendars?: boolean;
  restrictionScheduleId?: number | null;
  useBookerTimezone?: boolean;
  bookingRequiresAuthentication?: boolean;
};

type InputSchedule = Partial<Schedule> & {
  id?: number;
  name: string;
  availability: {
    userId?: number | null;
    eventTypeId?: number | null;
    days: number[];
    startTime: Date;
    endTime: Date;
    date: string | null;
  }[];
  timeZone: string;
  dateOverrides?: {
    date: string;
    startTime: Date;
    endTime: Date;
  }[];
};

type InputWorkflowReminder = Partial<WorkflowReminder> & {
  id?: number;
  bookingUid: string;
  method: WorkflowMethods;
  scheduledDate: Date;
  referenceId: string | null;
  scheduled: boolean;
  workflowStepId: number;
};

type InputBooking = Partial<Omit<Booking, keyof WhiteListedBookingProps>> & WhiteListedBookingProps;

export const Timezones = {
  "+5:30": "Asia/Kolkata",
  "+6:00": "Asia/Dhaka",
  "-11:00": "Pacific/Pago_Pago",
  "+14:00": "Pacific/Kiritimati",
};

function addHostsToDb(eventType: InputEventType) {
  if (!eventType.hosts) {
    return;
  }
  eventType.hosts.forEach((host) => {
    const existingHost = prismock.host.findFirst({
      where: {
        userId: host.userId,
        eventTypeId: eventType.id,
      },
    });
    if (existingHost) {
      return;
    }
    const data = {
      userId: host.userId,
      eventTypeId: eventType.id,
      isFixed: host.isFixed ?? false,
      priority: host.priority ?? 2,
      weight: host.weight ?? 100,
    };
    log.silly("TestData: Creating Host", JSON.stringify({ data }));
    prismock.host.create({
      data,
    });
  });
}

export async function addEventTypesToDb(
  eventTypes: (Omit<
    Prisma.EventTypeCreateInput,
    "users" | "workflows" | "destinationCalendar" | "schedule"
  > & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflows?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    destinationCalendar?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schedule?: any;
  })[]
) {
  log.silly("TestData: Creating EventType", JSON.stringify(eventTypes));
  const allEventTypes = [];
  for (let i = 0; i < eventTypes.length; i++) {
    const eventType = eventTypes[i];
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      users,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      workflows,
      destinationCalendar,
      schedule,
      ...rest
    } = eventType;
    const eventTypeCreateData = rest;
    if (schedule) {
      (eventTypeCreateData as any).schedule = {
        create: schedule,
      };
    }

    if (destinationCalendar) {
      (eventTypeCreateData as any).destinationCalendar = {
        create: destinationCalendar,
      };
    }

    if ((eventType as any).restrictionScheduleId) {
      const createdRestrictionSchedule = await prismock.schedule.create({
        data: {
          name: "Restriction Schedule",
          userId: (eventType as any).userId,
          timeZone: "UTC",
        },
      });
      eventTypeCreateData.restrictionSchedule = { connect: { id: createdRestrictionSchedule.id } };
    }

    if ((eventType as any).teamId) {
      const createdTeam = await prismock.team.create({
        data: {
          name: "Test Team",
          slug: `test-team-${(eventType as any).teamId}`,
        },
      });
      eventTypeCreateData.team = { connect: { id: createdTeam.id } };
    }

    const createdEventType = await prismock.eventType.create({
      data: eventTypeCreateData,
    });
    allEventTypes.push(createdEventType);
  }
  return allEventTypes;
}

export async function addEventTypes(eventTypes: InputEventType[], usersStore: InputUser[]) {
  const baseEventType = {
    title: "Base EventType Title",
    slug: "base-event-type-slug",
    timeZone: null,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    schedulingType: null,

    //TODO: What is the purpose of periodStartDate and periodEndDate? Test these?
    periodStartDate: new Date("2022-01-21T09:03:48.000Z"),
    periodEndDate: new Date("2022-01-21T09:03:48.000Z"),
    periodCountCalendarDays: false,
    periodDays: 30,
    periodType: PeriodType.UNLIMITED,
    requiresConfirmation: false,
    disableGuests: false,
    minimumBookingNotice: 0,
    length: 15,
  };
  const eventTypesWithUsers = eventTypes.map((eventType) => {
    if (!eventType.users) {
      return eventType;
    }
    return {
      ...baseEventType,
      ...eventType,
      users: eventType.users.map((userWithJustId) => {
        return usersStore.find((user) => user.id === userWithJustId.id) as any;
      }),
      hosts: eventType.hosts?.map((host) => {
        const user = usersStore.find((user) => user.id === host.userId);
        if (!user) {
          throw new Error(`Host with userId ${host.userId} not found`);
        }
        return {
          ...host,
          user,
        };
      }),
    };
  });

  log.silly("TestData: Creating EventType", JSON.stringify(eventTypesWithUsers));
  for (let i = 0; i < eventTypesWithUsers.length; i++) {
    const eventType = eventTypesWithUsers[i];
    addHostsToDb(eventType);
  }
  return await addEventTypesToDb(eventTypesWithUsers as any);
}

function addBookingReferencesToDB(bookingReferences: Partial<BookingReference>[]) {
  bookingReferences.forEach((bookingReference) => {
    prismock.bookingReference.create({ data: bookingReference });
  });
}

function _addBookingsToDb(bookings: InputBooking[]) {
  log.silly("TestData: Creating Bookings", JSON.stringify(bookings));

  const fixedBookings = bookings.map((booking) => {
    const bookingCreate = booking;
    if (booking.references) {
      addBookingReferencesToDB(booking.references);
      bookingCreate.references = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        connect: booking.references.map((reference) => ({ id: reference.id })),
      };
    }
    if (booking.attendees) {
      bookingCreate.attendees = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: booking.attendees,
      };
    }

    if (booking.user) {
      bookingCreate.user = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        connect: {
          id: booking.user.id,
        },
      };
    }
    return bookingCreate;
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return prismock.booking.createMany({ data: fixedBookings });
}

export async function addBookings(bookings: InputBooking[]) {
  log.silly("TestData: Creating Bookings", JSON.stringify(bookings));
  const allBookings = [...bookings].map((booking) => {
    if (booking.references) {
      addBookingReferencesToDB(booking.references);
    }
    return booking;
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  await prismock.booking.createMany({
    data: allBookings.map((booking) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { references, attendees, user, ...rest } = booking;
      return rest;
    }),
  });

  for (let i = 0; i < allBookings.length; i++) {
    const booking = allBookings[i];
    if (booking.references) {
      booking.references.forEach((reference) => {
        prismock.bookingReference.create({
          data: { ...reference, bookingId: booking.id },
        });
      });
    }
    if (booking.attendees) {
      booking.attendees.forEach((attendee) => {
        prismock.attendee.create({
          data: { ...attendee, bookingId: booking.id },
        });
      });
    }
    if (booking.user) {
      prismock.booking.update({
        where: { id: booking.id },
        data: {
          user: {
            connect: { id: booking.user.id },
          },
        },
      });
    }
  }
}

function addWebhooksToDb(webhooks: Webhook[]) {
  webhooks.forEach((webhook) => prismock.webhook.create({ data: webhook }));
}

function _addPaymentToDb(payments: Prisma.PaymentCreateInput[]) {
  payments.forEach((payment) => prismock.payment.create({ data: payment }));
}

function addWebhooks(webhooks: Webhook[]) {
  addWebhooksToDb(webhooks);
}

function addWorkflowsToDb(workflows: Prisma.WorkflowCreateInput[]) {
  workflows.forEach(async (workflow) => {
    if (workflow.team?.connect?.id) {
      const team = await prismock.team.findUnique({ where: { id: workflow.team.connect.id } });
      if (!team) {
        throw new Error(`Team with id ${workflow.team.connect.id} not found`);
      }
    }

    if (workflow.activeOn) {
      const createdWorkflow = await prismock.workflow.create({
        data: {
          ...workflow,
          activeOn: {
            connect: workflow.activeOn.connect,
          },
        },
      });
      if (workflow.steps) {
        if (Array.isArray(workflow.steps.create)) {
          workflow.steps.create.forEach(async (step: any) => {
            await prismock.workflowStep.create({
              data: {
                ...step,
                workflowId: createdWorkflow.id,
              },
            });
          });
        }
      }
    } else {
      await prismock.workflow.create({ data: workflow });
    }
  });
}

function addWorkflows(workflows: Prisma.WorkflowCreateInput[]) {
  return addWorkflowsToDb(workflows);
}

export async function addWorkflowReminders(workflowReminders: InputWorkflowReminder[]) {
  log.silly("TestData: Creating Workflow Reminders", safeStringify(workflowReminders));

  return await prismock.workflowReminder.createMany({
    data: workflowReminders,
  });
}

export async function addUsersToDb(users: InputUser[]) {
  log.silly("TestData: Creating Users", JSON.stringify(users));
  await prismock.user.createMany({
    data: users,
  });

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userData = user;
    if (user.schedules) {
      userData.schedules = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: user.schedules.map((schedule) => {
          return {
            ...schedule,
            availability: {
              create: schedule.availability.map((availability) => ({
                ...availability,
                userId: user.id,
              })),
            },
          };
        }),
      };
    }

    if (user.credentials) {
      userData.credentials = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: user.credentials,
      };
    }

    if (user.destinationCalendar) {
      userData.destinationCalendar = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: user.destinationCalendar,
      };
    }

    if (user.selectedCalendars) {
      userData.selectedCalendars = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: user.selectedCalendars,
      };
    }

    if (user.teams) {
      for (const teamData of user.teams) {
        await prismock.team.create({
          data: teamData.team,
        });
        await prismock.membership.create({
          data: {
            ...teamData.membership,
            userId: user.id,
            teamId: teamData.team.id,
          },
        });
      }
    }

    if (user.profiles) {
      for (const profile of user.profiles) {
        await prismock.profile.create({
          data: {
            ...profile,
            userId: user.id,
          },
        });
      }
    }
  }

  const allUsers = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const createdUser = await prismock.user.findUnique({
      where: { id: user.id },
      include: {
        schedules: {
          include: {
            availability: true,
          },
        },
        credentials: true,
        selectedCalendars: true,
        destinationCalendar: true,
      },
    });
    if (!createdUser) {
      throw new Error(`User with id ${user.id} not found`);
    }
    allUsers.push(createdUser);
  }
  return allUsers;
}

export async function addTeamsToDb(teams: NonNullable<InputUser["teams"]>[number]["team"][]) {
  log.silly("TestData: Creating Teams", JSON.stringify(teams));

  const teamsWithParentId = teams.filter((team) => team.parentId);
  const teamsWithoutParentId = teams.filter((team) => !team.parentId);

  for (const team of teamsWithoutParentId) {
    await prismock.team.create({
      data: team,
    });
  }

  for (const team of teamsWithParentId) {
    await prismock.team.create({
      data: team,
    });
  }

  const addedTeams = [];
  for (const team of teams) {
    const addedTeam = await prismock.team.findUnique({
      where: { id: team.id },
    });
    if (!addedTeam) {
      throw new Error(`Team with id ${team.id} not found`);
    }
    addedTeams.push(addedTeam);
  }
  return addedTeams;
}

export async function addUsers(users: InputUser[]) {
  const prismaUsersCreate = [];
  for (let i = 0; i < users.length; i++) {
    const newUser = users[i];
    if (newUser.schedules) {
      newUser.schedules = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: newUser.schedules.map((schedule) => {
          return {
            ...schedule,
            availability: {
              create: schedule.availability.map((availability) => ({
                ...availability,
                userId: newUser.id,
              })),
            },
          };
        }),
      };
    }

    if (newUser.credentials) {
      newUser.credentials = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: newUser.credentials,
      };
    }

    if (newUser.teams) {
      for (const teamData of newUser.teams) {
        await prismock.team.create({
          data: teamData.team,
        });
      }
    }

    if (newUser.selectedCalendars) {
      newUser.selectedCalendars = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: newUser.selectedCalendars,
      };
    }

    if (newUser.destinationCalendar) {
      newUser.destinationCalendar = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        create: newUser.destinationCalendar,
      };
    }

    if (newUser.profiles) {
      for (const profile of newUser.profiles) {
        await prismock.profile.create({
          data: {
            ...profile,
            userId: newUser.id,
          },
        });
      }
    }

    prismaUsersCreate.push(newUser);
  }

  await prismock.user.createMany({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    data: prismaUsersCreate,
  });

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.teams) {
      for (const teamData of user.teams) {
        await prismock.membership.create({
          data: {
            ...teamData.membership,
            userId: user.id,
            teamId: teamData.team.id,
          },
        });
      }
    }
  }
}

function addAppsToDb(apps: Partial<App>[]) {
  log.silly("TestData: Creating Apps", JSON.stringify(apps));
  apps.forEach((app) => prismock.app.create({ data: app }));
}

function addSelectedSlotsToDb(selectedSlots: { eventTypeId: number; slotUtcStartDate: string }[]) {
  const allSelectedSlots = selectedSlots.map((selectedSlot) => {
    return prismock.selectedSlots.create({
      data: {
        eventTypeId: selectedSlot.eventTypeId,
        slotUtcStartDate: selectedSlot.slotUtcStartDate,
        slotUtcEndDate: selectedSlot.slotUtcStartDate,
        userId: 1,
        isSeat: false,
        releaseAt: new Date(),
      },
    });
  });
  log.silly("TestData: Selected Slots as in DB", JSON.stringify({ selectedSlots: allSelectedSlots }));
}

export async function createBookingScenario(data: ScenarioData) {
  log.silly("TestData: Creating Scenario", JSON.stringify({ data }));
  await addUsers(data.users);
  if (data.apps) {
    addAppsToDb(data.apps);
  }
  await addEventTypes(data.eventTypes, data.users);
  if (data.bookings) {
    await addBookings(data.bookings);
  }
  if (data.webhooks) {
    addWebhooks(data.webhooks);
  }
  if (data.workflows) {
    addWorkflows(data.workflows);
  }
  if (data.selectedSlots) {
    addSelectedSlotsToDb(data.selectedSlots);
  }
}

function assertNonNullableSlug(slug: string | null): asserts slug is string {
  if (!slug) {
    throw new Error("Slug is required");
  }
}

export async function createOrganization(orgData: {
  name: string;
  slug: string;
  metadata?: z.infer<typeof teamMetadataSchema>;
}) {
  assertNonNullableSlug(orgData.slug);
  const org = await prismock.team.create({
    data: {
      name: orgData.name,
      slug: orgData.slug,
      metadata: orgData.metadata || null,
      isOrganization: true,
    },
  });

  const team = await prismock.team.findUnique({
    where: {
      id: org.id,
    },
    include: {
      members: true,
    },
  });
  if (!team) {
    throw new Error(`Team with id ${org.id} not found`);
  }
  return team;
}

export async function createCredentials(
  credentialData: {
    type: string;
    key: any;
    userId?: number;
    appId?: string;
    invalid?: boolean;
  }[]
) {
  for (const credential of credentialData) {
    const _credentials = await prismock.credential.create({
      data: credential,
    });
  }
}

/**
 * This fn indents to /ally compute day, month, year for the purpose of testing.
 * We are not using DayJS because that's actually being tested by this code.
 * - `dateIncrement` adds the increment to current day
 * - `monthIncrement` adds the increment to current month
 * - `yearIncrement` adds the increment to current year
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
  const { dateIncrement, monthIncrement, yearIncrement, fromDate } = param;
  dateIncrement = dateIncrement || 0;
  monthIncrement = monthIncrement || 0;
  yearIncrement = yearIncrement || 0;

  const _date = fromDate || new Date();

  const dateWithDayIncremented = new Date(
    _date.getFullYear(),
    _date.getMonth(),
    _date.getDate() + dateIncrement
  );
  const dateWithMonthIncremented = new Date(
    dateWithDayIncremented.getFullYear(),
    dateWithDayIncremented.getMonth() + monthIncrement,
    dateWithDayIncremented.getDate()
  );
  const dateWithYearIncremented = new Date(
    dateWithMonthIncremented.getFullYear() + yearIncrement,
    dateWithMonthIncremented.getMonth(),
    dateWithMonthIncremented.getDate()
  );
  return dateWithYearIncremented;
};

const weekdayToWeekIndex = (weekday: any) => {
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return weekdays.indexOf(weekday.toLowerCase());
};

const isWeekStart = (date: Date, weekStart: any) => {
  return date.getDay() === weekdayToWeekIndex(weekStart);
};

export const getNextMonthNotStartingOnWeekStart = (weekStart: any, from?: Date) => {
  const date = from ?? new Date();

  const incrementMonth = (date: Date) => {
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return nextMonth;
  };

  let nextMonth = incrementMonth(date);
  while (isWeekStart(nextMonth, weekStart)) {
    nextMonth = incrementMonth(nextMonth);
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
    scope?: string;
  };
}) {
  return {
    type: metadataLookupKey,
    appId: metadataLookupKey,
    app: {
      slug: metadataLookupKey,
      categories: [AppCategories.calendar],
      dirName: metadataLookupKey,
    },
    key: {
      expiry_date: Date.now() + 1000000,
      token_type: "Bearer",
      access_token: "access_token",
      refresh_token: "refresh_token",
      scope: "https://www.googleapis.com/auth/calendar",
      ...key,
    },
  };
}

export function getGoogleCalendarCredential() {
  return getMockedCredential({
    metadataLookupKey: "googlecalendar",
    key: {
      scope: "https://www.googleapis.com/auth/calendar",
    },
  });
}

export function getGoogleMeetCredential() {
  return getMockedCredential({
    metadataLookupKey: "googlevideo",
    key: {},
  });
}

export function getAppleCalendarCredential() {
  return getMockedCredential({
    metadataLookupKey: "applecalendar",
    key: {},
  });
}

export function getZoomAppCredential() {
  return getMockedCredential({
    metadataLookupKey: "zoomvideo",
    key: {},
  });
}

export function getStripeAppCredential() {
  return getMockedCredential({
    metadataLookupKey: "stripepayment",
    key: {},
  });
}

const TestData: ScenarioData = {
  selectedSlots: [
    {
      eventTypeId: 1,
      slotUtcStartDate: "2021-06-20T09:30:00.000Z",
    },
  ],
  eventTypes: [],
  credentials: {
    google: getGoogleCalendarCredential(),
  },
  schedules: [
    {
      id: 1,
      name: "9 to 5",
      availability: [
        {
          userId: null,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    },
    {
      id: 2,
      name: "9 to 5 in Europe/London",
      availability: [
        {
          userId: null,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: "Europe/London",
    },
    {
      id: 3,
      name: "9 to 5 in America/Phoenix",
      availability: [
        {
          userId: null,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: "America/Phoenix",
    },
  ],
  users: [
    {
      id: 101,
      username: "pro",
      name: "Pro Example",
      email: "pro@example.com",
      timeZone: Timezones["+5:30"],
      defaultScheduleId: 1,
      schedules: [
        {
          id: 1,
          name: "9 to 5",
          availability: [
            {
              userId: null,
              eventTypeId: null,
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
          timeZone: Timezones["+5:30"],
        },
      ],
    },
    {
      id: 102,
      username: "free",
      name: "Free Example",
      email: "free@example.com",
      timeZone: Timezones["+5:30"],
      defaultScheduleId: 1,
      schedules: [
        {
          id: 1,
          name: "9 to 5",
          availability: [
            {
              userId: null,
              eventTypeId: null,
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
          timeZone: Timezones["+5:30"],
        },
      ],
    },
    {
      id: 103,
      username: "example",
      name: "Example",
      email: "example@example.com",
      timeZone: Timezones["+5:30"],
      defaultScheduleId: 1,
      schedules: [
        {
          id: 1,
          name: "9 to 5",
          availability: [
            {
              userId: null,
              eventTypeId: null,
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
          timeZone: Timezones["+5:30"],
        },
      ],
    },
    {
      id: 104,
      username: "pro-user",
      name: "Pro Example",
      email: "pro-user@example.com",
      timeZone: Timezones["+5:30"],
      defaultScheduleId: 1,
      schedules: [
        {
          id: 1,
          name: "9 to 5",
          availability: [
            {
              userId: null,
              eventTypeId: null,
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
          timeZone: Timezones["+5:30"],
        },
      ],
    },
    {
      id: 105,
      username: "pro-2",
      name: "Pro Example 2",
      email: "pro-2@example.com",
      timeZone: Timezones["+5:30"],
      defaultScheduleId: 1,
      schedules: [
        {
          id: 1,
          name: "9 to 5",
          availability: [
            {
              userId: null,
              eventTypeId: null,
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
          timeZone: Timezones["+5:30"],
        },
      ],
    },
    {
      id: 106,
      username: "pro-3",
      name: "Pro Example 3",
      email: "pro-3@example.com",
      timeZone: Timezones["+5:30"],
      defaultScheduleId: 1,
      schedules: [
        {
          id: 1,
          name: "9 to 5",
          availability: [
            {
              userId: null,
              eventTypeId: null,
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
          timeZone: Timezones["+5:30"],
        },
      ],
    },
    {
      id: 107,
      username: "pro-4",
      name: "Pro Example 4",
      email: "pro-4@example.com",
      timeZone: Timezones["+5:30"],
      defaultScheduleId: 1,
      schedules: [
        {
          id: 1,
          name: "9 to 5",
          availability: [
            {
              userId: null,
              eventTypeId: null,
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
          timeZone: Timezones["+5:30"],
        },
      ],
    },
  ],
} satisfies ScenarioData;

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
  locale,
  timeZone,
  defaultScheduleId,
}: {
  name: string;
  email: string;
  id: number;
  schedules: InputUser["schedules"];
  credentials?: InputCredential[];
  selectedCalendars?: InputSelectedCalendar[];
  destinationCalendar?: Partial<DestinationCalendar>;
  locale?: string;
  timeZone: string;
  defaultScheduleId?: number | null;
}) {
  return {
    ...TestData.users[0],
    name,
    email,
    id,
    schedules,
    credentials,
    selectedCalendars,
    destinationCalendar,
    locale: locale ?? "en",
    timeZone,
    defaultScheduleId,
  };
}

export function getScenarioData({
  organizer,
  eventTypes,
  usersApartFromOrganizer = [],
  apps = [],
  webhooks,
  workflows,
  bookings,
  selectedSlots,
}: // hosts = [],
{
  organizer: ReturnType<typeof getOrganizer>;
  eventTypes: ScenarioData["eventTypes"];
  usersApartFromOrganizer?: ScenarioData["users"];
  apps?: ScenarioData["apps"];
  webhooks?: ScenarioData["webhooks"];
  workflows?: ScenarioData["workflows"];
  bookings?: ScenarioData["bookings"];
  selectedSlots?: ScenarioData["selectedSlots"];
}) {
  const users = [organizer, ...usersApartFromOrganizer];
  eventTypes.forEach((eventType: any) => {
    if (eventType.users?.find((user: any) => user.id === organizer.id)) {
      return;
    }
    eventType.users = eventType.users || [];
    eventType.users.push({
      id: organizer.id,
    });
  });

  if (organizer.profiles) {
    organizer.profiles.forEach((profile: any) => {
      if (!profile.organizationId) {
        return;
      }
      const newUser = {
        ...organizer,
        id: profile.userId || organizer.id,
        organizationId: profile.organizationId,
      };
      users.push(newUser);
    });
  }

  return {
    eventTypes,
    users,
    apps,
    webhooks,
    workflows,
    bookings,
    selectedSlots,
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
      resolve(identityFn);
    });
  });
}

export const BookingLocations = {
  CalVideo: { type: MeetLocationType },
};

export type CalendarServiceMethodMockCallBase = {
  calendarId: string;
  event: CalendarEvent;
};

export type CalendarServiceMethodMock = {
  createEvent: jest.Mock<
    Promise<{ uid: string; id: string; type: string; password: string; url: string }>,
    [CalendarServiceMethodMockCallBase]
  >;
  updateEvent: jest.Mock<
    Promise<{ uid: string; id: string; type: string; password: string; url: string }>,
    [string, CalendarEvent, string]
  >;
  deleteEvent: jest.Mock<Promise<void>, [string, CalendarEvent, string]>;
  getAvailability: jest.Mock<Promise<EventBusyDate[]>, [string, string, string]>;
};

export function mockCalendar(
  name: string,
  {
    create,
    update,
    delete: del,
    busySlots = [],
  }: {
    create?: { uid: string; id: string };
    update?: { uid: string; id: string };
    delete?: unknown;
    busySlots?: EventBusyDate[];
  }
) {
  const appStoreAppMetadata = appStoreMetadata[name as keyof typeof appStoreMetadata];
  const dirName = appStoreAppMetadata?.dirName || name;

  vi.doMock(`@calcom/app-store/${dirName}/lib/CalendarService`, async (importOriginal) => {
    const originalModule = await importOriginal();
    const createEventMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({
          uid: create?.uid || "MOCK_ID",
          id: create?.id || "MOCK_ID",
          type: MeetLocationType,
          password: "MOCK_PASS",
          url: `http://mock-${name}.example.com`,
        });
      });
    });
    const updateEventMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({
          uid: update?.uid || "UPDATED_MOCK_ID",
          id: update?.id || "UPDATED_MOCK_ID",
          type: MeetLocationType,
          password: "MOCK_PASS",
          url: `http://mock-${name}.example.com`,
        });
      });
    });

    const deleteEventMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve(del);
      });
    });

    const getAvailabilityMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve(busySlots);
      });
    });

    const MockCalendarService = vi.fn().mockImplementation(() => {
      return {
        createEvent: createEventMock,
        updateEvent: updateEventMock,
        deleteEvent: deleteEventMock,
        getAvailability: getAvailabilityMock,
      };
    });

    const mockedModule = {
      ...(originalModule as any),
      default: MockCalendarService,
    };
    return mockedModule;
  });

  const createEventMock = vi.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        uid: create?.uid || "MOCK_ID",
        id: create?.id || "MOCK_ID",
        type: MeetLocationType,
        password: "MOCK_PASS",
        url: `http://mock-${name}.example.com`,
      });
    });
  });
  const updateEventMock = vi.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        uid: update?.uid || "UPDATED_MOCK_ID",
        id: update?.id || "UPDATED_MOCK_ID",
        type: MeetLocationType,
        password: "MOCK_PASS",
        url: `http://mock-${name}.example.com`,
      });
    });
  });

  const deleteEventMock = vi.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      resolve(del);
    });
  });

  const getAvailabilityMock = vi.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      resolve(busySlots);
    });
  });

  return {
    createEvent: createEventMock,
    updateEvent: updateEventMock,
    deleteEvent: deleteEventMock,
    getAvailability: getAvailabilityMock,
  };
}

export function mockSuccessfulVideoMeetingCreation({
  metadataLookupKey,
  videoMeetingData,
}: {
  metadataLookupKey: string;
  videoMeetingData: {
    id: string;
    password: string;
    url: string;
  };
}) {
  const appStoreAppMetadata = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];
  const dirName = appStoreAppMetadata?.dirName || metadataLookupKey;
  vi.doMock(`@calcom/app-store/${dirName}/lib/VideoApiAdapter`, async (importOriginal) => {
    const originalModule = await importOriginal();
    const createMeetingMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({
          type: appStoreAppMetadata?.type,
          ...videoMeetingData,
        });
      });
    });

    const updateMeetingMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({
          type: appStoreAppMetadata?.type,
          ...videoMeetingData,
        });
      });
    });

    const deleteMeetingMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve(undefined);
      });
    });

    const MockVideoApiAdapter = vi.fn().mockImplementation(() => {
      return {
        createMeeting: createMeetingMock,
        updateMeeting: updateMeetingMock,
        deleteMeeting: deleteMeetingMock,
      };
    });

    const mockedModule = {
      ...(originalModule as any),
      default: MockVideoApiAdapter,
    };
    return mockedModule;
  });

  return {
    createMeeting: vi.fn().mockResolvedValue({
      type: appStoreAppMetadata?.type,
      ...videoMeetingData,
    }),
    updateMeeting: vi.fn().mockResolvedValue({
      type: appStoreAppMetadata?.type,
      ...videoMeetingData,
    }),
    deleteMeeting: vi.fn().mockResolvedValue({}),
  };
}

export function mockCalendarToHaveNoBusySlots(
  metadataLookupKey: string,
  calendarService: CalendarServiceMethodMock
) {
  const appStoreAppMetadata = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];
  const dirName = appStoreAppMetadata?.dirName || metadataLookupKey;
  vi.doMock(`@calcom/app-store/${dirName}/lib/CalendarService`, async (importOriginal) => {
    const originalModule = await importOriginal();

    const MockCalendarService = vi.fn().mockImplementation(() => {
      return calendarService;
    });

    const mockedModule = {
      ...(originalModule as any),
      default: MockCalendarService,
    };
    return mockedModule;
  });
}

export function mockVideoApp({
  metadataLookupKey,
  appStoreAppMetadata,
}: {
  metadataLookupKey: string;
  appStoreAppMetadata: (typeof appStoreMetadata)[keyof typeof appStoreMetadata];
}) {
  vi.doMock(
    `@calcom/app-store/${appStoreAppMetadata.dirName}/lib/VideoApiAdapter`,
    async (importOriginal) => {
      const originalModule = await importOriginal();
      const createMeetingMock = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolve({
            type: appStoreAppMetadata?.type,
            id: "MOCK_ID",
            password: "MOCK_PASS",
            url: `http://mock-${metadataLookupKey}.example.com`,
          });
        });
      });

      const updateMeetingMock = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolve({
            type: appStoreAppMetadata?.type,
            id: "MOCK_ID",
            password: "MOCK_PASS",
            url: `http://mock-${metadataLookupKey}.example.com`,
          });
        });
      });

      const deleteMeetingMock = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolve(undefined);
        });
      });

      const MockVideoApiAdapter = vi.fn().mockImplementation(() => {
        return {
          createMeeting: createMeetingMock,
          updateMeeting: updateMeetingMock,
          deleteMeeting: deleteMeetingMock,
        };
      });

      const mockedModule = {
        ...(originalModule as any),
        default: MockVideoApiAdapter,
      };
      return mockedModule;
    }
  );
}

export function mockPaymentApp({
  metadataLookupKey,
  appStoreAppMetadata,
}: {
  metadataLookupKey: string;
  appStoreAppMetadata: (typeof appStoreMetadata)[keyof typeof appStoreMetadata];
}) {
  vi.doMock(`@calcom/app-store/${appStoreAppMetadata.dirName}/lib/PaymentService`, async (importOriginal) => {
    const originalModule = await importOriginal();

    const createPaymentMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({
          uid: "MOCK_PAYMENT_ID",
          url: `http://mock-${metadataLookupKey}.example.com/pay`,
        });
      });
    });

    const MockPaymentService = vi.fn().mockImplementation(() => {
      return {
        create: createPaymentMock,
      };
    });

    const mockedModule = {
      ...(originalModule as any),
      default: MockPaymentService,
    };
    return mockedModule;
  });
}

export function mockCrmApp({
  metadataLookupKey,
  appStoreAppMetadata,
}: {
  metadataLookupKey: string;
  appStoreAppMetadata: (typeof appStoreMetadata)[keyof typeof appStoreMetadata];
}) {
  // Mock the CrmServiceMap directly instead of using the old app-store index approach
  vi.doMock("@calcom/app-store/crm.apps.generated", async (importOriginal) => {
    const original = await importOriginal();

    class MockCrmService {
      constructor() {
        log.debug("Create CrmService");
      }

      createContact() {
        log.debug("CrmService createContact");
        return Promise.resolve({
          type: appStoreAppMetadata.type,
          id: "MOCK_CRM_ID",
          url: `http://mock-${metadataLookupKey}.example.com/contact/1`,
        });
      }

      updateContact() {
        log.debug("CrmService updateContact");
        return Promise.resolve({
          type: appStoreAppMetadata.type,
          id: "MOCK_CRM_ID",
          url: `http://mock-${metadataLookupKey}.example.com/contact/1`,
        });
      }

      deleteContact() {
        log.debug("CrmService deleteContact");
        return Promise.resolve();
      }

      getContacts() {
        log.debug("CrmService getContacts");
        return Promise.resolve([]);
      }
    }

    return {
      ...(original as any),
      crmServiceMap: {
        ...(original as any).crmServiceMap,
        [metadataLookupKey]: MockCrmService,
      },
    };
  });
}

export function mockApp(appName: string) {
  const appStoreAppMetadata = appStoreMetadata[appName as keyof typeof appStoreMetadata];
  const normalizedAppName = appName.toLowerCase();

  if (appStoreAppMetadata?.categories?.includes(AppCategories.video)) {
    mockVideoApp({
      metadataLookupKey: normalizedAppName,
      appStoreAppMetadata,
    });
  }

  if (appStoreAppMetadata?.categories?.includes(AppCategories.payment)) {
    mockPaymentApp({
      metadataLookupKey: normalizedAppName,
      appStoreAppMetadata,
    });
  }

  if (appStoreAppMetadata?.categories?.includes(AppCategories.crm)) {
    mockCrmApp({
      metadataLookupKey: normalizedAppName,
      appStoreAppMetadata,
    });
  }
}

export function getMockBookingAttendee({
  email,
  name,
  locale,
  timeZone,
}: {
  email: string;
  name: string;
  locale: string;
  timeZone: string;
}) {
  return {
    email,
    name,
    timeZone,
    locale,
  };
}

export function getMockBookingReference({
  id,
  type,
  uid,
  meetingId,
  meetingPassword,
  meetingUrl,
  externalCalendarId,
  deleted,
  credentialId,
}: {
  id?: number;
  type: string;
  uid?: string;
  meetingId?: string;
  meetingPassword?: string;
  meetingUrl?: string;
  externalCalendarId?: string;
  deleted?: boolean;
  credentialId?: number;
}) {
  return {
    id,
    type,
    uid: uid || "MOCK_ID",
    meetingId: meetingId || "MOCK_ID",
    meetingPassword: meetingPassword || "MOCK_PASSWORD",
    meetingUrl: meetingUrl || "http://mock-meeting.example.com",
    externalCalendarId: externalCalendarId || "MOCK_CALENDAR_ID",
    deleted: deleted || false,
    credentialId: credentialId || 1,
  };
}

export function getMockPaymentReference({
  id,
  bookingId,
  type,
  uid,
  externalId,
}: {
  id?: number;
  bookingId: number;
  type: string;
  uid?: string;
  externalId?: string;
}) {
  return {
    id,
    bookingId,
    type,
    uid: uid || "MOCK_PAYMENT_ID",
    externalId: externalId || "MOCK_EXTERNAL_ID",
  };
}

export function getMockDestinationCalendar(): Partial<DestinationCalendar> {
  return {
    id: 1,
    integration: "google_calendar",
    externalId: "mock@example.com",
    primaryEmail: "mock@example.com",
    userId: 1,
    eventTypeId: null,
    credentialId: 1,
  };
}

export function getMockSelectedCalendar(): Partial<SelectedCalendar> {
  return {
    userId: 1,
    integration: "google_calendar",
    externalId: "mock@example.com",
    credentialId: 1,
  };
}

export function getMockWebhook({
  id,
  userId,
  eventTypeId,
  subscriberUrl,
  eventTriggers,
  active,
  secret,
}: {
  id?: string;
  userId?: number;
  eventTypeId?: number;
  subscriberUrl: string;
  eventTriggers: string[];
  active?: boolean;
  secret?: string;
}): Partial<Webhook> {
  return {
    id: id || uuidv4(),
    userId: userId || null,
    eventTypeId: eventTypeId || null,
    subscriberUrl,
    eventTriggers: eventTriggers as any,
    active: active ?? true,
    secret: secret || null,
    payloadTemplate: null,
    createdAt: new Date(),
    appId: null,
    teamId: null,
    platformOAuthClientId: null,
    time: null,
    timeUnit: null,
    platform: false,
  };
}

export function getMockWorkflow({
  id,
  name,
  userId,
  teamId,
  trigger,
  time,
  timeUnit,
}: {
  id?: number;
  name: string;
  userId?: number;
  teamId?: number;
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: string;
}): Partial<Prisma.WorkflowCreateInput> {
  return {
    name,
    user: userId ? { connect: { id: userId } } : undefined,
    team: teamId ? { connect: { id: teamId } } : undefined,
    trigger,
    time: time || null,
    timeUnit: (timeUnit as any) || null,
  };
}

export function getMockWorkflowStep({
  id,
  stepNumber,
  action,
  workflowId,
  sendTo,
  reminderBody,
  emailSubject,
  template,
}: {
  id?: number;
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo?: string;
  reminderBody?: string;
  emailSubject?: string;
  template?: string;
}): Partial<Prisma.WorkflowStepCreateInput> {
  return {
    stepNumber,
    action,
    workflow: { connect: { id: workflowId } },
    sendTo: sendTo || null,
    reminderBody: reminderBody || null,
    emailSubject: emailSubject || null,
    template: (template as any) || "REMINDER",
  };
}

export function getMockWorkflowReminder({
  id,
  bookingUid,
  method,
  scheduledDate,
  referenceId,
  scheduled,
  workflowStepId,
}: {
  id?: number;
  bookingUid: string;
  method: WorkflowMethods;
  scheduledDate: Date;
  referenceId?: string;
  scheduled?: boolean;
  workflowStepId: number;
}): InputWorkflowReminder {
  return {
    id,
    bookingUid,
    method,
    scheduledDate,
    referenceId: referenceId || null,
    scheduled: scheduled ?? false,
    workflowStepId,
  };
}

export function getMockApp({
  slug,
  dirName,
  categories,
  type,
}: {
  slug: string;
  dirName: string;
  categories: AppCategories[];
  type: string;
}): Partial<App> {
  return {
    slug,
    dirName,
    categories,
    keys: null,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function getMockTeam({
  id,
  name,
  slug,
  logo,
  appLogo,
  appIconLogo,
  bio,
  hideBranding,
  isPrivate,
  hideBookATeamMember,
  metadata,
  theme,
  brandColor,
  darkBrandColor,
  parentId,
  logoUrl,
  calVideoLogo,
  weekStart,
  timeZone,
  timeFormat,
  isOrganization,
}: {
  id?: number;
  name: string;
  slug?: string;
  logo?: string;
  appLogo?: string;
  appIconLogo?: string;
  bio?: string;
  hideBranding?: boolean;
  isPrivate?: boolean;
  hideBookATeamMember?: boolean;
  metadata?: Prisma.JsonValue;
  theme?: string;
  brandColor?: string;
  darkBrandColor?: string;
  parentId?: number;
  logoUrl?: string;
  calVideoLogo?: string;
  weekStart?: string;
  timeZone?: string;
  timeFormat?: number;
  isOrganization?: boolean;
}): Partial<Team> {
  return {
    id,
    name,
    slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
    appLogo: appLogo || null,
    appIconLogo: appIconLogo || null,
    bio: bio || null,
    hideBranding: hideBranding ?? false,
    isPrivate: isPrivate ?? false,
    hideBookATeamMember: hideBookATeamMember ?? false,
    metadata: metadata || null,
    theme: theme || null,
    brandColor: brandColor || "#292929",
    darkBrandColor: darkBrandColor || "#fafafa",
    parentId: parentId || null,
    logoUrl: logoUrl || null,
    calVideoLogo: calVideoLogo || null,
    weekStart: weekStart || "sunday",
    timeZone: timeZone || "Europe/London",
    timeFormat: timeFormat || 12,
    isOrganization: isOrganization ?? false,
    createdAt: new Date(),
  };
}

export function getMockMembership({
  id,
  teamId,
  userId,
  accepted,
  role,
  disableImpersonation,
}: {
  id?: number;
  teamId: number;
  userId: number;
  accepted?: boolean;
  role?: MembershipRole;
  disableImpersonation?: boolean;
}): Partial<Membership> {
  return {
    id,
    teamId,
    userId,
    accepted: accepted ?? true,
    role: role || MembershipRole.MEMBER,
    disableImpersonation: disableImpersonation ?? false,
  };
}

export function getMockProfile({
  id,
  uid,
  userId,
  organizationId,
  username,
  createdAt,
  updatedAt,
}: {
  id?: number;
  uid?: string;
  userId?: number;
  organizationId?: number;
  username?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Partial<Profile> {
  return {
    id,
    uid: uid || uuidv4(),
    userId,
    organizationId,
    username,
    createdAt: createdAt || new Date(),
    updatedAt: updatedAt || new Date(),
  };
}

export function getMockSchedule({
  id,
  userId,
  name,
  timeZone,
  availability,
}: {
  id?: number;
  userId?: number;
  name: string;
  timeZone: string;
  availability: InputSchedule["availability"];
}): InputSchedule {
  return {
    id,
    userId,
    name,
    timeZone,
    availability,
  };
}

export function getMockAvailability({
  id,
  userId,
  eventTypeId,
  days,
  startTime,
  endTime,
  date,
}: {
  id?: number;
  userId?: number;
  eventTypeId?: number;
  days: number[];
  startTime: Date;
  endTime: Date;
  date?: string;
}) {
  return {
    id,
    userId: userId || null,
    eventTypeId: eventTypeId || null,
    days,
    startTime,
    endTime,
    date: date || null,
  };
}

export function getMockDateOverride({
  date,
  startTime,
  endTime,
}: {
  date: string;
  startTime: Date;
  endTime: Date;
}) {
  return {
    date,
    startTime,
    endTime,
  };
}

export function getMockBookingLimit({
  id,
  userId,
  eventTypeId,
  limitType,
  limit,
  businessHours,
  createdAt,
  updatedAt,
}: {
  id?: number;
  userId?: number;
  eventTypeId?: number;
  limitType: string;
  limit: number;
  businessHours?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id,
    userId: userId || null,
    eventTypeId: eventTypeId || null,
    limitType,
    limit,
    businessHours: businessHours ?? false,
    createdAt: createdAt || new Date(),
    updatedAt: updatedAt || new Date(),
  };
}

export function getMockDurationLimit({
  id,
  userId,
  eventTypeId,
  limitType,
  limit,
  createdAt,
  updatedAt,
}: {
  id?: number;
  userId?: number;
  eventTypeId?: number;
  limitType: string;
  limit: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id,
    userId: userId || null,
    eventTypeId: eventTypeId || null,
    limitType,
    limit,
    createdAt: createdAt || new Date(),
    updatedAt: updatedAt || new Date(),
  };
}

export { TestData };
