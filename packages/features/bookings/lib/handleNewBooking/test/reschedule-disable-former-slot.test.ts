import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  BookingLocations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectBookingInDBToBeRescheduledFromTo,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";

const timeout = process.env.CI ? 5000 : 20000;

describe("Rescheduling Individual Events - Former Slot Disabled", () => {
  setupAndTeardown();

  describe("End-to-End Reschedule Flow", () => {
    test(
      "documents that rescheduling marks original booking as cancelled with rescheduled=true",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          name: "Booker",
          email: "booker@example.com",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const uidOfBookingToBeRescheduled = "original-booking-uid";

        // Create the initial booking
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T10:30:00.000Z`,
                userId: 101, // Set the organizer's userId so it can be found by the booking query
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
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
        });

        await mockCalendarToHaveNoBusySlots("googlecalendar");

        // Reschedule to a new time
        const rescheduledBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            rescheduleUid: uidOfBookingToBeRescheduled,
            start: `${plus1DateString}T11:00:00.000Z`,
            end: `${plus1DateString}T11:30:00.000Z`,
            responses: {
              email: booker.email,
              name: "Booker",
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const rescheduledBooking = await handleNewBooking({
          bookingData: rescheduledBookingData,
        });

        // Verify the original booking is cancelled and marked as rescheduled
        const originalBooking = await prismaMock.booking.findUnique({
          where: { uid: uidOfBookingToBeRescheduled },
        });

        expect(originalBooking?.status).toBe(BookingStatus.CANCELLED);
        expect(originalBooking?.rescheduled).toBe(true);

        // Verify the new booking exists
        await expectBookingInDBToBeRescheduledFromTo({
          from: {
            uid: uidOfBookingToBeRescheduled,
          },
          to: {
            uid: rescheduledBooking.uid!,
            eventTypeId: 1,
            status: BookingStatus.ACCEPTED,
          },
        });
      },
      timeout
    );

    test(
      "should block the original time slot after rescheduling an individual event",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          name: "",
          email: "booker@example.com"
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const uidOfBookingToBeRescheduled = "test-booking-uid";

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T10:30:00.000Z`,
                userId: 101, // Set the organizer's userId so it can be found by the booking query
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
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
        });

        await mockCalendarToHaveNoBusySlots("googlecalendar");

        // Reschedule to different time
        await handleNewBooking({
          bookingData: getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T11:00:00.000Z`,
              end: `${plus1DateString}T11:30:00.000Z`,
              responses: {
                email: booker.email,
                name: "Booker",
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          }),
        });

        // Verify the original booking is CANCELLED with rescheduled=true
        await expectBookingToBeInDatabase({
          uid: uidOfBookingToBeRescheduled,
          status: BookingStatus.CANCELLED,
        });

        const cancelledBooking = await prismaMock.booking.findUnique({
          where: { uid: uidOfBookingToBeRescheduled },
        });
        expect(cancelledBooking?.rescheduled).toBe(true);

        // Attempt to book the original time slot - this should FAIL
        // because the former slot is now blocked (CANCELLED booking with rescheduled=true)
        await expect(
          handleNewBooking({
            bookingData: getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                start: `${plus1DateString}T10:00:00.000Z`,
                end: `${plus1DateString}T10:30:00.000Z`,
                responses: {
                  email: "another-booker@example.com",
                  name: "Another Booker",
                  location: { optionValue: "", value: BookingLocations.CalVideo },
                },
              },
            }),
          })
        ).rejects.toThrow();
      },
      timeout
    );

    test(
      "verifies getBusyTimes includes rescheduled former slot in busy times calculation",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          name: "Booker",
          email: "booker@example.com",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const uidOfBookingToBeRescheduled = "busy-times-test-uid";

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 2,
                slotInterval: 30,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 2,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T10:30:00.000Z`,
                userId: 101,
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
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
        });

        await mockCalendarToHaveNoBusySlots("googlecalendar");

        await handleNewBooking({
          bookingData: getMockRequestDataForBooking({
            data: {
              eventTypeId: 2,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T11:00:00.000Z`,
              end: `${plus1DateString}T11:30:00.000Z`,
              responses: {
                email: booker.email,
                name: "Booker",
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          }),
        });

        const cancelledBooking = await prismaMock.booking.findUnique({
          where: { uid: uidOfBookingToBeRescheduled },
        });
        expect(cancelledBooking?.status).toBe(BookingStatus.CANCELLED);
        expect(cancelledBooking?.rescheduled).toBe(true);

        const busyTimesService = getBusyTimesService();
        const busyTimes = await busyTimesService.getBusyTimes({
          credentials: organizer.credentials,
          startTime: `${plus1DateString}T09:00:00.000Z`,
          endTime: `${plus1DateString}T12:00:00.000Z`,
          eventTypeId: 2,
          userId: organizer.id,
          userEmail: organizer.email,
          username: organizer.username || "example.username",
          beforeEventBuffer: 0,
          afterEventBuffer: 0,
          selectedCalendars: organizer.selectedCalendars,
          seatedEvent: false,
          rescheduleUid: null,
          duration: 30,
          bypassBusyCalendarTimes: false,
        });

        // Verify that the former slot (10:00-10:30) is marked as busy
        const hasFormerSlotBusy = busyTimes.some((busyTime) => {
          const busyStart = new Date(busyTime.start).toISOString();
          const busyEnd = new Date(busyTime.end).toISOString();
          return (
            busyStart === `${plus1DateString}T10:00:00.000Z` &&
            busyEnd === `${plus1DateString}T10:30:00.000Z`
          );
        });

        expect(hasFormerSlotBusy).toBe(true);

        const hasNewSlotBusy = busyTimes.some((busyTime) => {
          const busyStart = new Date(busyTime.start).toISOString();
          const busyEnd = new Date(busyTime.end).toISOString();
          return (
            busyStart === `${plus1DateString}T11:00:00.000Z` &&
            busyEnd === `${plus1DateString}T11:30:00.000Z`
          );
        });

        expect(hasNewSlotBusy).toBe(true);
        expect(busyTimes.length).toBeGreaterThanOrEqual(2);
      },
      timeout
    );

    test(
      "allows rescheduling to the same time slot",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          name: "Booker",
          email: "booker@example.com",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const uidOfBookingToBeRescheduled = "same-time-booking-uid";

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 3,
                slotInterval: 30,
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 3,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T10:30:00.000Z`,
                userId: 101, // Set the organizer's userId so it can be found by the booking query
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
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
        });

        await mockCalendarToHaveNoBusySlots("googlecalendar");

        // Reschedule to the SAME time - this should succeed
        const rescheduledBooking = await handleNewBooking({
          bookingData: getMockRequestDataForBooking({
            data: {
              eventTypeId: 3,
              rescheduleUid: uidOfBookingToBeRescheduled,
              start: `${plus1DateString}T10:00:00.000Z`,
              end: `${plus1DateString}T10:30:00.000Z`,
              responses: {
                email: booker.email,
                name: "Booker",
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          }),
        });

        // Should succeed - user can reschedule their own booking to the same time
        expect(rescheduledBooking).toBeDefined();
        expect(rescheduledBooking.status).toBe(BookingStatus.ACCEPTED);
        expect(rescheduledBooking.startTime?.toISOString()).toBe(`${plus1DateString}T10:00:00.000Z`);
      },
      timeout
    );
  });
});

