import { describe, expect, test, vi, beforeEach } from "vitest";

import prismaMock from "../../../../../../../tests/libs/__mocks__/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
  getDate,
  BookingLocations,
  getGoogleCalendarCredential,
  getZoomAppCredential,
  mockNoTranslations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import {
  editLocationHandler,
  getLocationForOrganizerDefaultConferencingAppInEvtFormat,
  SystemError,
  UserError,
} from "../editLocation.handler";

vi.mock("@calcom/lib/buildCalEventFromBooking");

vi.mock("@calcom/lib/server/repository/user");
vi.mock("@calcom/lib/server/repository/booking");


vi.mock("@calcom/lib/EventManager");

vi.mock("@calcom/emails", () => ({
  sendLocationChangeEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/server/getUsersCredentials", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));


describe("getLocationForOrganizerDefaultConferencingAppInEvtFormat", () => {
  const mockTranslate = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.resetAllMocks();
    
    const mockUserRepository = vi.mocked(UserRepository);
    if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
      mockUserRepository.mockImplementation(
        () =>
          ({
            findByIdOrThrow: vi.fn().mockImplementation(({ id }) => {
              if (id === 101) {
                return Promise.resolve({
                  id: 101,
                  name: "Organizer",
                  email: "organizer@example.com",
                  metadata: {
                    defaultConferencingApp: {
                      appSlug: "zoom",
                    },
                  },
                });
              }
              return Promise.resolve({
                id,
                name: "Test User",
                email: "test@example.com",
                metadata: null,
              });
            }),
          } as any)
      );
    }

    const mockBookingRepository = vi.mocked(BookingRepository);
    if (mockBookingRepository && typeof mockBookingRepository.mockImplementation === "function") {
      mockBookingRepository.mockImplementation(
        () =>
          ({
            updateLocationById: vi.fn().mockResolvedValue(undefined),
          } as any)
      );
    }
  });

  describe("Dynamic link apps", () => {
    test("should return the app type for Zoom", () => {
      const organizer = {
        name: "Organizer",
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
        name: "Organizer",
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

    test("should return the app type for Daily Video", () => {
      const organizer = {
        name: "Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "daily-video",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("integrations:daily");
    });
  });

  describe("Static link apps", () => {
    test("should return the app link for static link apps", () => {
      const organizer = {
        name: "Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "whereby",
            appLink: "https://whereby.com/my-room",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("https://whereby.com/my-room");
    });
  });

  describe("Error handling", () => {
    test("should throw UserError when no default conferencing app is configured", () => {
      const organizer = {
        name: "Organizer",
        metadata: null,
      };

      expect(() =>
        getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        })
      ).toThrow(UserError);
    });
  });
});

describe("editLocationHandler", () => {
  setupAndTeardown();

  let eventManagerSpy: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    mockNoTranslations();
    
    const { buildCalEventFromBooking } = await import("@calcom/lib/buildCalEventFromBooking");
    vi.mocked(buildCalEventFromBooking).mockImplementation((params) => {
      const { booking, location, organizer } = params;
      
      return Promise.resolve({
        location: location,
        title: "Test Event",
        startTime: new Date(),
        endTime: new Date(),
        organizer: organizer || { name: "Organizer", email: "organizer@example.com" },
        attendees: [],
        uid: booking?.uid || "test-uid",
        iCalSequence: 0,
        seatsPerTimeSlot: booking?.eventType?.seatsPerTimeSlot || null,
        seatsShowAttendees: booking?.eventType?.seatsShowAttendees || null,
      });
    });
    
    const EventManager = (await import("@calcom/lib/EventManager")).default;
    eventManagerSpy = vi.spyOn(EventManager.prototype as any, "updateLocation");
    eventManagerSpy.mockResolvedValue({
      results: [{ success: true, updatedEvent: {} }],
      referencesToCreate: [],
    });

    vi.mocked(UserRepository).mockImplementation(() => ({
      findByIdOrThrow: vi.fn().mockImplementation(({ id }) => {
        return Promise.resolve({
          id: id,
          name: "Organizer",
          email: "organizer@example.com",
          metadata: {
            defaultConferencingApp: {
              appSlug: "zoom",
            },
          },
        });
      }),
    }) as any);
  });

  describe("Location Updates", () => {
    test("should successfully update booking location to a static location", async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: 1,
              uid: "booking-1",
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
              userId: 101,
              location: BookingLocations.CalVideo,
              attendees: [
                {
                  email: booker.email,
                  timeZone: "Asia/Kolkata",
                },
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
        })
      );

      const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: { uid: "MOCK_ID" },
        update: { uid: "UPDATED_MOCK_ID" },
      });

      const videoMock = mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
      });

      const mockBooking = {
        id: 1,
        uid: "booking-1",
        eventTypeId: 1,
        status: BookingStatus.ACCEPTED,
        startTime: new Date(`${plus1DateString}T05:00:00.000Z`),
        endTime: new Date(`${plus1DateString}T05:30:00.000Z`),
        userId: 101,
        location: BookingLocations.CalVideo,
        user: organizer,
        attendees: [{ email: booker.email, timeZone: "Asia/Kolkata" }],
        references: [],
        eventType: { id: 1, metadata: {} },
        responses: {
          location: {
            value: BookingLocations.CalVideo,
            optionValue: "",
          },
        },
        metadata: {},
      };

      const result = await editLocationHandler({
        ctx: {
          booking: mockBooking,
          user: organizer,
        },
        input: {
          newLocation: "https://meet.example.com/new-room",
          credentialId: null,
        },
      });

      expect(result.message).toBe("Location updated");
    });

    test("should successfully update seated event location without updating booking responses", async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [{ id: 101 }],
              seatsPerTimeSlot: 5,
              seatsShowAttendees: true,
            },
          ],
          bookings: [
            {
              id: 1,
              uid: "booking-seated-1",
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
              userId: 101,
              location: "https://old-location.com",
              responses: {
                location: {
                  value: "https://old-location.com",
                  optionValue: "",
                },
                name: booker.name,
                email: booker.email,
              },
              attendees: [
                {
                  email: booker.email,
                  timeZone: "Asia/Kolkata",
                },
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"]],
        })
      );

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: { uid: "MOCK_ID" },
        update: { uid: "UPDATED_MOCK_ID" },
      });

      const mockSeatedBooking = {
        id: 1,
        uid: "booking-seated-1",
        eventTypeId: 1,
        status: BookingStatus.ACCEPTED,
        startTime: new Date(`${plus1DateString}T05:00:00.000Z`),
        endTime: new Date(`${plus1DateString}T05:30:00.000Z`),
        userId: 101,
        location: "https://old-location.com",
        user: organizer,
        attendees: [{ email: booker.email, timeZone: "Asia/Kolkata" }],
        references: [],
        eventType: { 
          id: 1, 
          metadata: {},
          seatsPerTimeSlot: 5,
          seatsShowAttendees: true,
        },
        responses: {
          location: {
            value: "https://old-location.com",
            optionValue: "",
          },
          name: booker.name,
          email: booker.email,
        },
        metadata: {},
      };

      const originalResponses = mockSeatedBooking.responses;
      
      vi.mocked(UserRepository).mockImplementation(() => ({
        findByIdOrThrow: vi.fn().mockResolvedValue(organizer),
      }) as any);
      
      const updateLocationByIdSpy = vi.fn().mockResolvedValue({
        ...mockSeatedBooking,
        location: "https://new-seated-location.com",
        responses: originalResponses,
      });
      
      vi.mocked(BookingRepository).mockImplementation(() => ({
        updateLocationById: updateLocationByIdSpy,
      }) as any);

      const result = await editLocationHandler({
        ctx: {
          booking: mockSeatedBooking,
          user: organizer,
        },
        input: {
          newLocation: "https://new-seated-location.com",
          credentialId: null,
        },
      });

      expect(result.message).toBe("Location updated");

      expect(updateLocationByIdSpy).toHaveBeenCalledWith({
        where: { id: mockSeatedBooking.id },
        data: expect.objectContaining({
          location: "https://new-seated-location.com",
        }),
      });
      
      const callData = updateLocationByIdSpy.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('responses');
    });

    test("should successfully update booking location to organizer default conferencing app", async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getZoomAppCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
          },
        },
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: 1,
              uid: "booking-1",
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
              userId: 101,
              location: "https://old-location.com",
            },
          ],
          organizer,
          apps: [TestData.apps["zoom"], TestData.apps["google-calendar"]],
        })
      );

      mockCalendarToHaveNoBusySlots("googlecalendar");
      mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "zoom" });

      const mockBooking = {
        id: 1,
        uid: "booking-1",
        eventTypeId: 1,
        status: BookingStatus.ACCEPTED,
        startTime: new Date(`${plus1DateString}T05:00:00.000Z`),
        endTime: new Date(`${plus1DateString}T05:30:00.000Z`),
        userId: 101,
        location: "https://old-location.com",
        user: organizer,
        attendees: [],
        references: [],
        eventType: { id: 1, metadata: {} },
        responses: {},
        metadata: {},
      };

      const result = await editLocationHandler({
        ctx: {
          booking: mockBooking,
          user: organizer,
        },
        input: {
          newLocation: "conferencing",
          credentialId: null,
        },
      });

      expect(result.message).toBe("Location updated");
    });
  });

  describe("Error Handling", () => {
    test("should throw UserError when organizer default conferencing app is not configured", async () => {
      vi.mocked(UserRepository).mockImplementation(() => ({
        findByIdOrThrow: vi.fn().mockResolvedValue({
          id: 101,
          name: "Organizer",
          email: "organizer@example.com",
          metadata: null, // No default conferencing app
        }),
      }) as any);

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        metadata: null,
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [{ id: 1, slotInterval: 30, length: 30, users: [{ id: 101 }] }],
          bookings: [
            {
              id: 1,
              uid: "booking-1",
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:30:00.000Z`,
              userId: 101,
              location: "old-location",
            },
          ],
          organizer,
        })
      );

      const mockBooking = {
        id: 1,
        uid: "booking-1",
        eventTypeId: 1,
        status: BookingStatus.ACCEPTED,
        startTime: new Date(`${plus1DateString}T05:00:00.000Z`),
        endTime: new Date(`${plus1DateString}T05:30:00.000Z`),
        userId: 101,
        location: "old-location",
        user: organizer,
        attendees: [],
        references: [],
        eventType: { id: 1, metadata: {} },
        responses: {},
        metadata: {},
      };

      await expect(
        editLocationHandler({
          ctx: { booking: mockBooking, user: organizer },
          input: { newLocation: "conferencing", credentialId: null },
        })
      ).rejects.toThrow("organizer_default_conferencing_app_not_found");
    });
  });

  describe("Core Functionality Tests", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    test("should export required functions and classes", () => {
      expect(getLocationForOrganizerDefaultConferencingAppInEvtFormat).toBeDefined();
      expect(UserError).toBeDefined();
      expect(SystemError).toBeDefined();
    });

    describe("Error classes", () => {
      test("UserError should have correct properties", () => {
        const error = new UserError("User facing error");
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("LocationError");
        expect(error.message).toBe("User facing error");
      });

      test("SystemError should have correct properties", () => {
        const error = new SystemError("Internal system error");
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("SystemError");
        expect(error.message).toBe("Internal system error");
      });
    });

    describe("Location validation", () => {
      const mockTranslate = vi.fn((key: string) => key);

      test("should handle organizer default conferencing app", () => {
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

      test("should throw error for missing conferencing app", () => {
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
      });

      test("should handle static link apps", () => {
        const organizer = {
          name: "Test Organizer",
          metadata: {
            defaultConferencingApp: {
              appSlug: "whereby",
              appLink: "https://whereby.com/test-room",
            },
          },
        };

        const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        });

        expect(result).toBe("https://whereby.com/test-room");
      });

      test("should handle missing app link for static apps", () => {
        const organizer = {
          name: "Test Organizer",
          metadata: {
            defaultConferencingApp: {
              appSlug: "whereby",
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
});
