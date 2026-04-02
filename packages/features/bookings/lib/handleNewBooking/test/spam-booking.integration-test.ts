import {
  BookingLocations,
  createBookingScenario,
  createOrganization,
  getBooker,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToCrashOnGetAvailability,
  mockCalendarToHaveNoBusySlots,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { prisma } from "@calcom/prisma";
import { BookingStatus, WatchlistType } from "@calcom/prisma/enums";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

const createTestWatchlistEntry = async (overrides: {
  type: WatchlistType;
  value: string;
  organizationId: number | null;
  action: "BLOCK" | "REPORT";
}) => {
  return prisma.watchlist.create({
    data: {
      type: overrides.type,
      value: overrides.value,
      action: overrides.action,
      createdById: 0,
      organizationId: overrides.organizationId,
      isGlobal: overrides.organizationId !== null ? false : true,
    },
  });
};

const createGlobalWatchlistEntry = async (overrides: {
  type: WatchlistType;
  value: string;
  action: "BLOCK" | "REPORT";
}) => {
  return createTestWatchlistEntry({
    type: overrides.type,
    value: overrides.value,
    action: overrides.action,
    organizationId: null,
  });
};

const createOrganizationWatchlistEntry = async (
  organizationId: number,
  overrides: {
    type: WatchlistType;
    value: string;
    action: "BLOCK" | "REPORT";
  }
) => {
  return createTestWatchlistEntry({
    type: overrides.type,
    value: overrides.value,
    action: overrides.action,
    organizationId,
  });
};

const expectDecoyBookingResponse = (booking: Record<string, unknown>) => {
  expect(booking).toHaveProperty("isShortCircuitedBooking", true);
  expect(booking).toHaveProperty("uid");
  expect(booking.uid).toBeTruthy();
  expect(booking).toHaveProperty("status", BookingStatus.ACCEPTED);
  expect(booking).toHaveProperty("id", 0);
};

const expectNoBookingInDatabase = async (bookerEmail: string) => {
  const bookings = await prisma.booking.findMany({
    where: {
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
  });
  expect(bookings).toHaveLength(0);
};

describe("handleNewBooking - Spam Detection", () => {
  setupAndTeardown();

  describe("Global Watchlist Blocking:", () => {
    test(
      "should block booking when email is in global watchlist and return decoy response",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedEmail = "spammer@example.com";

        const booker = getBooker({
          email: blockedEmail,
          name: "Blocked Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        await createGlobalWatchlistEntry({
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
        });

        console.log("watchlists", await prisma.watchlist.findMany());

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
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
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

        expectDecoyBookingResponse(createdBooking);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
        await expectNoBookingInDatabase(blockedEmail);
      },
      timeout
    );

    test(
      "should fail with there are no available users instead of returning decoy response because spam check happens in parallel with availability check",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedEmail = "spammer@example.com";

        const booker = getBooker({
          email: blockedEmail,
          name: "Blocked Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        await createGlobalWatchlistEntry({
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
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
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        await mockCalendarToCrashOnGetAvailability("googlecalendar");

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        await expect(async () => {
          await handleNewBooking({
            bookingData: mockBookingData,
          });
        }).rejects.toThrow("no_available_users_found_error");
      },
      timeout
    );

    test(
      "should block booking when domain is in global watchlist and return decoy response",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedDomain = "globalspammydomain.com";
        const blockedEmail = `user@${blockedDomain}`;

        const booker = getBooker({
          email: blockedEmail,
          name: "Global Domain Blocked Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        await createGlobalWatchlistEntry({
          type: WatchlistType.DOMAIN,
          value: blockedDomain,
          action: "BLOCK",
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
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
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

        expectDecoyBookingResponse(createdBooking);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
        await expectNoBookingInDatabase(blockedEmail);
      },
      timeout
    );

    test(
      "should allow booking when spamCheckService.startCheck throws error (fail-open behavior)",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const bookerEmail = "failopen@example.com";

        const booker = getBooker({
          email: bookerEmail,
          name: "Fail Open Booker",
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
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        // Mock the SpamCheckService to throw an error during isBlocked check
        const { getSpamCheckService } = await import(
          "@calcom/features/di/watchlist/containers/SpamCheckService.container"
        );
        const spamCheckService = getSpamCheckService();
        const originalIsBlocked = spamCheckService["isBlocked"].bind(spamCheckService);

        // Use vi.spyOn to mock the private method
        const isBlockedSpy = vi.spyOn(spamCheckService as never, "isBlocked");
        isBlockedSpy.mockRejectedValue(new Error("Database connection failed"));

        try {
          const createdBooking = await handleNewBooking({
            bookingData: mockBookingData,
          });

          // Should NOT be a decoy response - booking should succeed due to fail-open behavior
          expect(createdBooking).not.toHaveProperty("isShortCircuitedBooking");
          expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);
          expect(createdBooking.id).not.toBe(0);
          expect(createdBooking.attendees[0].email).toBe(bookerEmail);
        } finally {
          // Restore original implementation and clean up spy
          isBlockedSpy.mockRestore();
          spamCheckService["isBlocked"] = originalIsBlocked;
        }
      },
      timeout
    );
  });

  describe("Organization Watchlist Blocking:", () => {
    test(
      "should block booking when email is in organization watchlist and return decoy response",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedEmail = "org-spammer@example.com";

        // Create organization with a team
        const org = await createOrganization({
          name: "Test Org",
          slug: "test-org",
          withTeam: true,
        });

        const booker = getBooker({
          email: blockedEmail,
          name: "Org Blocked Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          organizationId: org.id,
        });

        await createOrganizationWatchlistEntry(org.id, {
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
        });

        // Use the child team ID for the eventType
        const teamId = org.children && org.children.length > 0 ? org.children[0].id : null;

        await createBookingScenario(
          getScenarioData(
            {
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  teamId,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            },
            { id: org.id }
          )
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
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

        expectDecoyBookingResponse(createdBooking);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
        await expectNoBookingInDatabase(blockedEmail);
      },
      timeout
    );

    test(
      "should block booking when domain is in organization watchlist and return decoy response",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedDomain = "spammydomain.com";
        const blockedEmail = `user@${blockedDomain}`;

        // Create organization with a team
        const org = await createOrganization({
          name: "Test Org",
          slug: "test-org",
          withTeam: true,
        });

        const booker = getBooker({
          email: blockedEmail,
          name: "Domain Blocked Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          organizationId: org.id,
        });

        await createOrganizationWatchlistEntry(org.id, {
          type: WatchlistType.DOMAIN,
          value: blockedDomain,
          action: "BLOCK",
        });

        // Use the child team ID for the eventType
        const teamId = org.children && org.children.length > 0 ? org.children[0].id : null;

        await createBookingScenario(
          getScenarioData(
            {
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  teamId,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            },
            { id: org.id }
          )
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
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

        expectDecoyBookingResponse(createdBooking);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
        await expectNoBookingInDatabase(blockedEmail);
      },
      timeout
    );

    test(
      "should NOT block booking when email is in a different organization's watchlist",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedEmail = "different-org-user@example.com";

        // Create two different organizations with teams
        const organizerOrg = await createOrganization({
          name: "Organizer Org",
          slug: "organizer-org",
          withTeam: true,
        });

        const differentOrg = await createOrganization({
          name: "Different Org",
          slug: "different-org",
          withTeam: true,
        });

        const booker = getBooker({
          email: blockedEmail,
          name: "Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          organizationId: organizerOrg.id,
        });

        // Block email in a DIFFERENT organization
        await createOrganizationWatchlistEntry(differentOrg.id, {
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
        });

        // Use the child team ID for the eventType
        const teamId =
          organizerOrg.children && organizerOrg.children.length > 0 ? organizerOrg.children[0].id : null;

        await createBookingScenario(
          getScenarioData(
            {
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  teamId,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            },
            { id: organizerOrg.id }
          )
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
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

        // Should NOT be a decoy response - booking should succeed
        expect(createdBooking).not.toHaveProperty("isShortCircuitedBooking");
        expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);
        expect(createdBooking.id).not.toBe(0);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
      },
      timeout
    );

    test(
      "should block booking for managed event when email is in organization watchlist",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedEmail = "managed-event-spammer@example.com";

        // Create organization with a team
        const org = await createOrganization({
          name: "Managed Event Org",
          slug: "managed-event-org",
          withTeam: true,
        });

        const booker = getBooker({
          email: blockedEmail,
          name: "Managed Event Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          organizationId: org.id,
        });

        await createOrganizationWatchlistEntry(org.id, {
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
        });

        // Get the child team ID
        const teamId = org.children && org.children.length > 0 ? org.children[0].id : null;

        // Create a parent event type and a managed (child) event type
        await createBookingScenario(
          getScenarioData(
            {
              eventTypes: [
                // Parent event type
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  teamId,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
                // Managed event type (child) - has parent but no teamId
                {
                  id: 2,
                  slotInterval: 30,
                  length: 30,
                  parent: { id: 1 }, // References parent event type
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            },
            { id: org.id }
          )
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        // Try to book the managed event (id: 2)
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 2, // Booking the managed event
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

        // Should return a decoy response since email is blocked in the organization
        expectDecoyBookingResponse(createdBooking);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
        await expectNoBookingInDatabase(blockedEmail);
      },
      timeout
    );

    test(
      "should block booking for user event in organization when email is in organization watchlist",
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const blockedEmail = "user-event-spammer@example.com";

        // Create organization
        const org = await createOrganization({
          name: "User Event Org",
          slug: "user-event-org",
          withTeam: false,
        });

        const booker = getBooker({
          email: blockedEmail,
          name: "User Event Booker",
        });

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          organizationId: org.id,
        });

        await createOrganizationWatchlistEntry(org.id, {
          type: WatchlistType.EMAIL,
          value: blockedEmail,
          action: "BLOCK",
        });

        // Create a user event (no teamId) but with a profile linking to the organization
        await createBookingScenario(
          getScenarioData(
            {
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  // User Event Type has userId set
                  userId: 101,
                },
              ],
              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            },
            { id: org.id }
          )
        );

        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
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

        // Should return a decoy response since email is blocked in the organization
        expectDecoyBookingResponse(createdBooking);
        expect(createdBooking.attendees[0].email).toBe(blockedEmail);
        await expectNoBookingInDatabase(blockedEmail);
      },
      timeout
    );
  });
});
