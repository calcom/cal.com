import {
  getDate,
  createBookingScenario,
  Timezones,
  TestData,
  mockCalendar,
  createDelegationCredential,
  createOrganization,
  getOrganizer,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { expectNoAttemptToGetAvailability } from "@calcom/testing/lib/bookingScenario/expects";

import { describe, test } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { MembershipRole } from "@calcom/prisma/enums";

import { expect, expectedSlotsForSchedule } from "./expects";
import { setupAndTeardown } from "./setupAndTeardown";

describe("getSchedule", () => {
  const availableSlotsService = getAvailableSlotsService();
  setupAndTeardown();

  describe("Delegation Credential", () => {
    test("correctly identifies unavailable slots using DelegationCredential credentials", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      const payloadToMakePartOfOrganization = [
        {
          membership: {
            accepted: true,
            role: MembershipRole.ADMIN,
          },
          team: {
            id: org.id,
            name: "Test Org",
            slug: "testorg",
          },
        },
      ];

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        selectedCalendars: [TestData.selectedCalendars.google],
        // User must be part of organization to be able to use that organization's Delegation credential
        teams: payloadToMakePartOfOrganization,
        // No regular credentials provided
        credentials: [],
      });

      await createDelegationCredential(org.id);

      const googleCalendarMock = await mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [
          {
            start: `${plus2DateString}T04:45:00.000Z`,
            end: `${plus2DateString}T23:00:00.000Z`,
          },
        ],
      });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: organizer.id,
              },
            ],
          },
        ],
        users: [organizer],
        apps: [TestData.apps["google-calendar"]],
      };

      await createBookingScenario(scenarioData);
      const scheduleForDayWithAGoogleCalendarBooking = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
      expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots([`04:00:00.000Z`], {
        dateString: plus2DateString,
      });
    });

    test("fails to get schedule when user isn't part of the organization with Delegation credential", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      const anotherOrg = await createOrganization({
        name: "Another Org",
        slug: "anotherorg",
      });

      // User is part of a different org
      const payloadToMakePartOfDifferentOrganization = [
        {
          membership: {
            accepted: true,
            role: MembershipRole.ADMIN,
          },
          team: {
            id: anotherOrg.id,
            name: "Another Org",
            slug: "anotherorg",
          },
        },
      ];

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        selectedCalendars: [TestData.selectedCalendars.google],
        teams: payloadToMakePartOfDifferentOrganization,
        credentials: [],
      });

      // Create Delegation credential for the org user isn't part of
      await createDelegationCredential(org.id);

      const googleCalendarMock = await mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [
          {
            start: `${plus2DateString}T04:45:00.000Z`,
            end: `${plus2DateString}T23:00:00.000Z`,
          },
        ],
      });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            users: [
              {
                id: organizer.id,
              },
            ],
          },
        ],
        users: [organizer],
        apps: [TestData.apps["google-calendar"]],
      };

      await createBookingScenario(scenarioData);
      const scheduleForDayWithAGoogleCalendarBooking = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expectNoAttemptToGetAvailability(googleCalendarMock);

      // All slots would be available as no DelegationCredential credentials are available
      expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots(
        expectedSlotsForSchedule.IstWorkHours.interval["1hr"].allPossibleSlotsStartingAt430,
        {
          dateString: plus2DateString,
        }
      );
    });
  });
});
