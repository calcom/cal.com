import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import {
  getDate,
  createBookingScenario,
  getScenarioData,
  getMockBookingAttendee,
  TestData,
  addWorkflowReminders,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulRoundRobinReschedulingEmails,
  expectWorkflowToBeTriggered,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, vi, expect } from "vitest";

import { OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { SchedulingType, BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

vi.mock("@calcom/lib/EventManager");
vi.mock("@calcom/app-store/utils", () => ({
  getAppFromSlug: vi.fn(),
}));

// Test Data Builders
const createTestUser = (overrides?: {
  id?: number;
  name?: string;
  username?: string;
  email?: string;
  destinationCalendar?: { integration: string; externalId: string };
  metadata?: Record<string, any>;
}) => ({
  id: overrides?.id ?? 1,
  name: overrides?.name ?? `user-${overrides?.id ?? 1}`,
  timeZone: "Asia/Kolkata",
  username: overrides?.username ?? `host-${overrides?.id ?? 1}`,
  email: overrides?.email ?? `host${overrides?.id ?? 1}@test.com`,
  schedules: [TestData.schedules.IstWorkHours],
  destinationCalendar: overrides?.destinationCalendar,
  metadata: overrides?.metadata,
});

const createTestDestinationCalendar = (overrides?: { integration?: string; externalId?: string }) => ({
  integration: overrides?.integration ?? "test-calendar",
  externalId: overrides?.externalId ?? "test-calendar",
});

const createTestBooking = async (params: {
  eventTypeId: number;
  userId: number;
  bookingId: number;
  bookingUid: string;
  attendees?: any[];
  location?: string;
}) => {
  const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });

  return {
    id: params.bookingId,
    eventTypeId: params.eventTypeId,
    userId: params.userId,
    uid: params.bookingUid,
    status: BookingStatus.ACCEPTED,
    startTime: `${dateStringPlusOne}T05:00:00.000Z`,
    endTime: `${dateStringPlusOne}T05:15:00.000Z`,
    location: params.location ?? null,
    attendees: params.attendees ?? [
      getMockBookingAttendee({
        id: 2,
        name: "attendee",
        email: "attendee@test.com",
        locale: "en",
        timeZone: "Asia/Kolkata",
      }),
    ],
  };
};

const createRoundRobinEventType = (params: {
  id: number;
  slug: string;
  users: any[];
  hosts?: any[];
  locations?: any[];
  teamId?: number;
  schedulingType?: SchedulingType;
}) => ({
  id: params.id,
  slug: params.slug,
  schedulingType: params.schedulingType ?? SchedulingType.ROUND_ROBIN,
  length: 45,
  users: params.users.map((user) => ({ id: user.id })),
  hosts: params.hosts ?? params.users.map((user) => ({ userId: user.id, isFixed: false })),
  locations: params.locations,
  teamId: params.teamId,
});

// Assertion Helpers
const expectEventManagerCalledWith = (
  spy: any,
  expectedParams: {
    location?: string;
    uid: string;
    changedOrganizer: boolean;
    destinationCalendars?: any[];
  }
) => {
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(
    expectedParams.location
      ? expect.objectContaining({ location: expectedParams.location })
      : expect.any(Object),
    expectedParams.uid,
    undefined,
    expectedParams.changedOrganizer,
    expectedParams.destinationCalendars ?? expect.any(Array)
  );
};

// Mock Helpers
const mockEventManagerReschedule = async (result?: any) => {
  const EventManager = (await import("@calcom/lib/EventManager")).default;
  const spy = vi.spyOn(EventManager.prototype as any, "reschedule");
  spy.mockResolvedValue(result ?? { referencesToCreate: [] });
  return spy;
};

const mockGetAppFromSlug = async () => {
  const { getAppFromSlug } = await import("@calcom/app-store/utils");
  return vi.mocked(getAppFromSlug);
};

