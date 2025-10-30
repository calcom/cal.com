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
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { SchedulingType, BookingStatus, WorkflowMethods } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

vi.mock("@calcom/features/bookings/lib/EventManager");
vi.mock("@calcom/app-store/utils", () => ({
  getAppFromSlug: vi.fn(),
}));

// Type definitions
type TestUserMetadata = {
  defaultConferencingApp?: {
    appSlug: string;
    appLink?: string;
  };
};

type TestUser = {
  id: number;
  name: string;
  timeZone: string;
  username: string;
  email: string;
  schedules: (typeof TestData.schedules.IstWorkHours)[];
  destinationCalendar?: { integration: string; externalId: string };
  metadata?: TestUserMetadata;
};

type MockBookingAttendee = ReturnType<typeof getMockBookingAttendee>;

// Test Data Builders
const createTestUser = (overrides?: {
  id?: number;
  name?: string;
  username?: string;
  email?: string;
  destinationCalendar?: { integration: string; externalId: string };
  metadata?: TestUserMetadata;
}) => ({
  id: overrides?.id ?? 1,
  name: overrides?.name ?? `user-${overrides?.id ?? 1}`,
  timeZone: "Asia/Kolkata",
  username: overrides?.username ?? `host-${overrides?.id ?? 1}`,
  email: overrides?.email ?? `host${overrides?.id ?? 1}@test.com`,
  schedules: [TestData.schedules.IstWorkHours],
  destinationCalendar: overrides?.destinationCalendar,
  metadata: overrides?.metadata,
  defaultScheduleId: 1,
  credentials: [],
  selectedCalendars: [],
  weekStart: "Monday" as const,
  teams: [],
  availability: [],
  profiles: [],
  outOfOffice: undefined,
  smsLockState: undefined,
  completedOnboarding: true,
  locked: false,
  organizationId: null,
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
  attendees?: MockBookingAttendee[];
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
  users: TestUser[];
  hosts?: { userId: number; isFixed: boolean }[];
  locations?: { type: string; credentialId?: number }[];
  teamId?: number;
  schedulingType?: SchedulingType;
  parentId?: number;
}) => ({
  id: params.id,
  slug: params.slug,
  schedulingType: params.schedulingType ?? SchedulingType.ROUND_ROBIN,
  length: 45,
  users: params.users.map((user) => ({ id: user.id })),
  hosts: params.hosts ?? params.users.map((user) => ({ userId: user.id, isFixed: false })),
  locations: params.locations,
  teamId: params.teamId,
  parentId: params.parentId,
});

// Assertion Helpers
const expectEventManagerCalledWith = (
  spy: ReturnType<typeof vi.spyOn>,
  expectedParams: {
    location?: string;
    uid: string;
    changedOrganizer: boolean;
    destinationCalendars?: Array<{ integration: string; externalId: string }>;
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
    expectedParams.destinationCalendars ?? expect.any(Array),
    undefined,
    expectedParams.changedOrganizer
  );
};

// Mock Helpers
type MockEventManagerConfig = {
  failConferencing?: boolean;
};

type ConferenceResult = {
  type: string;
  success: boolean;
  uid: string;
  originalEvent: Record<string, unknown>;
  error?: string;
  updatedEvent?: {
    url: string;
  };
};

const mockEventManagerReschedule = async (config?: MockEventManagerConfig) => {
  const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spy = vi.spyOn(EventManager.prototype as any, "reschedule");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spy.mockImplementation(async (event: any) => {
    const location = event.location;
    const results: ConferenceResult[] = [];

    // Check if location is a static link (starts with http:// or https://)
    const isStaticLink = location?.startsWith("http://") || location?.startsWith("https://");

    if (isStaticLink) {
      // For static links, no conferencing result is generated
      return { referencesToCreate: [] };
    }

    // Handle conferencing based on location type
    if (location?.includes("integrations:")) {
      const conferenceType = location.split(":")[1];

      if (config?.failConferencing) {
        results.push({
          type: `${conferenceType}_video`,
          success: false,
          error: `Failed to create ${conferenceType} room`,
          uid: event.uid || "test-uid",
          originalEvent: {},
        });
      } else {
        results.push({
          type: `${conferenceType}_video`,
          success: true,
          uid: event.uid || "test-uid",
          originalEvent: {},
          updatedEvent: {
            url:
              conferenceType === "zoom"
                ? "https://zoom.us/j/123456789"
                : conferenceType === "google"
                ? "https://meet.google.com/test-meeting"
                : `https://${conferenceType}.co/test-room`,
          },
        });
      }
    }

    return { results, referencesToCreate: [] };
  });

  return spy;
};

