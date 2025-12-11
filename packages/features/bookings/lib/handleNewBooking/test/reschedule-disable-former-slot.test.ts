import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
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

import { describe, expect, vi } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";

const timeout = process.env.CI ? 5000 : 20000;

describe("Rescheduling Individual Events - Former Slot Disabled", () => {
  setupAndTeardown();

  describe("BookingRepository Query Verification", () => {
    test(
      "verifies findAllExistingBookingsForEventTypeBetween includes CANCELLED bookings with rescheduled=true",
      async () => {
        vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        const plus1DateString = "2025-01-02";

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
                uid: "accepted-booking-uid",
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T09:00:00.000Z`,
                endTime: `${plus1DateString}T09:30:00.000Z`,
                userId: 101,
                references: [],
                attendees: [
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
              {
                uid: "rescheduled-former-slot-uid",
                eventTypeId: 1,
                status: BookingStatus.CANCELLED,
                rescheduled: true, // This should be included in the query
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T10:30:00.000Z`,
                userId: 101,
                references: [],
                attendees: [
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
              {
                uid: "cancelled-not-rescheduled-uid",
                eventTypeId: 1,
                status: BookingStatus.CANCELLED,
                rescheduled: false, // This should NOT be included
                startTime: `${plus1DateString}T11:00:00.000Z`,
                endTime: `${plus1DateString}T11:30:00.000Z`,
                userId: 101,
                references: [],
                attendees: [
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
            ],
            organizer,
            apps: [],
          })
        );

        const bookingRepo = new BookingRepository(prismaMock);
        const retrievedBookings = (await bookingRepo.findAllExistingBookingsForEventTypeBetween({
          userIdAndEmailMap: new Map([[organizer.id, organizer.email]]),
          eventTypeId: 1,
          startDate: new Date(`${plus1DateString}T08:00:00.000Z`),
          endDate: new Date(`${plus1DateString}T12:00:00.000Z`),
          seatedEvent: false, // For individual events
        })) as Array<{ uid: string; status: BookingStatus; rescheduled?: boolean | null }>;

        expect(retrievedBookings).toHaveLength(2);

        const acceptedBooking = retrievedBookings.find((b) => b.uid === "accepted-booking-uid");
        const rescheduledFormerSlot = retrievedBookings.find((b) => b.uid === "rescheduled-former-slot-uid");
        const cancelledNotRescheduled = retrievedBookings.find(
          (b) => b.uid === "cancelled-not-rescheduled-uid"
        );

        expect(acceptedBooking).toBeDefined();
        expect(acceptedBooking?.status).toBe(BookingStatus.ACCEPTED);

        expect(rescheduledFormerSlot).toBeDefined();
        expect(rescheduledFormerSlot?.status).toBe(BookingStatus.CANCELLED);
        expect(rescheduledFormerSlot?.rescheduled).toBe(true);

        expect(cancelledNotRescheduled).toBeUndefined();
      },
      timeout
    );

    test(
      "verifies findAllExistingBookingsForEventTypeBetween does NOT include rescheduled bookings for seated events",
      async () => {
        vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        const plus1DateString = "2025-01-02";

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


        // Create bookings for a seated event
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 2,
                slotInterval: 30,
                length: 30,
                seatsPerTimeSlot: 5, // Seated event
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            bookings: [
              {
                uid: "seated-accepted-uid",
                eventTypeId: 2,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T09:00:00.000Z`,
                endTime: `${plus1DateString}T09:30:00.000Z`,
                userId: 101,
                references: [],
                attendees: [
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
              {
                uid: "seated-rescheduled-former-uid",
                eventTypeId: 2,
                status: BookingStatus.CANCELLED,
                rescheduled: true, // For seated events, this should NOT block the slot
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T10:30:00.000Z`,
                userId: 101,
                references: [],
                attendees: [
                  {
                    email: booker.email,
                    timeZone: "Asia/Kolkata",
                  },
                ],
              },
            ],
            organizer,
            apps: [],
          })
        );

        // Call the repository with seatedEvent=true
        const bookingRepo = new BookingRepository(prismaMock);
        const retrievedBookings = (await bookingRepo.findAllExistingBookingsForEventTypeBetween({
          userIdAndEmailMap: new Map([[organizer.id, organizer.email]]),
          eventTypeId: 2,
          startDate: new Date(`${plus1DateString}T08:00:00.000Z`),
          endDate: new Date(`${plus1DateString}T12:00:00.000Z`),
          seatedEvent: true, // For seated events
        })) as Array<{ uid: string; status: BookingStatus; rescheduled?: boolean | null }>;

        // For seated events, the query should ONLY return ACCEPTED bookings
        // It should NOT include CANCELLED bookings, even with rescheduled=true
        expect(retrievedBookings).toHaveLength(1);

        const acceptedBooking = retrievedBookings.find((b) => b.uid === "seated-accepted-uid");
        const rescheduledFormerSlot = retrievedBookings.find((b) => b.uid === "seated-rescheduled-former-uid");

        // Verify only the ACCEPTED booking is included
        expect(acceptedBooking).toBeDefined();
        expect(acceptedBooking?.status).toBe(BookingStatus.ACCEPTED);

        // Verify the CANCELLED + rescheduled booking is NOT included for seated events
        expect(rescheduledFormerSlot).toBeUndefined();
      },
      timeout
    );
  });

  describe("End-to-End Reschedule Flow", () => {
    test(
      "documents that rescheduling marks original booking as cancelled with rescheduled=true",
      async () => {
        vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        const plus1DateString = "2025-01-02";

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
        vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        const plus1DateString = "2025-01-02";

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

        await expectBookingToBeInDatabase({
          uid: uidOfBookingToBeRescheduled,
          status: BookingStatus.CANCELLED,
        });

        const cancelledBooking = await prismaMock.booking.findUnique({
          where: { uid: uidOfBookingToBeRescheduled },
        });
        expect(cancelledBooking?.rescheduled).toBe(true);

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
        vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        const plus1DateString = "2025-01-02";

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
        const busyTimes = (await busyTimesService.getBusyTimes({
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
        })) as Array<{ start: Date | string; end: Date | string }>;

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
        vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
        const plus1DateString = "2025-01-02";

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