describe("roundRobinManualReassignment test", () => {
  setupAndTeardown();

  test("manually reassign round robin organizer", async ({ emails }) => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule();

    const testDestinationCalendar = createTestDestinationCalendar();
    const originalHost = createTestUser({ id: 1, destinationCalendar: testDestinationCalendar });
    const newHost = createTestUser({ id: 2 });
    const users = [originalHost, newHost, createTestUser({ id: 3 })];

    const { dateString: dateStringPlusTwo } = getDate({ dateIncrement: 2 });
    const bookingToReassignUid = "booking-to-reassign";

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            userId: originalHost.id,
            trigger: "NEW_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
            activeEventTypeId: 1,
          },
        ],
        eventTypes: [
          createRoundRobinEventType({
            id: 1,
            slug: "round-robin-event",
            users,
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 1,
            userId: originalHost.id,
            bookingId: 123,
            bookingUid: bookingToReassignUid,
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await addWorkflowReminders([
      {
        bookingUid: bookingToReassignUid,
        method: WorkflowMethods.EMAIL,
        scheduledDate: dateStringPlusTwo,
        scheduled: true,
        workflowStepId: 1,
        workflowId: 1,
      },
    ]);

    await roundRobinManualReassignment({
      bookingId: 123,
      newUserId: newHost.id,
      orgId: null,
      reassignedById: 1,
    });

    expectEventManagerCalledWith(eventManagerRescheduleSpy, {
      uid: bookingToReassignUid,
      changedOrganizer: true,
      destinationCalendars: expect.arrayContaining([expect.objectContaining(testDestinationCalendar)]),
    });

    expectBookingToBeInDatabase({
      uid: bookingToReassignUid,
      userId: newHost.id,
    });

    expectSuccessfulRoundRobinReschedulingEmails({
      prevOrganizer: originalHost,
      newOrganizer: newHost,
      emails,
    });

    expectWorkflowToBeTriggered({ emailsToReceive: [newHost.email], emails });
  });

  test("passes conferenceCredentialId to EventManager when event location has credential ID", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule();

    const testDestinationCalendar = createTestDestinationCalendar();
    const originalHost = createTestUser({ id: 1, destinationCalendar: testDestinationCalendar });
    const newHost = createTestUser({ id: 2 });
    const users = [originalHost, newHost];

    const bookingToReassignUid = "booking-with-conference-credential";
    const conferenceCredentialId = 999;

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 1,
            slug: "round-robin-event",
            users,
            locations: [
              { 
                type: "integrations:zoom", 
                credentialId: conferenceCredentialId 
              }
            ],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 1,
            userId: originalHost.id,
            bookingId: 123,
            bookingUid: bookingToReassignUid,
            location: "integrations:zoom",
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 123,
      newUserId: newHost.id,
      orgId: null,
      reassignedById: 1,
    });

    // Verify that EventManager.reschedule was called with an event containing conferenceCredentialId
    expect(eventManagerRescheduleSpy).toHaveBeenCalledTimes(1);
    const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
    expect(calledEvent.conferenceCredentialId).toBe(conferenceCredentialId);
  });

  test("Manually reassign round robin host with fixed host as organizer", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule();

    const testDestinationCalendar = createTestDestinationCalendar();
    const fixedHost = createTestUser({ id: 1, destinationCalendar: testDestinationCalendar });
    const currentRRHost = createTestUser({ id: 2 });
    const newHost = createTestUser({ id: 3 });
    const users = [fixedHost, currentRRHost, newHost];

    const bookingToReassignUid = "booking-to-reassign";

    await createBookingScenario(
      getScenarioData({
        workflows: [
          {
            userId: fixedHost.id,
            trigger: "NEW_EVENT",
            action: "EMAIL_HOST",
            template: "REMINDER",
          },
        ],
        eventTypes: [
          createRoundRobinEventType({
            id: 1,
            slug: "round-robin-event",
            users,
            hosts: users.map((user) => ({
              userId: user.id,
              isFixed: user.id === fixedHost.id,
            })),
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 1,
            userId: fixedHost.id,
            bookingId: 123,
            bookingUid: bookingToReassignUid,
            attendees: [
              getMockBookingAttendee({
                id: 1,
                name: "attendee",
                email: "attendee@test.com",
                locale: "en",
                timeZone: "Asia/Kolkata",
              }),
              getMockBookingAttendee({
                id: currentRRHost.id,
                name: currentRRHost.name,
                email: currentRRHost.email,
                locale: "en",
                timeZone: currentRRHost.timeZone,
              }),
            ],
          }),
        ],
        organizer: fixedHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 123,
      newUserId: newHost.id,
      orgId: null,
      reassignedById: 1,
    });

    expectEventManagerCalledWith(eventManagerRescheduleSpy, {
      uid: bookingToReassignUid,
      changedOrganizer: false,
    });

    expectBookingToBeInDatabase({
      uid: bookingToReassignUid,
      userId: fixedHost.id,
    });

    const bookingRepo = new BookingRepository(prismaMock);
    const attendees = await bookingRepo.getBookingAttendees(123);

    expect(attendees.some((attendee) => attendee.email === currentRRHost.email)).toBe(false);
    expect(attendees.some((attendee) => attendee.email === newHost.email)).toBe(true);
  });

  test("sends cancellation email to previous RR host when reassigning", async ({ emails }) => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule();

    const sendRoundRobinCancelledEmailsAndSMSSpy = vi.spyOn(
      await import("@calcom/emails"),
      "sendRoundRobinCancelledEmailsAndSMS"
    );

    const testDestinationCalendar = createTestDestinationCalendar();
    const originalHost = createTestUser({ id: 1, destinationCalendar: testDestinationCalendar });
    const previousRRHost = createTestUser({ id: 2 });
    const newHost = createTestUser({ id: 3 });
    const users = [originalHost, previousRRHost, newHost];

    const bookingToReassignUid = "booking-to-reassign-with-previous-rr-host";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 1,
            slug: "round-robin-event",
            users,
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 1,
            userId: originalHost.id,
            bookingId: 124,
            bookingUid: bookingToReassignUid,
            attendees: [
              getMockBookingAttendee({
                id: 2,
                name: "attendee",
                email: "attendee@test.com",
                locale: "en",
                timeZone: "Asia/Kolkata",
              }),
              getMockBookingAttendee({
                id: previousRRHost.id,
                name: previousRRHost.name,
                email: previousRRHost.email,
                locale: "en",
                timeZone: previousRRHost.timeZone,
              }),
            ],
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 124,
      newUserId: newHost.id,
      orgId: null,
      reassignedById: 1,
    });

    expect(sendRoundRobinCancelledEmailsAndSMSSpy).toHaveBeenCalledTimes(1);
  });
});

