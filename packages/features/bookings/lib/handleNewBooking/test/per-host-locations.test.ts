import {
  getBooker,
  TestData,
  getOrganizer,
  createBookingScenario,
  Timezones,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  BookingLocations,
  getDate,
  getGoogleCalendarCredential,
  getZoomAppCredential,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { expectBookingToBeInDatabase } from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { describe, test, expect } from "vitest";

import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { getNewBookingHandler } from "./getNewBookingHandler";

describe("Per-Host Locations - handleNewBooking", () => {
  setupAndTeardown();

  describe("Round-Robin with enablePerHostLocations enabled", () => {
    test("should use host's Zoom credential when host has credentialId", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential(), getZoomAppCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              enablePerHostLocations: true,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: false,
                  location: {
                    type: "integrations:zoom",
                    credentialId: 2,
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"], TestData.apps["zoomvideo"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "zoomvideo",
        videoMeetingData: {
          id: "MOCK_ZOOM_ID",
          password: "MOCK_ZOOM_PASS",
          url: `https://zoom.us/j/123456789`,
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe("integrations:zoom");

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: "integrations:zoom",
      });
    });

    test("should use Cal Video when host location is integrations:daily", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              enablePerHostLocations: true,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: false,
                  location: {
                    type: "integrations:daily",
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_DAILY_ID",
          password: "MOCK_DAILY_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe("integrations:daily");

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: "integrations:daily",
      });
    });

    test("should use stored link when host location type is link", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      const customLink = "https://custom-meeting.example.com/room123";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              enablePerHostLocations: true,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: false,
                  location: {
                    type: "link",
                    link: customLink,
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "link" },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe(customLink);

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: customLink,
      });
    });

    test("should use stored address when host location type is inPerson", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      const officeAddress = "123 Main St, San Francisco, CA 94102";

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              enablePerHostLocations: true,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: false,
                  location: {
                    type: "inPerson",
                    address: officeAddress,
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "inPerson" },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe(officeAddress);

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: officeAddress,
      });
    });

    test("should auto-link credential when host has location type but no credential", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential(), getZoomAppCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              enablePerHostLocations: true,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: false,
                  location: {
                    type: "integrations:zoom",
                    credentialId: null,
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"], TestData.apps["zoomvideo"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "zoomvideo",
        videoMeetingData: {
          id: "MOCK_ZOOM_ID",
          password: "MOCK_ZOOM_PASS",
          url: `https://zoom.us/j/123456789`,
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe("integrations:zoom");

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: "integrations:zoom",
      });

      const hostLocation = await prisma.hostLocation.findUnique({
        where: {
          userId_eventTypeId: {
            userId: organizer.id,
            eventTypeId: 1,
          },
        },
        select: {
          credentialId: true,
        },
      });
      expect(hostLocation?.credentialId).not.toBeNull();
    });

    test("should fallback to Cal Video when no matching credential found", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              enablePerHostLocations: true,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: false,
                  location: {
                    type: "integrations:zoom",
                    credentialId: null,
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_DAILY_ID",
          password: "MOCK_DAILY_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe("integrations:daily");

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: "integrations:daily",
      });
    });
  });

  describe("Feature flag behavior", () => {
    test("should ignore per-host locations when enablePerHostLocations is false", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential(), getZoomAppCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              enablePerHostLocations: false,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: false,
                  location: {
                    type: "integrations:zoom",
                    credentialId: 2,
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"], TestData.apps["zoomvideo"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_DAILY_ID",
          password: "MOCK_DAILY_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe("integrations:daily");

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: "integrations:daily",
      });
    });

    test("should ignore per-host locations for non-round-robin events", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential(), getZoomAppCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.COLLECTIVE,
              length: 30,
              enablePerHostLocations: true,
              users: [{ id: organizer.id }],
              hosts: [
                {
                  userId: organizer.id,
                  isFixed: true,
                  location: {
                    type: "integrations:zoom",
                    credentialId: 2,
                  },
                },
              ],
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"], TestData.apps["zoomvideo"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_DAILY_ID",
          password: "MOCK_DAILY_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T09:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T09:30:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      const createdBooking = await handleNewBooking({
        bookingData: mockBookingData,
      });

      expect(createdBooking).toBeDefined();
      expect(createdBooking.location).toBe("integrations:daily");

      await expectBookingToBeInDatabase({
        uid: createdBooking.uid,
        location: "integrations:daily",
      });
    });
  });
});
