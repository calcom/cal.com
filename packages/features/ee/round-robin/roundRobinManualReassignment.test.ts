import prismaMock from "@calcom/testing/lib/__mocks__/prisma";
import {
  addWorkflowReminders,
  createBookingScenario,
  getDate,
  getMockBookingAttendee,
  getScenarioData,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingStatus, SchedulingType, WorkflowMethods } from "@calcom/prisma/enums";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulRoundRobinReschedulingEmails,
  expectWorkflowToBeTriggered,
} from "@calcom/testing/lib/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { parse } from "node-html-parser";
import { v4 as uuidv4 } from "uuid";
import { beforeEach, describe, expect, vi } from "vitest";
import type { BookingEventHandlerService } from "../../bookings/lib/onBookingEvents/BookingEventHandlerService";

vi.mock("@calcom/features/bookings/lib/EventManager");
vi.mock("@calcom/app-store/utils", () => ({
  getAppFromSlug: vi.fn(),
}));
vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: vi.fn(),
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
  uuid?: string;
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
  uuid: overrides?.uuid ?? `uuid-${overrides?.id ?? 1}`,
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
  const existingSpy = vi.spyOn(EventManager.prototype as any, "reschedule");
  // Clear any existing mock calls from previous tests
  existingSpy.mockClear();
  const spy = existingSpy;

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

  beforeEach(() => {
    // Set up default mock for BookingEventHandlerService
    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as unknown as BookingEventHandlerService);
  });

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
      actionSource: "WEBAPP",
      reassignedByUuid: originalHost.uuid,
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
      actionSource: "WEBAPP",
      reassignedByUuid: originalHost.uuid,
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
      actionSource: "WEBAPP",
      reassignedByUuid: fixedHost.uuid,
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

    const sendReassignedEmailsAndSMSSpy = vi.spyOn(
      await import("@calcom/emails/email-manager"),
      "sendReassignedEmailsAndSMS"
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
      actionSource: "WEBAPP",
      reassignedByUuid: originalHost.uuid,
    });

    expect(sendReassignedEmailsAndSMSSpy).toHaveBeenCalledTimes(1);
  });
});

describe("roundRobinManualReassignment - Location Changes", () => {
  setupAndTeardown();

  beforeEach(() => {
    // Set up default mock for BookingEventHandlerService
    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as any);
  });

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
        actionSource: "WEBAPP",
        reassignedByUuid: "uuid-999",
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
        actionSource: "WEBAPP",
        reassignedByUuid: "uuid-999",
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
        actionSource: "WEBAPP",
        reassignedByUuid: "uuid-999",
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
        actionSource: "WEBAPP",
        reassignedByUuid: "uuid-999",
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
        actionSource: "WEBAPP",
        reassignedByUuid: "uuid-999",
      })
    ).rejects.toThrow("Failed to set video conferencing link, but the meeting has been rescheduled");
  });
});