describe("roundRobinManualReassignment - Location Changes and Errors", () => {
  setupAndTeardown();

  const createConferencingUsers = () => {
    return [
      createTestUser({
        id: 1,
        destinationCalendar: {
          integration: "google_calendar",
          externalId: "test-calendar",
        },
        metadata: {
          defaultConferencingApp: {
            appSlug: "google-meet",
          },
        },
      }),
      createTestUser({
        id: 2,
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
          },
        },
      }),
      createTestUser({
        id: 3,
        metadata: {},
      }),
      createTestUser({
        id: 4,
        metadata: {
          defaultConferencingApp: {
            appSlug: "custom-video",
            appLink: "https://custom-video.com/room123",
          },
        },
      }),
    ];
  };

  const mockAppStore = async (config?: { googleMeet?: boolean; zoom?: boolean; customVideo?: boolean }) => {
    const getAppFromSlug = await mockGetAppFromSlug();
    getAppFromSlug.mockImplementation((slug?: string) => {
      if (slug === "google-meet" && config?.googleMeet !== false) {
        return {
          appData: {
            location: {
              type: "integrations:google:meet",
            },
          },
        } as any;
      }
      if (slug === "zoom" && config?.zoom !== false) {
        return {
          appData: {
            location: {
              type: "integrations:zoom",
            },
          },
        } as any;
      }
      if (slug === "custom-video" && config?.customVideo !== false) {
        return {
          appData: {
            location: {
              type: "integrations:custom-video",
            },
          },
        } as any;
      }
      return undefined;
    });
    return getAppFromSlug;
  };

  test("Location changes from Google Meet to Zoom when organizer changes", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule({
      results: [
        {
          type: "zoom_video",
          success: true,
          uid: "test-uid",
          originalEvent: {},
          updatedEvent: {
            url: "https://zoom.us/j/123456789",
          },
        },
      ],
      referencesToCreate: [],
    });

    await mockAppStore({ googleMeet: true, zoom: true });

    const users = createConferencingUsers();
    const originalHost = users[0];
    const newHost = users[1];

    const bookingToReassignUid = "booking-location-change-test";

    await createBookingScenario(
      getScenarioData({
        teams: [
          {
            id: 1,
            name: "Test Team",
            slug: "test-team",
          },
        ],
        eventTypes: [
          createRoundRobinEventType({
            id: 1,
            slug: "round-robin-event",
            teamId: 1,
            users,
            locations: [{ type: OrganizerDefaultConferencingAppType }, { type: "integrations:daily" }],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 1,
            userId: originalHost.id,
            bookingId: 125,
            bookingUid: bookingToReassignUid,
            location: "integrations:google:meet",
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 125,
      newUserId: newHost.id,
      orgId: null,
      reassignReason: "Host unavailable",
      reassignedById: 999,
    });

    expectEventManagerCalledWith(eventManagerRescheduleSpy, {
      location: "integrations:zoom",
      uid: bookingToReassignUid,
      changedOrganizer: true,
      destinationCalendars: expect.arrayContaining([
        expect.objectContaining({
          integration: "google_calendar",
          externalId: "test-calendar",
        }),
      ]),
    });

    expectBookingToBeInDatabase({
      uid: bookingToReassignUid,
      userId: newHost.id,
    });
  });

  test("Falls back to first available location when new host has no default conferencing app", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule({
      results: [
        {
          type: "daily_video",
          success: true,
          uid: "test-uid",
          originalEvent: {},
          updatedEvent: {
            url: "https://daily.co/test-room",
          },
        },
      ],
      referencesToCreate: [],
    });

    (await mockGetAppFromSlug()).mockReturnValue(undefined);

    const users = createConferencingUsers();
    const originalHost = users[0];
    const newHost = users[2];

    const bookingToReassignUid = "booking-fallback-location-test";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 2,
            slug: "round-robin-event-fallback",
            users,
            locations: [{ type: OrganizerDefaultConferencingAppType }, { type: "integrations:daily" }],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 2,
            userId: originalHost.id,
            bookingId: 126,
            bookingUid: bookingToReassignUid,
            location: "integrations:google:meet",
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 126,
      newUserId: newHost.id,
      orgId: null,
      reassignReason: "Host unavailable",
      reassignedById: 999,
    });

    const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
    expect(calledEvent.location).toBe("integrations:daily");
  });

  test("Throws error when Cal Video fallback fails", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule({
      results: [
        {
          type: "daily_video",
          success: false,
          error: "Failed to create Cal Video room",
          uid: "test-uid",
          originalEvent: {},
        },
      ],
      referencesToCreate: [],
    });

    (await mockGetAppFromSlug()).mockReturnValue(undefined);

    const users = createConferencingUsers();
    const originalHost = users[0];
    const newHost = users[2];

    const bookingToReassignUid = "booking-calvideo-error-test";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 3,
            slug: "round-robin-event-error",
            users,
            locations: [{ type: OrganizerDefaultConferencingAppType }, { type: "integrations:daily" }],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 3,
            userId: originalHost.id,
            bookingId: 127,
            bookingUid: bookingToReassignUid,
            location: "integrations:google:meet",
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await expect(
      roundRobinManualReassignment({
        bookingId: 127,
        newUserId: newHost.id,
        orgId: null,
        reassignReason: "Host unavailable",
        reassignedById: 999,
      })
    ).rejects.toThrow("Failed to set video conferencing link, but the meeting has been rescheduled");
  });

  test("Uses static link for managed event types when organizer has static conferencing app", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule({
      results: [],
      referencesToCreate: [],
    });

    await mockAppStore({ customVideo: true });

    const users = createConferencingUsers();
    const originalHost = users[0];
    const newHost = users[3];

    const bookingToReassignUid = "booking-static-link-test";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 4,
            slug: "managed-event",
            schedulingType: "MANAGED" as SchedulingType,
            users,
            locations: [{ type: OrganizerDefaultConferencingAppType }],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 4,
            userId: originalHost.id,
            bookingId: 128,
            bookingUid: bookingToReassignUid,
            location: "integrations:google:meet",
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 128,
      newUserId: newHost.id,
      orgId: null,
      reassignReason: "Host unavailable",
      reassignedById: 999,
    });

    const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
    expect(calledEvent.location).toBe("https://custom-video.com/room123");
  });

  test("Handles location change for team events", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule({
      results: [],
      referencesToCreate: [],
    });

    await mockAppStore({ zoom: true });

    const users = createConferencingUsers();
    const originalHost = users[0];
    const newHost = users[1];

    const bookingToReassignUid = "booking-team-event-test";

    await createBookingScenario(
      getScenarioData({
        teams: [
          {
            id: 1,
            name: "Test Team",
            slug: "test-team",
          },
        ],
        eventTypes: [
          createRoundRobinEventType({
            id: 5,
            slug: "team-round-robin",
            teamId: 1,
            users,
            locations: [{ type: OrganizerDefaultConferencingAppType }],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 5,
            userId: originalHost.id,
            bookingId: 129,
            bookingUid: bookingToReassignUid,
            location: "integrations:google:meet",
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 129,
      newUserId: newHost.id,
      orgId: null,
      reassignReason: "Host unavailable",
      reassignedById: 999,
    });

    const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
    expect(calledEvent.location).toBe("integrations:zoom");
  });

  test("Location doesn't change when OrganizerDefaultConferencingAppType is not in event locations", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule({
      results: [],
      referencesToCreate: [],
    });

    const users = createConferencingUsers();
    const originalHost = users[0];
    const newHost = users[1];

    const bookingToReassignUid = "booking-no-organizer-default";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 6,
            slug: "fixed-location-event",
            users,
            locations: [{ type: "integrations:daily" }],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 6,
            userId: originalHost.id,
            bookingId: 130,
            bookingUid: bookingToReassignUid,
            location: "integrations:daily",
          }),
        ],
        organizer: originalHost,
        usersApartFromOrganizer: users.slice(1),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 130,
      newUserId: newHost.id,
      orgId: null,
      reassignReason: "Host unavailable",
      reassignedById: 999,
    });

    const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
    expect(calledEvent.location).toBe("integrations:daily");
  });
});
