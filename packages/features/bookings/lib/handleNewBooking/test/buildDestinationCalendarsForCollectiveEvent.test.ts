import { describe, it, expect } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

import { buildDestinationCalendarsForCollectiveEvent } from "../../handleNewBooking";

describe("buildDestinationCalendarsForCollectiveEvent", () => {
  const mockOrganizerUser = { email: "organizer@example.com" };

  const mockUser1 = {
    id: 1,
    name: "User 1",
    timeZone: "America/New_York",
    locale: "en",
    email: "user1@example.com",
    destinationCalendar: {
      id: 1,
      userId: 1,
      integration: "google_calendar",
      externalId: "user1-cal-id",
      credentialId: 1,
      primaryEmail: "user1@example.com",
      eventTypeId: null,
      bookingId: null,
      delegationCredentialId: null,
      domainWideDelegationCredentialId: null,
    },
  };

  const mockUser2 = {
    id: 2,
    name: "User 2",
    timeZone: "America/Los_Angeles",
    locale: "en",
    email: "user2@example.com",
    destinationCalendar: {
      id: 2,
      userId: 2,
      integration: "google_calendar",
      externalId: "user2-cal-id",
      credentialId: 2,
      primaryEmail: "user2@example.com",
      eventTypeId: null,
      bookingId: null,
      delegationCredentialId: null,
      domainWideDelegationCredentialId: null,
    },
  };

  const mockUser3 = {
    id: 3,
    name: "User 3",
    timeZone: "Europe/London",
    locale: "en",
    email: "user3@example.com",
    destinationCalendar: null, // User without destination calendar
  };

  const mockOriginalDestinationCalendar = [
    {
      id: 100,
      userId: 100,
      integration: "google_calendar",
      externalId: "organizer-cal-id",
      credentialId: 100,
      primaryEmail: "organizer@example.com",
      eventTypeId: null,
      bookingId: null,
      delegationCredentialId: null,
      domainWideDelegationCredentialId: null,
    },
  ];

  describe("collective events", () => {
    it("should include all users' destination calendars for collective events", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [mockUser1, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(3); // Original + 2 users
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]); // Original calendar preserved
      expect(result[1]).toMatchObject({
        userId: 1,
        integration: "google_calendar",
        externalId: "user1-cal-id",
      });
      expect(result[2]).toMatchObject({
        userId: 2,
        integration: "google_calendar",
        externalId: "user2-cal-id",
      });
    });

    it("should handle users without destination calendars gracefully", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [mockUser1, mockUser3], // mockUser3 has no destination calendar
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(2); // Original + 1 user (mockUser3 skipped)
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
      expect(result[1]).toMatchObject({
        userId: 1,
        integration: "google_calendar",
        externalId: "user1-cal-id",
      });
    });

    it("should deduplicate calendars based on userId and integration", () => {
      const duplicateUser = {
        ...mockUser2,
        id: 999, // Different ID but same calendar details
        destinationCalendar: {
          ...mockUser2.destinationCalendar!,
          id: 999,
          userId: 2, // Same userId as mockUser2
          integration: "google_calendar", // Same integration as mockUser2
          delegationCredentialId: null,
          domainWideDelegationCredentialId: null,
        },
      };

      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [mockUser1, mockUser2, duplicateUser],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(3); // Original + 2 unique calendars (duplicate filtered out)
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
      expect(result[1]).toMatchObject({
        userId: 1,
        integration: "google_calendar",
      });
      expect(result[2]).toMatchObject({
        userId: 2,
        integration: "google_calendar",
      });
    });

    it("should exclude organizer from team member calendars", () => {
      const organizerAsUser = {
        ...mockUser1,
        email: "organizer@example.com", // Same as organizer
      };

      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [organizerAsUser, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(2); // Original + 1 user (organizer excluded)
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
      expect(result[1]).toMatchObject({
        userId: 2,
        integration: "google_calendar",
      });
    });

    it("should work without original destination calendar", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [mockUser1, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: null,
      });

      expect(result).toHaveLength(2); // Only user calendars
      expect(result[0]).toMatchObject({
        userId: 1,
        integration: "google_calendar",
      });
      expect(result[1]).toMatchObject({
        userId: 2,
        integration: "google_calendar",
      });
    });

    it("should early return when no users have destination calendars", () => {
      const usersWithoutCalendars = [
        { ...mockUser3, email: "user1@example.com" },
        { ...mockUser3, email: "user2@example.com" },
      ];

      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: usersWithoutCalendars,
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(1); // Only original calendar
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
    });
  });

  describe("non-collective events", () => {
    it("should only return original destination calendar for round robin events", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.ROUND_ROBIN },
        users: [mockUser1, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(1); // Only original calendar
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
    });

    it("should only return original destination calendar for managed events", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.MANAGED },
        users: [mockUser1, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(1); // Only original calendar
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
    });

    it("should return empty array for non-collective events without original calendar", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.ROUND_ROBIN },
        users: [mockUser1, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: null,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle null scheduling type", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: null },
        users: [mockUser1, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(1); // Only original calendar
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
    });

    it("should handle empty users array", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(1); // Only original calendar
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
    });

    it("should handle empty original destination calendar array", () => {
      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [mockUser1, mockUser2],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: [],
      });

      expect(result).toHaveLength(2); // Only user calendars
      expect(result[0]).toMatchObject({
        userId: 1,
        integration: "google_calendar",
      });
      expect(result[1]).toMatchObject({
        userId: 2,
        integration: "google_calendar",
      });
    });

    it("should handle mixed integrations", () => {
      const outlookUser = {
        ...mockUser2,
        destinationCalendar: {
          ...mockUser2.destinationCalendar!,
          integration: "outlook_calendar",
          delegationCredentialId: null,
          domainWideDelegationCredentialId: null,
        },
      };

      const result = buildDestinationCalendarsForCollectiveEvent({
        eventType: { schedulingType: SchedulingType.COLLECTIVE },
        users: [mockUser1, outlookUser],
        organizerUser: mockOrganizerUser,
        originalDestinationCalendar: mockOriginalDestinationCalendar,
      });

      expect(result).toHaveLength(3); // Original + 2 different integrations
      expect(result[0]).toEqual(mockOriginalDestinationCalendar[0]);
      expect(result[1]).toMatchObject({
        userId: 1,
        integration: "google_calendar",
      });
      expect(result[2]).toMatchObject({
        userId: 2,
        integration: "outlook_calendar",
      });
    });
  });
});