describe("roundRobinManualReassignment - Seated Events", () => {
  setupAndTeardown();

  beforeEach(() => {
    // Set up default mock for BookingEventHandlerService
    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as any);
  });

  test("should not expose other attendees in updated email when seatsShowAttendees is disabled for seated round-robin event", async ({
    emails,
  }) => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    const eventManagerRescheduleSpy = await mockEventManagerReschedule();

    const testDestinationCalendar = createTestDestinationCalendar();
    const originalHost = createTestUser({ id: 1, destinationCalendar: testDestinationCalendar });
    const newHost = createTestUser({ id: 2 });
    const users = [originalHost, newHost, createTestUser({ id: 3 })];

    const { dateString: dateStringPlusOne } = getDate({ dateIncrement: 1 });

    const bookingToReassignUid = "seated-booking-manual-reassign";
    const attendee1Email = "attendee1@test.com";
    const attendee2Email = "attendee2@test.com";
    const attendee3Email = "attendee3@test.com";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slug: "round-robin-seated-event",
            schedulingType: SchedulingType.ROUND_ROBIN,
            length: 45,
            seatsPerTimeSlot: 5,
            seatsShowAttendees: false,
            users: users.map((user) => ({ id: user.id })),
            hosts: users.map((user) => ({ userId: user.id, isFixed: false })),
          },
        ],
        bookings: [
          await createTestBooking({
            eventTypeId: 1,
            userId: originalHost.id,
            bookingId: 125,
            bookingUid: bookingToReassignUid,
            attendees: [
              {
                ...getMockBookingAttendee({
                  id: 2,
                  name: "Attendee 1",
                  email: attendee1Email,
                  locale: "en",
                  timeZone: "Asia/Kolkata",
                }),
                bookingSeat: {
                  referenceUid: uuidv4(),
                  data: {},
                },
              },
              {
                ...getMockBookingAttendee({
                  id: 3,
                  name: "Attendee 2",
                  email: attendee2Email,
                  locale: "en",
                  timeZone: "Asia/Kolkata",
                }),
                bookingSeat: {
                  referenceUid: uuidv4(),
                  data: {},
                },
              },
              {
                ...getMockBookingAttendee({
                  id: 4,
                  name: "Attendee 3",
                  email: attendee3Email,
                  locale: "en",
                  timeZone: "Asia/Kolkata",
                }),
                bookingSeat: {
                  referenceUid: uuidv4(),
                  data: {},
                },
              },
            ],
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
      reassignedById: 1,
      actionSource: "WEBAPP",
      reassignedByUuid: originalHost.uuid,
    });

    // Verify that updated emails were sent to all attendees
    const updatedEmails = emails.get().filter((email) => {
      const subject = email.subject || "";
      return subject.includes("updated") || subject.includes("event_type_has_been_updated");
    });

    // Check that each attendee received an email
    expect(updatedEmails.some((email) => email.to.includes(attendee1Email))).toBe(true);
    expect(updatedEmails.some((email) => email.to.includes(attendee2Email))).toBe(true);
    expect(updatedEmails.some((email) => email.to.includes(attendee3Email))).toBe(true);

    // Verify that each attendee's email does not contain other attendees' information
    const attendee1EmailContent = updatedEmails.find((email) => email.to.includes(attendee1Email));
    if (attendee1EmailContent) {
      const emailHtml = parse(attendee1EmailContent.html);
      const emailText = emailHtml.innerText;

      // Should not contain other attendees' emails or names
      expect(emailText).not.toContain(attendee2Email);
      expect(emailText).not.toContain(attendee3Email);
      expect(emailText).not.toContain("Attendee 2");
      expect(emailText).not.toContain("Attendee 3");
      // Should contain their own info
      expect(emailText).toContain("Attendee 1");
    }

    const attendee2EmailContent = updatedEmails.find((email) => email.to.includes(attendee2Email));
    if (attendee2EmailContent) {
      const emailHtml = parse(attendee2EmailContent.html);
      const emailText = emailHtml.innerText;

      // Should not contain other attendees' emails or names
      expect(emailText).not.toContain(attendee1Email);
      expect(emailText).not.toContain(attendee3Email);
      expect(emailText).not.toContain("Attendee 1");
      expect(emailText).not.toContain("Attendee 3");
      // Should contain their own info
      expect(emailText).toContain("Attendee 2");
    }

    const attendee3EmailContent = updatedEmails.find((email) => email.to.includes(attendee3Email));
    if (attendee3EmailContent) {
      const emailHtml = parse(attendee3EmailContent.html);
      const emailText = emailHtml.innerText;

      // Should not contain other attendees' emails or names
      expect(emailText).not.toContain(attendee1Email);
      expect(emailText).not.toContain(attendee2Email);
      expect(emailText).not.toContain("Attendee 1");
      expect(emailText).not.toContain("Attendee 2");
      // Should contain their own info
      expect(emailText).toContain("Attendee 3");
    }
  });
});

