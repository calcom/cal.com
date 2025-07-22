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
  getGoogleCalendarCredential,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, test, vi, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";

describe("Round Robin handleNewBooking", () => {
  setupAndTeardown();

  describe("Round Robin with groups", () => {
    test("Books one host from each round robin group", async () => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });
      const teamMemberOne = [
        {
          name: "Team Member One",
          username: "other-team-member-1",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-one@example.com",
          id: 102,
          schedule: TestData.schedules.IstMorningShift,
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          destinationCalendar: {
            integration: TestData.apps["google-calendar"].type,
            externalId: "other-team-member-1@google-calendar.com",
          },
        },
      ];
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstMorningShift],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "organizer@google-calendar.com",
        },
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
        {
          name: "Team Member 3",
          username: "team-member-3",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-3@example.com",
          id: 104,
          schedules: [TestData.schedules.IstEveningShift],
        },
        {
          name: "Team Member 4",
          username: "team-member-4",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-4@example.com",
          id: 105,
          schedules: [TestData.schedules.IstEveningShift],
        },
      ];

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 15,
              users: [
                { id: teamMembers[0].id },
                { id: teamMembers[1].id },
                { id: teamMembers[2].id },
                { id: teamMembers[3].id },
              ],
              hosts: [
                { userId: teamMembers[0].id, isFixed: false, groupId: "group-1" },
                { userId: teamMembers[1].id, isFixed: false, groupId: "group-1" },
                { userId: teamMembers[2].id, isFixed: false, groupId: "group-2" },
                { userId: teamMembers[3].id, isFixed: false, groupId: "group-2" },
              ],
              hostGroups: [
                { id: "group-1", name: "Group 1" },
                { id: "group-2", name: "Group 2" },
              ],
              schedule: TestData.schedules.IstMorningShift,
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          usersApartFromOrganizer: teamMembers,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });
      const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });
      const mockBookingData = getMockRequestDataForBooking({
        data: {
          // Try booking the first available free timeslot in both the users' schedules
          start: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
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

      // Verify that the booking was created successfully
      expect(createdBooking).toBeDefined();
      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      // Verify that lucky users were selected (one from each group)
      expect(createdBooking.luckyUsers).toBeDefined();
      expect(createdBooking.luckyUsers).toHaveLength(2);

      // Verify that the selected users are from different groups
      const selectedUserIds = createdBooking.luckyUsers;
      const group1UserIds = [teamMembers[0].id, teamMembers[1].id]; // group-1
      const group2UserIds = [teamMembers[2].id, teamMembers[3].id]; // group-2

      // Check that one user is from group-1 and one is from group-2
      const hasGroup1User = selectedUserIds.some((id) => group1UserIds.includes(id));
      const hasGroup2User = selectedUserIds.some((id) => group2UserIds.includes(id));

      expect(hasGroup1User).toBe(true);
      expect(hasGroup2User).toBe(true);

      // Verify that the booking has the correct attendees
      expect(createdBooking.attendees).toHaveLength(2);
      expect(createdBooking.attendees[0].email).toBe(booker.email);

      // The second attendee should be one of the selected lucky users
      const secondAttendeeEmail = createdBooking.attendees[1].email;
      const selectedUserEmails = selectedUserIds.map(
        (id) => teamMembers.find((member) => member.id === id)?.email
      );
      expect(selectedUserEmails).toContain(secondAttendeeEmail);
    });

    test("Throws error when one round robin group has no available hosts", async () => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
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
        {
          name: "Team Member 3",
          username: "team-member-3",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-3@example.com",
          id: 104,
          schedules: [TestData.schedules.IstEveningShift],
        },
        {
          name: "Team Member 4",
          username: "team-member-4",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-4@example.com",
          id: 105,
          schedules: [TestData.schedules.IstEveningShift],
        },
      ];

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstMorningShift],
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
              slotInterval: 15,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 15,
              users: [
                { id: teamMembers[0].id },
                { id: teamMembers[1].id },
                { id: teamMembers[2].id },
                { id: teamMembers[3].id },
              ],
              hosts: [
                { userId: teamMembers[0].id, isFixed: false, groupId: "group-1" },
                { userId: teamMembers[1].id, isFixed: false, groupId: "group-1" },
                { userId: teamMembers[2].id, isFixed: false, groupId: "group-2" },
                { userId: teamMembers[3].id, isFixed: false, groupId: "group-2" },
              ],
              hostGroups: [
                { id: "group-1", name: "Group 1" },
                { id: "group-2", name: "Group 2" },
              ],
              schedule: TestData.schedules.IstMorningShift,
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          usersApartFromOrganizer: teamMembers,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          // Add existing bookings to make only group-2 hosts busy
          bookings: [
            {
              userId: teamMembers[0].id, // Team Member 1 (group-1)
              eventTypeId: 1,
              startTime: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
              endTime: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
              status: "ACCEPTED",
              attendees: [
                {
                  email: "existing-booker-1@example.com",
                },
              ],
            },
            {
              userId: teamMembers[1].id, // Team Member 2 (group-1)
              eventTypeId: 1,
              startTime: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
              endTime: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
              status: "ACCEPTED",
              attendees: [
                {
                  email: "existing-booker-2@example.com",
                },
              ],
            },
          ],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: appStoreMetadata.dailyvideo.dirName || "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });

      const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      // Expect handleNewBooking to throw an error because group-2 has no available hosts
      await expect(
        handleNewBooking({
          bookingData: mockBookingData,
        })
      ).rejects.toThrow(ErrorCode.RoundRobinHostsUnavailableForBooking);
    });

    test("Creates successful booking even when one group has no hosts", async () => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
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

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstMorningShift],
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
              slotInterval: 15,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 15,
              users: [{ id: teamMembers[0].id }, { id: teamMembers[1].id }],
              hosts: [
                { userId: teamMembers[0].id, isFixed: false, groupId: "group-1" },
                { userId: teamMembers[1].id, isFixed: false, groupId: "group-1" },
              ],
              hostGroups: [
                { id: "group-1", name: "Group 1" },
                { id: "group-2", name: "Group 2" }, // Empty group with no hosts
              ],
              schedule: TestData.schedules.IstMorningShift,
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "event-type-1@google-calendar.com",
              },
            },
          ],
          organizer,
          usersApartFromOrganizer: teamMembers,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });

      const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
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

      // Verify that the booking was created successfully
      expect(createdBooking).toBeDefined();
      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      // Verify that lucky users were selected (only from group-1 since group-2 has no hosts)
      expect(createdBooking.luckyUsers).toBeDefined();
      expect(createdBooking.luckyUsers).toHaveLength(1);

      // Verify that the selected user is from group-1
      const selectedUserId = createdBooking.luckyUsers[0];
      const group1UserIds = [teamMembers[0].id, teamMembers[1].id]; // group-1
      expect(group1UserIds).toContain(selectedUserId);

      // Verify that the booking has the correct attendees
      expect(createdBooking.attendees).toHaveLength(1);
      expect(createdBooking.attendees[0].email).toBe(booker.email);

      // Verify that the booking user is the selected lucky user
      expect(createdBooking.userId).toBe(selectedUserId);
    });
  });

  describe("Seated Round Robin Event", () => {
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
});
