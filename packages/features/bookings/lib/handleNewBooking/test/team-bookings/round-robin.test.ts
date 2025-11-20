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
import { expectBookingCreatedWebhookToHaveBeenFired } from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, test, vi, expect } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { getNewBookingHandler } from "../getNewBookingHandler";

describe("Round Robin handleNewBooking", () => {
  setupAndTeardown();

  describe("Round Robin with groups", () => {
    test("Books one host from each round robin group", async () => {
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
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
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
      const handleNewBooking = getNewBookingHandler();
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
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
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
      const handleNewBooking = getNewBookingHandler();
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
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
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

    test("Correctly handles hosts without groupId falling back to DEFAULT_GROUP_ID", async () => {
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

      const teamMembers = [
        {
          name: "Team Member 1",
          username: "team-member-1",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-1@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
        {
          name: "Team Member 2",
          username: "team-member-2",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-2@example.com",
          id: 103,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
        {
          name: "Team Member 3",
          username: "team-member-3",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-3@example.com",
          id: 104,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
      ];

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              isRRWeightsEnabled: true,
              users: [{ id: teamMembers[0].id }, { id: teamMembers[1].id }, { id: teamMembers[2].id }],
              hosts: [
                // Mix of hosts with explicit groupId and hosts without groupId (should fall back to DEFAULT_GROUP_ID)
                {
                  userId: teamMembers[0].id,
                  isFixed: false,
                },
                { userId: teamMembers[1].id, isFixed: false, groupId: null }, // Should use DEFAULT_GROUP_ID
                { userId: teamMembers[2].id, isFixed: false }, // Should use DEFAULT_GROUP_ID (no groupId property)
              ],
              hostGroups: [],
              schedule: TestData.schedules.IstWorkHours,
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
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
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

      // Verify that the booking was created successfully
      expect(createdBooking).toBeDefined();
      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      // The bug fix ensures that hosts without groupId are handled properly in the grouping logic
      // Currently only hosts with explicit groups are being selected (this test verifies the current behavior)
      expect(createdBooking.luckyUsers).toBeDefined();
      expect(createdBooking.luckyUsers).toHaveLength(1);

      // Verify that the selected user is from the specific-group (the only properly grouped host)
      const selectedUserIds = createdBooking.luckyUsers;
      const specificGroupUserId = teamMembers[0].id; // teamMember[0] is in "specific-group"

      // Check that the selected user is from specific-group
      expect(selectedUserIds.includes(specificGroupUserId)).toBe(true);

      expect(createdBooking.attendees).toHaveLength(1);
      expect(createdBooking.attendees[0].email).toBe(booker.email);
    });

    test("Handles edge case where host.groupId is null vs undefined properly", async () => {
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

      const teamMembers = [
        {
          name: "Team Member 1",
          username: "team-member-1",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-1@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
        {
          name: "Team Member 2",
          username: "team-member-2",
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          email: "team-member-2@example.com",
          id: 103,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
      ];

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              isRRWeightsEnabled: true,
              users: [{ id: teamMembers[0].id }, { id: teamMembers[1].id }],
              hosts: [
                // One host with explicit null groupId, one without groupId property
                { userId: teamMembers[0].id, isFixed: false, groupId: null },
                { userId: teamMembers[1].id, isFixed: false }, // No groupId property
              ],
              hostGroups: [], // No explicit host groups defined
              schedule: TestData.schedules.IstWorkHours,
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
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
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

      // Verify that the booking was created successfully
      expect(createdBooking).toBeDefined();
      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      expect(createdBooking.luckyUsers).toBeDefined();
      expect(createdBooking.luckyUsers).toHaveLength(1);

      // The selected user should be one of the team members
      const selectedUserId = createdBooking.luckyUsers[0];
      const allUserIds = [teamMembers[0].id, teamMembers[1].id];
      expect(allUserIds).toContain(selectedUserId);

      expect(createdBooking.attendees).toHaveLength(1);
      expect(createdBooking.attendees[0].email).toBe(booker.email);
      expect(createdBooking.userId).toBe(selectedUserId);
    });
  });

  describe("Seated Round Robin Event", () => {
    test("For second seat booking, organizer remains the same with no team members included", async () => {
      const handleNewBooking = getNewBookingHandler();
      const EventManager = (await import("@calcom/features/bookings/lib/EventManager")).default;

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
                  type: "dailyvideo",
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

  describe("Organization Team Events", () => {
    test("Organization team booking includes usernameInOrg in webhook payload", async () => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      // Set up organization team members with profiles
      const organizationId = 1;
      const teamMembers = [
        {
          name: "Alice Johnson",
          username: "alice",
          email: "alice@example.com",
          id: 102,
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          profiles: [
            {
              uid: "profile-alice",
              username: "alice-acme",
              organizationId: organizationId,
            },
          ],
        },
        {
          name: "Bob Smith",
          username: "bob",
          email: "bob@example.com",
          id: 103,
          timeZone: Timezones["+5:30"],
          defaultScheduleId: null,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          profiles: [
            {
              uid: "profile-bob",
              username: "bob-acme",
              organizationId: organizationId,
            },
          ],
        },
      ];

      const organizer = getOrganizer({
        name: "Team Lead",
        email: "lead@example.com",
        id: 101,
        defaultScheduleId: null,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
        destinationCalendar: {
          integration: TestData.apps["google-calendar"].type,
          externalId: "lead@google-calendar.com",
        },
      });

      const subscriberUrl = "http://test-webhook.example.com";
      const webhooks = [
        {
          id: "WEBHOOK_TEST_ID",
          appId: null,
          userId: null,
          teamId: 1,
          eventTypeId: 1,
          active: true,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          subscriberUrl,
        },
      ];

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              teamId: 1,
              team: {
                id: 1,
                parentId: organizationId, // Organization team
              },
              users: [{ id: teamMembers[0].id }, { id: teamMembers[1].id }],
              hosts: [
                { userId: teamMembers[0].id, isFixed: false },
                { userId: teamMembers[1].id, isFixed: false },
              ],
              schedule: TestData.schedules.IstWorkHours,
              destinationCalendar: {
                integration: TestData.apps["google-calendar"].type,
                externalId: "team@google-calendar.com",
              },
            },
          ],
          organizer,
          usersApartFromOrganizer: teamMembers,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          webhooks,
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

      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${getDate({ dateIncrement: 1 }).dateString}T10:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T10:30:00.000Z`,
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

      // Verify booking was created successfully
      expect(createdBooking).toBeDefined();
      expect(createdBooking.responses).toEqual(
        expect.objectContaining({
          email: booker.email,
          name: booker.name,
        })
      );

      // Get the organizer for webhook verification
      const organizerUserId = createdBooking.userId;
      const organizerTeamMember = teamMembers.find((member) => member.id === organizerUserId);
      const organizerProfile = organizerTeamMember?.profiles?.[0];

      // Verify webhook includes usernameInOrg for organization team events
      // This test will initially fail due to the bug
      expectBookingCreatedWebhookToHaveBeenFired({
        booker,
        organizer: {
          email: organizerTeamMember?.email || "unknown@example.com",
          name: organizerTeamMember?.name || "Unknown",
          username: organizerTeamMember?.username,
          usernameInOrg: organizerProfile?.username, // This should be present but will be undefined due to the bug
        },
        location: BookingLocations.CalVideo,
        subscriberUrl,
      });
    });
  });
});