const mockGetAppFromSlug = async () => {
  const { getAppFromSlug } = await import("@calcom/app-store/utils");
  return vi.mocked(getAppFromSlug);
};

describe("roundRobinManualReassignment test", () => {
  setupAndTeardown();

  test("should reassign round robin booking to new host and update workflows", async ({ emails }) => {
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
            activeOn: [1],
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
        scheduledDate: new Date(dateStringPlusTwo),
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

  test("should include conferenceCredentialId when reassigning booking with with fixed host as organizer", async () => {
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
                credentialId: conferenceCredentialId,
              },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((calledEvent as any).conferenceCredentialId).toBe(conferenceCredentialId);
  });

  test("should reassign round robin attendee while keeping fixed host as organizer", async () => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookingRepo = new BookingRepository(prismaMock as any);
    const attendees = await bookingRepo.getBookingAttendees(123);

    expect(attendees.some((attendee) => attendee.email === currentRRHost.email)).toBe(false);
    expect(attendees.some((attendee) => attendee.email === newHost.email)).toBe(true);
  });

  test("should send cancellation email to previous round robin attendee when reassigning", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    await mockEventManagerReschedule();

    const sendRoundRobinReassignedEmailsAndSMSSpy = vi.spyOn(
      await import("@calcom/emails"),
      "sendRoundRobinReassignedEmailsAndSMS"
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

    expect(sendRoundRobinReassignedEmailsAndSMSSpy).toHaveBeenCalledTimes(1);
  });
});

