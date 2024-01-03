import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, test, vi, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { BookingStatus } from "@calcom/prisma/enums";
import {
  getBooker,
  TestData,
  getOrganizer,
  createBookingScenario,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  BookingLocations,
  getDate,
  getMockBookingAttendee,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import * as handleSeatsModule from "../handleSeats";

describe("handleSeats", () => {
  setupAndTeardown();

  describe("Correct parameters being passed into handleSeats from handleNewBooking", () => {
    vi.mock("./handleSeats");
    test("On new booking handleSeats is not called", async () => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const spy = vi.spyOn(handleSeatsModule, "default");
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
              seatsPerTimeSlot: 3,
            },
          ],
          organizer,
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      const { req } = createMockNextJsRequest({
        method: "POST",
        body: mockBookingData,
      });

      await handleNewBooking(req);

      expect(spy).toHaveBeenCalledTimes(0);
    });

    test("handleSeats is called when a new attendee is added", async () => {
      const spy = vi.spyOn(handleSeatsModule, "default");
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const bookingStartTime = `${plus1DateString}T04:00:00Z`;
      const bookingUid = "abc123";

      const bookingScenario = await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slug: "seated-event",
              slotInterval: 45,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
              seatsPerTimeSlot: 3,
              seatsShowAttendees: false,
            },
          ],
          bookings: [
            {
              uid: bookingUid,
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: bookingStartTime,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
              ],
            },
          ],
          organizer,
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });

      const reqBookingUser = "seatedAttendee";

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
          bookingUid: bookingUid,
          user: reqBookingUser,
        },
      });

      const { req } = createMockNextJsRequest({
        method: "POST",
        body: mockBookingData,
      });

      await handleNewBooking(req);

      const handleSeatsCall = spy.mock.calls[0][0];

      expect(handleSeatsCall).toEqual(
        expect.objectContaining({
          bookerEmail: booker.email,
          reqBookingUid: bookingUid,
          reqBodyUser: reqBookingUser,
          tAttendees: expect.any(Function),
          additionalNotes: expect.anything(),
          noEmail: undefined,
        })
      );

      const bookingScenarioEventType = bookingScenario.eventTypes[0];
      expect(handleSeatsCall.eventTypeInfo).toEqual(
        expect.objectContaining({
          eventTitle: bookingScenarioEventType.title,
          eventDescription: bookingScenarioEventType.description,
          length: bookingScenarioEventType.length,
        })
      );

      expect(handleSeatsCall.eventType).toEqual(
        expect.objectContaining({
          id: bookingScenarioEventType.id,
          slug: bookingScenarioEventType.slug,
          workflows: bookingScenarioEventType.workflows,
          seatsPerTimeSlot: bookingScenarioEventType.seatsPerTimeSlot,
          seatsShowAttendees: bookingScenarioEventType.seatsShowAttendees,
        })
      );

      expect(handleSeatsCall.evt).toEqual(
        expect.objectContaining({
          startTime: bookingStartTime,
        })
      );

      expect(handleSeatsCall.invitee).toEqual([
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        }),
      ]);
    });

    test("handleSeats is called on rescheduling a seated event", async () => {
      const spy = vi.spyOn(handleSeatsModule, "default");
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const bookingStartTime = `${plus1DateString}T04:00:00Z`;
      const bookingUid = "abc123";

      const bookingScenario = await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slug: "seated-event",
              slotInterval: 45,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
              seatsPerTimeSlot: 3,
              seatsShowAttendees: false,
            },
          ],
          bookings: [
            {
              uid: bookingUid,
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: bookingStartTime,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
              ],
            },
          ],
          organizer,
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });

      const reqBookingUser = "seatedAttendee";

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          rescheduleUid: bookingUid,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
          bookingUid: bookingUid,
          user: reqBookingUser,
        },
      });

      const { req } = createMockNextJsRequest({
        method: "POST",
        body: mockBookingData,
      });

      await handleNewBooking(req);

      const handleSeatsCall = spy.mock.calls[0][0];

      expect(handleSeatsCall).toEqual(
        expect.objectContaining({
          rescheduleUid: bookingUid,
          bookerEmail: booker.email,
          reqBookingUid: bookingUid,
          reqBodyUser: reqBookingUser,
          tAttendees: expect.any(Function),
          additionalNotes: expect.anything(),
          noEmail: undefined,
        })
      );

      const bookingScenarioEventType = bookingScenario.eventTypes[0];
      expect(handleSeatsCall.eventTypeInfo).toEqual(
        expect.objectContaining({
          eventTitle: bookingScenarioEventType.title,
          eventDescription: bookingScenarioEventType.description,
          length: bookingScenarioEventType.length,
        })
      );

      expect(handleSeatsCall.eventType).toEqual(
        expect.objectContaining({
          id: bookingScenarioEventType.id,
          slug: bookingScenarioEventType.slug,
          workflows: bookingScenarioEventType.workflows,
          seatsPerTimeSlot: bookingScenarioEventType.seatsPerTimeSlot,
          seatsShowAttendees: bookingScenarioEventType.seatsShowAttendees,
        })
      );

      expect(handleSeatsCall.evt).toEqual(
        expect.objectContaining({
          startTime: bookingStartTime,
        })
      );

      expect(handleSeatsCall.invitee).toEqual([
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        }),
      ]);
    });
  });

  describe("As an attendee", () => {
    describe("Creating a new booking", () => {
      test("Attendee should be added to existing seated event", async () => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

        const booker = getBooker({
          email: "seat2@example.com",
          name: "Seat 2",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const bookingStartTime = `${plus1DateString}T04:00:00.000Z`;
        const bookingUid = "abc123";
        const bookingId = 1;

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: bookingId,
                slug: "seated-event",
                slotInterval: 45,
                length: 45,
                users: [
                  {
                    id: 101,
                  },
                ],
                seatsPerTimeSlot: 3,
                seatsShowAttendees: false,
              },
            ],
            bookings: [
              {
                id: 1,
                uid: bookingUid,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: bookingStartTime,
                endTime: `${plus1DateString}T05:15:00.000Z`,
                metadata: {
                  videoCallUrl: "https://existing-daily-video-call-url.example.com",
                },
                references: [
                  {
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "MOCK_ID",
                    meetingId: "MOCK_ID",
                    meetingPassword: "MOCK_PASS",
                    meetingUrl: "http://mock-dailyvideo.example.com",
                    credentialId: null,
                  },
                ],
                attendees: [
                  getMockBookingAttendee({
                    id: 1,
                    name: "Seat 1",
                    email: "seat1@test.com",
                    // Booker's locale when the fresh booking happened earlier
                    locale: "en",
                    // Booker's timezone when the fresh booking happened earlier
                    timeZone: "America/Toronto",
                    bookingSeat: {
                      referenceUid: "booking-seat-1",
                      data: {},
                    },
                  }),
                ],
              },
            ],
            organizer,
          })
        );

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
          videoMeetingData: {
            id: "MOCK_ID",
            password: "MOCK_PASS",
            url: `http://mock-dailyvideo.example.com/meeting-1`,
          },
        });

        const reqBookingUser = "seatedAttendee";

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            bookingUid: bookingUid,
            user: reqBookingUser,
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        await handleNewBooking(req);

        const newAttendee = await prismaMock.attendee.findFirst({
          where: {
            email: booker.email,
            bookingId: bookingId,
          },
          include: {
            bookingSeat: true,
          },
        });

        // Check for the existence of the new attendee w/ booking seat
        expect(newAttendee?.bookingSeat).toEqual(
          expect.objectContaining({
            referenceUid: expect.any(String),
            data: expect.any(Object),
            bookingId: 1,
          })
        );
      });

      test("If attendee is already a part of the booking then throw an error", async () => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

        const booker = getBooker({
          email: "seat1@example.com",
          name: "Seat 1",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const bookingStartTime = `${plus1DateString}T04:00:00.000Z`;
        const bookingUid = "abc123";
        const bookingId = 1;

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: bookingId,
                slug: "seated-event",
                slotInterval: 45,
                length: 45,
                users: [
                  {
                    id: 101,
                  },
                ],
                seatsPerTimeSlot: 3,
                seatsShowAttendees: false,
              },
            ],
            bookings: [
              {
                id: 1,
                uid: bookingUid,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: bookingStartTime,
                endTime: `${plus1DateString}T05:15:00.000Z`,
                metadata: {
                  videoCallUrl: "https://existing-daily-video-call-url.example.com",
                },
                references: [
                  {
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "MOCK_ID",
                    meetingId: "MOCK_ID",
                    meetingPassword: "MOCK_PASS",
                    meetingUrl: "http://mock-dailyvideo.example.com",
                    credentialId: null,
                  },
                ],
                attendees: [
                  getMockBookingAttendee({
                    id: 1,
                    name: "Seat 1",
                    email: "seat1@example.com",
                    // Booker's locale when the fresh booking happened earlier
                    locale: "en",
                    // Booker's timezone when the fresh booking happened earlier
                    timeZone: "America/Toronto",
                    bookingSeat: {
                      referenceUid: "booking-seat-1",
                      data: {},
                    },
                  }),
                ],
              },
            ],
            organizer,
          })
        );

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
          videoMeetingData: {
            id: "MOCK_ID",
            password: "MOCK_PASS",
            url: `http://mock-dailyvideo.example.com/meeting-1`,
          },
        });

        const reqBookingUser = "seatedAttendee";

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
            bookingUid: bookingUid,
            user: reqBookingUser,
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
        });

        await expect(() => handleNewBooking(req)).rejects.toThrowError("Already signed up for this booking.");
      });
    });
  });
});
