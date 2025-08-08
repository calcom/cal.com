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
  getMockBookingAttendee,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, test, vi, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";

describe("Seated Round Robin Events", () => {
  setupAndTeardown();

  test("For second seat booking, organizer remains the same with no team members included", async () => {
    const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
    const EventManager = (await import("@calcom/lib/EventManager")).default;

    const eventManagerSpy = vi.spyOn(EventManager.prototype, "updateCalendarAttendees");

    const booker = getBooker({
      email: "seat2@example.com",
      name: "Seat 2",
    });

    const assignedHost = getOrganizer({
      name: "Assigned Host",
      email: "assigned-host@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const teamMembers = [
      {
        name: "Team Member 1",
        username: "team-member-1",
        timeZone: Timezones["+5:30"],
        defaultScheduleId: null,
        email: "team-member-1@example.com",
        id: 102,
        schedules: [TestData.schedules.IstEveningShift],
      },
      {
        name: "Team Member 2",
        username: "team-member-2",
        timeZone: Timezones["+5:30"],
        defaultScheduleId: null,
        email: "team-member-2@example.com",
        id: 103,
        schedules: [TestData.schedules.IstEveningShift],
      },
    ];

    const bookingId = 1;
    const bookingUid = "abc123";
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const bookingStartTime = `${plus1DateString}T04:00:00Z`;
    const bookingEndTime = `${plus1DateString}T04:30:00Z`;

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slug: "seated-round-robin-event",
            slotInterval: 30,
            length: 30,
            schedulingType: SchedulingType.ROUND_ROBIN,
            users: [{ id: assignedHost.id }, { id: teamMembers[0].id }, { id: teamMembers[1].id }],
            hosts: [
              { userId: assignedHost.id, isFixed: false },
              { userId: teamMembers[0].id, isFixed: false },
              { userId: teamMembers[1].id, isFixed: false },
            ],
            seatsPerTimeSlot: 3,
            seatsShowAttendees: false,
          },
        ],
        bookings: [
          {
            id: bookingId,
            uid: bookingUid,
            eventTypeId: 1,
            status: BookingStatus.ACCEPTED,
            startTime: bookingStartTime,
            endTime: bookingEndTime,
            userId: assignedHost.id, // This is the assigned host for the booking
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
                locale: "en",
                timeZone: "America/Toronto",
                bookingSeat: {
                  referenceUid: "booking-seat-1",
                  data: {},
                },
              }),
            ],
          },
        ],
        organizer: assignedHost,
        usersApartFromOrganizer: [...teamMembers],
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

    await handleNewBooking({
      bookingData: mockBookingData,
    });

    expect(eventManagerSpy).toHaveBeenCalled();

    const calendarEvent = eventManagerSpy.mock.calls[0][0];

    expect(calendarEvent.organizer.email).toBe(assignedHost.email);

    expect(calendarEvent.team?.members).toBeDefined();
    expect(calendarEvent.team?.members.length).toBe(0);

    const teamMemberEmails = calendarEvent.team?.members.map((member) => member.email);
    expect(teamMemberEmails).not.toContain(teamMembers[0].email);
    expect(teamMemberEmails).not.toContain(teamMembers[1].email);
  });
});