describe("roundRobinManualReassignment - Location Changes", () => {
  setupAndTeardown();

  const createConferencingUsers = () => {
    return {
      googleMeetHost: createTestUser({
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
      zoomHost: createTestUser({
        id: 2,
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
          },
        },
      }),
      noDefaultConferencingAppHost: createTestUser({
        id: 3,
        metadata: {},
      }),
      staticVideoLinkHost: createTestUser({
        id: 4,
        metadata: {
          defaultConferencingApp: {
            appSlug: "custom-video",
            appLink: "https://custom-video.com/room123",
          },
        },
      }),
    };
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      if (slug === "zoom" && config?.zoom !== false) {
        return {
          appData: {
            location: {
              type: "integrations:zoom",
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      if (slug === "custom-video" && config?.customVideo !== false) {
        return {
          appData: {
            location: {
              type: "integrations:custom-video",
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      return undefined;
    });
    return getAppFromSlug;
  };

  describe("when event has Organizer's Default Conferencing App location", () => {
    test("should update location from Google Meet to Zoom when reassigning between hosts with different default conferencing apps", async () => {
      const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
      const eventManagerRescheduleSpy = await mockEventManagerReschedule();

      await mockAppStore({ googleMeet: true, zoom: true });

      const users = createConferencingUsers();
      const googleMeetHost = users.googleMeetHost;
      const zoomHost = users.zoomHost;

      const bookingToReassignUid = "booking-location-change-test";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            createRoundRobinEventType({
              id: 1,
              slug: "round-robin-event",
              teamId: 1,
              users: Object.values(users),
              locations: [{ type: OrganizerDefaultConferencingAppType }, { type: "integrations:daily" }],
            }),
          ],
          bookings: [
            await createTestBooking({
              eventTypeId: 1,
              userId: googleMeetHost.id,
              bookingId: 125,
              bookingUid: bookingToReassignUid,
              location: "integrations:google:meet",
            }),
          ],
          organizer: googleMeetHost,
          usersApartFromOrganizer: Object.values(users).slice(1),
        })
      );

      await roundRobinManualReassignment({
        bookingId: 125,
        newUserId: zoomHost.id,
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
        userId: zoomHost.id,
      });
    });

    test("should fallback to first available event location in Event Type when new host has no default conferencing app", async () => {
      const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
      const eventManagerRescheduleSpy = await mockEventManagerReschedule();

      // (await mockGetAppFromSlug()).mockReturnValue(undefined);

      const users = createConferencingUsers();
      const googleMeetHost = users.googleMeetHost;
      const noDefaultConferencingAppHost = users.noDefaultConferencingAppHost;

      const bookingToReassignUid = "booking-fallback-location-test";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            createRoundRobinEventType({
              id: 2,
              slug: "round-robin-event-fallback",
              users: Object.values(users),
              locations: [
                { type: OrganizerDefaultConferencingAppType },
                { type: "integrations:first-available" },
              ],
            }),
          ],
          bookings: [
            await createTestBooking({
              eventTypeId: 2,
              userId: googleMeetHost.id,
              bookingId: 126,
              bookingUid: bookingToReassignUid,
              location: "integrations:google:meet",
            }),
          ],
          organizer: googleMeetHost,
          usersApartFromOrganizer: Object.values(users).slice(1),
        })
      );

      await roundRobinManualReassignment({
        bookingId: 126,
        newUserId: noDefaultConferencingAppHost.id,
        orgId: null,
        reassignReason: "Host unavailable",
        reassignedById: 999,
      });

      const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((calledEvent as any).location).toBe("integrations:first-available");
    });

    test("should update location from Google Meet to static video link when new host has static video link app", async () => {
      const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
      const eventManagerRescheduleSpy = await mockEventManagerReschedule();

      await mockAppStore({ customVideo: true });

      const users = createConferencingUsers();
      const googleMeetHost = users.googleMeetHost;
      const staticVideoLinkHost = users.staticVideoLinkHost;

      const bookingToReassignUid = "booking-static-link-test";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            createRoundRobinEventType({
              id: 4,
              slug: "managed-event",
              // This is a managed event type child which allows Organizer's Default Conferencing App
              parentId: 1,
              users: Object.values(users),
              locations: [{ type: OrganizerDefaultConferencingAppType }],
            }),
          ],
          bookings: [
            await createTestBooking({
              eventTypeId: 4,
              userId: googleMeetHost.id,
              bookingId: 128,
              bookingUid: bookingToReassignUid,
              location: "integrations:google:meet",
            }),
          ],
          organizer: googleMeetHost,
          usersApartFromOrganizer: Object.values(users).slice(1),
        })
      );

      await roundRobinManualReassignment({
        bookingId: 128,
        newUserId: staticVideoLinkHost.id,
        orgId: null,
        reassignReason: "Host unavailable",
        reassignedById: 999,
      });

      const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((calledEvent as any).location).toBe("https://custom-video.com/room123");
    });

    test("should update location from Static Video Link to Google Meet when new host has Google Meet app", async () => {
      const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
      const eventManagerRescheduleSpy = await mockEventManagerReschedule();

      await mockAppStore({ googleMeet: true });

      const users = createConferencingUsers();
      const staticVideoLinkHost = users.staticVideoLinkHost;
      const googleMeetHost = users.googleMeetHost;

      const bookingToReassignUid = "booking-static-link-to-google-meet-test";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            createRoundRobinEventType({
              id: 3,
              slug: "round-robin-event-error",
              users: Object.values(users),
              teamId: 1,
              locations: [{ type: OrganizerDefaultConferencingAppType }],
            }),
          ],
          bookings: [
            await createTestBooking({
              eventTypeId: 3,
              userId: staticVideoLinkHost.id,
              bookingId: 127,
              bookingUid: bookingToReassignUid,
              location: "https://custom-video.com/room123",
            }),
          ],
          organizer: staticVideoLinkHost,
          usersApartFromOrganizer: Object.values(users).filter((user) => user.id !== staticVideoLinkHost.id),
        })
      );

      await roundRobinManualReassignment({
        bookingId: 127,
        newUserId: googleMeetHost.id,
        orgId: null,
        reassignReason: "Host unavailable",
        reassignedById: 999,
      });

      const calledEvent = eventManagerRescheduleSpy.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((calledEvent as any).location).toBe("integrations:google:meet");

      await expectBookingToBeInDatabase({
        uid: bookingToReassignUid,
        userId: googleMeetHost.id,
        location: "integrations:google:meet",
      });
    });
  });

  test("should throw error when Cal Video fallback fails", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    await mockEventManagerReschedule({ failConferencing: true });

    const users = createConferencingUsers();
    const googleMeetHost = users.googleMeetHost;
    const noDefaultConferencingAppHost = users.noDefaultConferencingAppHost;

    const bookingToReassignUid = "booking-calvideo-error-test";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 3,
            slug: "round-robin-event-error",
            users: Object.values(users),
            locations: [{ type: OrganizerDefaultConferencingAppType }],
          }),
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 3,
            userId: googleMeetHost.id,
            bookingId: 127,
            bookingUid: bookingToReassignUid,
            location: "integrations:google:meet",
          }),
        ],
        organizer: googleMeetHost,
        usersApartFromOrganizer: Object.values(users).slice(1),
      })
    );

    await expect(
      roundRobinManualReassignment({
        bookingId: 127,
        newUserId: noDefaultConferencingAppHost.id,
        orgId: null,
        reassignReason: "Host unavailable",
        reassignedById: 999,
      })
    ).rejects.toThrow("Failed to set video conferencing link, but the meeting has been rescheduled");
  });
});
