/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: Bring this test back with the correct setup (no illegal imports)
import { describe, expect, test, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import {
  editLocationHandler,
  getLocationForOrganizerDefaultConferencingAppInEvtFormat,
  SystemError,
  UserError,
} from "./editLocation.handler";

vi.mock("@calcom/prisma", () => {
  return {
    prisma: vi.fn(),
  };
});

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
        currentUserId: updatedOrganizer.id,
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
