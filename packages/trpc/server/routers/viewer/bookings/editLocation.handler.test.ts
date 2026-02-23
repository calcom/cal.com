/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: Bring this test back with the correct setup (no illegal imports)
// NOTE: All imports except vitest are deferred to inside the skipped describe blocks
// to prevent module loading side effects during test collection (which can cause
// "Closing rpc while fetch was pending" errors from watchlist module imports)
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mocks for "admin uses host credentials" test (below)
const mockEventManagerUser = vi.fn();
const mockUpdateLocation = vi.fn();
const mockUserRepoFindByIdOrThrow = vi.fn();

vi.mock("@calcom/features/bookings/lib/EventManager", () => ({
  default: class MockEventManager {
    constructor(user: { id: number; email: string; credentials: unknown[] }) {
      mockEventManagerUser(user);
    }

    updateLocation = mockUpdateLocation;
  },
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: class MockUserRepository {
    findByIdOrThrow = mockUserRepoFindByIdOrThrow;
  },
}));

vi.mock("@calcom/lib/buildCalEventFromBooking", () => ({
  buildCalEventFromBooking: vi.fn().mockResolvedValue({
    location: "integrations:zoom",
    type: "test",
    title: "Test",
    startTime: new Date(),
    endTime: new Date(),
    organizer: { id: 101, email: "host@example.com", name: "Host" },
    attendees: [],
    additionalInformation: {},
  }),
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: class MockBookingRepository {
    updateLocationById = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendLocationChangeEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => ({
  getBookingEventHandlerService: vi.fn().mockReturnValue({
    onLocationChanged: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@calcom/features/di/containers/FeaturesRepository", () => ({
  getFeaturesRepository: vi.fn().mockReturnValue({
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    silly: vi.fn(),
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      silly: vi.fn(),
    }),
  },
}));

describe.skip("getLocationForOrganizerDefaultConferencingAppInEvtFormat", () => {
  const mockTranslate = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Dynamic link apps", () => {
    test("should return the app type for Zoom", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("integrations:zoom");
    });

    test("should return the app type for Google Meet", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "google-meet",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("integrations:google:meet");
    });
  });

  describe("Static link apps", () => {
    test("should return the app type for Campfire", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "campfire",
            appLink: "https://campfire.com",
          },
        },
      };
      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });
      expect(result).toBe("https://campfire.com");
    });
  });

  describe("Error handling", () => {
    test("should throw a UserError if defaultConferencingApp is not set", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: null,
      };

      expect(() =>
        getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        })
      ).toThrow(UserError);
      expect(mockTranslate).toHaveBeenCalledWith("organizer_default_conferencing_app_not_found", {
        organizer: "Test Organizer",
      });
    });

    test("should throw a SystemError if the app is not found", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "invalid-app",
          },
        },
      };

      expect(() =>
        getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        })
      ).toThrow(SystemError);
    });

    test("should throw a SystemError for static link apps if appLink is missing", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "no-link-app",
          },
        },
      };

      expect(() =>
        getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        })
      ).toThrow(SystemError);
    });
  });
});

describe.skip("editLocation.handler", () => {
  describe("Changing organizer default conferencing app", () => {
    test("should update the booking location when organizer's default conferencing app changes", async ({
      emails,
    }) => {
      const scenarioData = {
        organizer: getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getZoomAppCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          destinationCalendar: {
            integration: "google_calendar",
            externalId: "organizer@google-calendar.com",
          },
          metadata: {
            defaultConferencingApp: {
              appSlug: "campfire",
              appLink: "https://campfire.com",
            },
          },
        }),
        eventTypes: [
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [{ id: 101 }],
          },
        ],
        bookings: [
          {
            id: 1,
            uid: "booking-1",
            eventTypeId: 1,
            status: BookingStatus.ACCEPTED,
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
            userId: 101,
            attendees: [
              {
                id: 102,
                name: "Attendee 1",
                email: "attendee1@example.com",
                timeZone: "Asia/Kolkata",
              },
            ],
          },
        ],
        // biome-ignore lint/complexity/useLiteralKeys: app keys contain hyphens
        apps: [TestData.apps["zoom"], TestData.apps["google-meet"]],
      };

      await createBookingScenario(getScenarioData(scenarioData));

      const booking = await prisma.booking.findFirst({
        where: {
          uid: scenarioData.bookings[0].uid,
        },
        include: {
          // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
          user: true,
          // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
          attendees: true,
          // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
          references: true,
        },
      });

      const organizerUser = await prisma.user.findFirst({
        where: {
          id: scenarioData.organizer.id,
        },
      });

      expect(booking).not.toBeNull();

      // Simulate changing the organizer's default conferencing app to Google Meet
      const updatedOrganizer = {
        ...booking.user,
        metadata: {
          ...booking.user.metadata,
          defaultConferencingApp: {
            appSlug: "google-meet",
          },
        },
      };

      await editLocationHandler({
        ctx: {
          booking,
          user: organizerUser,
        },
        input: {
          newLocation: "conferencing",
        },
        actionSource: "WEBAPP",
      });

      const updatedBooking = await prisma.booking.findFirstOrThrow({
        where: {
          uid: scenarioData.bookings[0].uid,
        },
      });

      expect(updatedBooking.location).toBe("https://campfire.com");

      expectSuccesfulLocationChangeEmails({
        emails,
        organizer: organizerUser,
        location: {
          href: "https://campfire.com",
          linkText: "Link",
        },
      });
    });
  });
});

describe("editLocation.handler - admin uses host credentials", () => {
  const HOST_ID = 101;
  const ADMIN_ID = 999;

  const hostUser = {
    id: HOST_ID,
    email: "host@example.com",
    name: "Host User",
    locale: "en",
    metadata: null,
    destinationCalendar: null,
  };

  const adminUser = {
    id: ADMIN_ID,
    email: "admin@example.com",
    name: "Admin User",
    uuid: "admin-uuid",
    locale: "en",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateLocation.mockResolvedValue({
      results: [{ success: true, updatedEvent: {} }],
      referencesToCreate: [],
    });
    mockUserRepoFindByIdOrThrow.mockResolvedValue(hostUser);
  });

  test("uses host (organizer) credentials when admin edits location, not admin credentials", async () => {
    const { editLocationHandler } = await import("./editLocation.handler");

    const booking = {
      id: 1,
      uid: "booking-1",
      userId: HOST_ID,
      location: "integrations:zoom",
      metadata: {},
      responses: {},
      references: [],
      user: { ...hostUser, profiles: [], destinationCalendar: null },
      eventType: { metadata: {}, team: null },
    };

    await editLocationHandler({
      ctx: {
        booking: booking as never,
        user: adminUser as never,
      },
      input: {
        bookingId: 1,
        newLocation: "integrations:zoom",
        credentialId: null,
      },
      actionSource: "WEBAPP",
    });

    expect(mockEventManagerUser).toHaveBeenCalledTimes(1);
    const eventManagerUserArg = mockEventManagerUser.mock.calls[0][0] as {
      id: number;
      email: string;
      credentials: unknown[];
    };
    expect(eventManagerUserArg.id).toBe(HOST_ID);
    expect(eventManagerUserArg.email).toBe("host@example.com");
    expect(eventManagerUserArg.id).not.toBe(ADMIN_ID);
  });
});