describe("roundRobinManualReassignment - Audit Data Verification", () => {
  setupAndTeardown();

  test("should call BookingEventHandlerService.onReassignment with correct audit data when organizer changes", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    await mockEventManagerReschedule();

    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as any);

    const testDestinationCalendar = createTestDestinationCalendar();
    const originalHost = createTestUser({
      id: 1,
      uuid: "uuid-1",
      destinationCalendar: testDestinationCalendar,
    });
    const newHost = createTestUser({ id: 2, uuid: "uuid-2" });
    const reassigningUser = createTestUser({ id: 3, uuid: "uuid-3" });
    const users = [originalHost, newHost, reassigningUser];

    const bookingToReassignUid = "booking-audit-test";

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
            bookingId: 123,
            bookingUid: bookingToReassignUid,
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
      reassignedById: reassigningUser.id,
      actionSource: "WEBAPP",
      reassignedByUuid: reassigningUser.uuid,
      reassignReason: "Test reassignment reason",
    });

    expect(mockOnReassignment).toHaveBeenCalledTimes(1);
    expect(mockOnReassignment).toHaveBeenCalledWith({
      bookingUid: bookingToReassignUid,
      actor: { identifiedBy: "user", userUuid: reassigningUser.uuid },
      organizationId: null,
      source: "WEBAPP",
      auditData: {
        organizerUuid: { old: originalHost.uuid, new: newHost.uuid },
        reassignmentReason: "Test reassignment reason",
        reassignmentType: "manual",
      },
    });
  });

  test("should call BookingEventHandlerService.onReassignment with correct audit data when only attendee changes (fixed host scenario)", async () => {
    const roundRobinManualReassignment = (await import("./roundRobinManualReassignment")).default;
    await mockEventManagerReschedule();

    const mockOnReassignment = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getBookingEventHandlerService).mockReturnValue({
      onReassignment: mockOnReassignment,
    } as any);

    const testDestinationCalendar = createTestDestinationCalendar();
    const fixedHost = createTestUser({ id: 1, uuid: "uuid-1", destinationCalendar: testDestinationCalendar });
    const currentRRHost = createTestUser({ id: 2, uuid: "uuid-2" });
    const newHost = createTestUser({ id: 3, uuid: "uuid-3" });
    const reassigningUser = createTestUser({ id: 4, uuid: "uuid-4" });
    const users = [fixedHost, currentRRHost, newHost, reassigningUser];

    const bookingToReassignUid = "booking-audit-fixed-host-test";

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          createRoundRobinEventType({
            id: 1,
            slug: "round-robin-event",
            users: [fixedHost, currentRRHost, newHost],
            hosts: users.slice(0, 3).map((user) => ({
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
        usersApartFromOrganizer: users.slice(1, 3),
      })
    );

    await roundRobinManualReassignment({
      bookingId: 123,
      newUserId: newHost.id,
      orgId: null,
      reassignedById: reassigningUser.id,
      actionSource: "WEBAPP",
      reassignedByUuid: reassigningUser.uuid,
      reassignReason: "Test reason",
    });

    expect(mockOnReassignment).toHaveBeenCalledTimes(1);
    const callArgs = mockOnReassignment.mock.calls[0][0];
    expect(callArgs.bookingUid).toBe(bookingToReassignUid);
    expect(callArgs.actor).toEqual({ identifiedBy: "user", userUuid: reassigningUser.uuid });
    expect(callArgs.organizationId).toBe(null);
    expect(callArgs.source).toBe("WEBAPP");
    // organizerUuid should NOT be included when organizer hasn't changed (fixed host scenario)
    expect(callArgs.auditData.organizerUuid).toBeUndefined();
    expect(callArgs.auditData.reassignmentType).toBe("manual");
    expect(callArgs.auditData.reassignmentReason).toBe("Test reason");
    expect(callArgs.auditData.hostAttendeeUpdated).toBeDefined();
    expect(callArgs.auditData.hostAttendeeUpdated?.withUserUuid).toEqual({
      old: currentRRHost.uuid,
      new: newHost.uuid,
    });
  });
});
