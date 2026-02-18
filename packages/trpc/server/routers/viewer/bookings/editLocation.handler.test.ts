/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: Bring this test back with the correct setup (no illegal imports)
// NOTE: All imports except vitest are deferred to inside the skipped describe blocks
// to prevent module loading side effects during test collection (which can cause
// "Closing rpc while fetch was pending" errors from watchlist module imports)

import {
  createBookingScenario,
  getOrganizer,
  getScenarioData,
  getZoomAppCredential,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { editLocationHandler } from "./editLocation.handler";

vi.mock("@calcom/features/webhooks/lib/getWebhooks");
vi.mock("@calcom/features/webhooks/lib/sendPayload");
vi.mock("@calcom/features/bookings/lib/EventManager", () => {
  return {
    default: class MockEventManager {
      updateLocation = vi.fn().mockResolvedValue({
        results: [{ success: true }],
        referencesToCreate: [],
      });
    },
  };
});
vi.mock("@calcom/emails/email-manager", () => ({
  sendLocationChangeEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
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

// Import mocked modules after vi.mock declarations
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
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

describe("editLocation.handler - Webhook integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should trigger BOOKING_LOCATION_UPDATED webhook when location is changed", async () => {
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
            appSlug: "zoom",
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
          uid: "booking-webhook-test",
          eventTypeId: 1,
          status: BookingStatus.ACCEPTED,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          userId: 101,
          location: "https://old-location.com",
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
      apps: [TestData.apps["zoom"]],
      webhooks: [
        {
          id: "webhook-1",
          userId: 101,
          eventTriggers: ["BOOKING_LOCATION_UPDATED"],
          subscriberUrl: "https://example.com/webhook",
          active: true,
          eventTypeId: 1,
          appId: null,
          secret: "webhook-secret",
        },
      ],
    };

    await createBookingScenario(getScenarioData(scenarioData));

    const booking = await prisma.booking.findFirst({
      where: {
        uid: scenarioData.bookings[0].uid,
      },
      include: {
        user: true,
        attendees: true,
        references: true,
      },
    });

    const organizerUser = await prisma.user.findFirst({
      where: {
        id: scenarioData.organizer.id,
      },
    });

    expect(booking).not.toBeNull();

    vi.mocked(getWebhooks).mockResolvedValue([
      {
        id: "webhook-1",
        subscriberUrl: "https://example.com/webhook",
        secret: "webhook-secret",
        active: true,
      },
    ]);

    vi.mocked(sendPayload).mockResolvedValue({ ok: true, status: 200 });

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

    expect(getWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 101,
        eventTypeId: 1,
        triggerEvent: "BOOKING_LOCATION_UPDATED",
        teamId: null,
      })
    );

    expect(sendPayload).toHaveBeenCalledWith(
      "webhook-secret",
      "BOOKING_LOCATION_UPDATED",
      expect.any(String),
      expect.objectContaining({
        subscriberUrl: "https://example.com/webhook",
      }),
      expect.objectContaining({
        bookingId: booking.id,
        uid: booking.uid,
        oldLocation: "https://old-location.com",
        updatedLocation: "integrations:zoom",
      })
    );
  });

  test("should handle multiple webhooks when location is changed", async () => {
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
            appSlug: "zoom",
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
          uid: "booking-multi-webhook-test",
          eventTypeId: 1,
          status: BookingStatus.ACCEPTED,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          userId: 101,
          location: "https://old-location-multi.com",
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
      apps: [TestData.apps["zoom"]],
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

    vi.mocked(getWebhooks).mockResolvedValue([
      {
        id: "webhook-1",
        subscriberUrl: "https://example.com/webhook1",
        secret: "secret-1",
        active: true,
      },
      {
        id: "webhook-2",
        subscriberUrl: "https://example.com/webhook2",
        secret: "secret-2",
        active: true,
      },
    ]);

    vi.mocked(sendPayload).mockResolvedValue({ ok: true, status: 200 });

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

    expect(sendPayload).toHaveBeenCalledTimes(2);
    expect(sendPayload).toHaveBeenCalledWith(
      "secret-1",
      "BOOKING_LOCATION_UPDATED",
      expect.any(String),
      expect.objectContaining({
        subscriberUrl: "https://example.com/webhook1",
      }),
      expect.objectContaining({
        bookingId: booking.id,
        oldLocation: "https://old-location-multi.com",
        updatedLocation: "integrations:zoom",
      })
    );
    expect(sendPayload).toHaveBeenCalledWith(
      "secret-2",
      "BOOKING_LOCATION_UPDATED",
      expect.any(String),
      expect.objectContaining({
        subscriberUrl: "https://example.com/webhook2",
      }),
      expect.objectContaining({
        bookingId: booking.id,
        oldLocation: "https://old-location-multi.com",
        updatedLocation: "integrations:zoom",
      })
    );
  });

  test("should handle webhook failures gracefully without throwing", async () => {
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
            appSlug: "zoom",
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
          uid: "booking-webhook-fail-test",
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
      apps: [TestData.apps["zoom"]],
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

    vi.mocked(getWebhooks).mockResolvedValue([
      {
        id: "webhook-1",
        subscriberUrl: "https://example.com/webhook",
        secret: "webhook-secret",
        active: true,
      },
    ]);

    vi.mocked(sendPayload).mockRejectedValue(new Error("Webhook delivery failed"));

    await expect(
      editLocationHandler({
        ctx: {
          booking,
          user: organizerUser,
        },
        input: {
          newLocation: "conferencing",
        },
        actionSource: "WEBAPP",
      })
    ).resolves.not.toThrow();

    expect(sendPayload).toHaveBeenCalled();
  });

  test("should not fail when getWebhooks throws an error", async () => {
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
            appSlug: "zoom",
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
          uid: "booking-getwebhooks-fail-test",
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
      apps: [TestData.apps["zoom"]],
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

    vi.mocked(getWebhooks).mockRejectedValue(new Error("Database error"));

    await expect(
      editLocationHandler({
        ctx: {
          booking,
          user: organizerUser,
        },
        input: {
          newLocation: "conferencing",
        },
        actionSource: "WEBAPP",
      })
    ).resolves.not.toThrow();

    expect(getWebhooks).toHaveBeenCalled();
  });

  test("should include teamId and orgId in webhook query for team events", async () => {
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
            appSlug: "zoom",
          },
        },
      }),
      eventTypes: [
        {
          id: 1,
          slotInterval: 45,
          length: 45,
          users: [{ id: 101 }],
          teamId: 5,
        },
      ],
      bookings: [
        {
          id: 1,
          uid: "booking-team-webhook-test",
          eventTypeId: 1,
          status: BookingStatus.ACCEPTED,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          userId: 101,
          location: "https://old-location-team.com",
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
      apps: [TestData.apps["zoom"]],
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
        // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
        eventType: true,
      },
    });

    const organizerUser = await prisma.user.findFirst({
      where: {
        id: scenarioData.organizer.id,
      },
    });

    expect(booking).not.toBeNull();

    vi.mocked(getWebhooks).mockResolvedValue([
      {
        id: "webhook-1",
        subscriberUrl: "https://example.com/webhook",
        secret: "webhook-secret",
        active: true,
      },
    ]);

    vi.mocked(sendPayload).mockResolvedValue({ ok: true, status: 200 });

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

    expect(getWebhooks).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: expect.any(Array),
      })
    );

    expect(sendPayload).toHaveBeenCalledWith(
      "webhook-secret",
      "BOOKING_LOCATION_UPDATED",
      expect.any(String),
      expect.objectContaining({
        subscriberUrl: "https://example.com/webhook",
      }),
      expect.objectContaining({
        bookingId: booking.id,
        oldLocation: "https://old-location-team.com",
        updatedLocation: "integrations:zoom",
      })
    );
  });
});
