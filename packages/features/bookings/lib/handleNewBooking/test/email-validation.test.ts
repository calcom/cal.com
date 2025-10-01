import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  enableEmailValidationForTeam,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulBookingCreationEmails,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { vi, beforeEach, describe, expect } from "vitest";

import { RedisService } from "@calcom/features/redis/RedisService";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

// Mock Redis Service
vi.mock("@calcom/features/redis/RedisService");

const mockRedisService = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
};

// Mock ZeroBounce API responses
const mockZeroBounceResponses: Record<string, unknown> = {};
const zeroBounceAPIKey = "test-api-key";
// Override global fetch for ZeroBounce API
globalThis.fetch = vi.fn().mockImplementation((url: string | URL) => {
  const urlString = url.toString();
  if (urlString.includes("zerobounce.net/v2/validate")) {
    if (!urlString.includes("api_key=" + zeroBounceAPIKey)) {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      } as Response);
    }
    const urlObj = new URL(urlString);
    const email = urlObj.searchParams.get("email") || "";

    const response = mockZeroBounceResponses[email] || {
      address: email,
      status: "valid",
      sub_status: "",
      free_email: false,
      processed_at: "2023-12-07 10:00:00.000",
    };

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    } as Response);
  }

  return Promise.resolve({
    ok: false,
    status: 404,
  } as Response);
});

setupAndTeardown();

describe("Email Validation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockZeroBounceResponses).forEach((key) => delete mockZeroBounceResponses[key]);
    process.env.ZEROBOUNCE_API_KEY = zeroBounceAPIKey;

    // Setup Redis mock implementation
    vi.mocked(RedisService).mockImplementation(() => mockRedisService as unknown as RedisService);

    // Configure Redis mock to return null by default (cache miss)
    mockRedisService.get.mockResolvedValue(null);
    mockRedisService.set.mockResolvedValue(undefined);

    // Enable email validation feature for team with id 1 (used in tests)
    await enableEmailValidationForTeam(1);
  });

  test("should create booking successfully with valid email", async ({ emails }) => {
    const handleNewBooking = getNewBookingHandler();
    const booker = getBooker({
      email: "valid-user@example.com",
      name: "Valid User",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
      destinationCalendar: {
        integration: TestData.apps["google-calendar"].type,
        externalId: "organizer@example.com",
      },
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            teamId: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
          },
        ],
        organizer,
        apps: [TestData.apps["google-calendar"]],
      })
    );

    // Mock valid email response
    mockZeroBounceResponses["valid-user@example.com"] = {
      address: "valid-user@example.com",
      status: "valid",
      sub_status: "",
    };

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: { id: "google_calendar_event_id" },
    });

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "New York" },
        },
      },
    });

    const createdBooking = await handleNewBooking({
      bookingData: mockBookingData,
    });

    expect(createdBooking.responses).toMatchObject({
      name: booker.name,
      email: booker.email,
    });

    await expectBookingToBeInDatabase({
      description: "",
      uid: createdBooking.uid!,
      eventTypeId: mockBookingData.eventTypeId,
      status: BookingStatus.ACCEPTED,
    });

    expectSuccessfulBookingCreationEmails({
      booking: { uid: createdBooking.uid! },
      booker,
      organizer,
      emails,
      iCalUID: createdBooking.iCalUID,
    });
  });

  test("should reject booking with invalid email from ZeroBounce, initiating validation request immediately in parallel to availability check", async () => {
    const handleNewBooking = getNewBookingHandler();
    const booker = getBooker({
      email: "invalid@nonexistent-domain.fake",
      name: "Invalid User",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: { id: "google_calendar_event_id" },
      // Slow down availability check to 5 seconds to ensure that validation failure would happen before availability check
      getAvailabilitySlowDownTime: 5000,
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            teamId: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
          },
        ],
        organizer,
        apps: [TestData.apps["google-calendar"]],
      })
    );

    // Mock invalid email response
    mockZeroBounceResponses["invalid@nonexistent-domain.fake"] = {
      address: "invalid@nonexistent-domain.fake",
      status: "invalid",
      sub_status: "mailbox_not_found",
    };

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "New York" },
        },
      },
    });

    const newBookingPromise = handleNewBooking({
      bookingData: mockBookingData,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(fetch).toHaveBeenCalled();

    // Now with email validation feature enabled, invalid emails should be rejected
    await expect(newBookingPromise).rejects.toThrow("Unable to create booking with this email address.");
  }, 7000);

  test("should fallback to allow booking when ZeroBounce API fails", async ({ emails }) => {
    const handleNewBooking = getNewBookingHandler();
    const booker = getBooker({
      email: "fallback@example.com",
      name: "Fallback User",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
      destinationCalendar: {
        integration: TestData.apps["google-calendar"].type,
        externalId: "organizer@example.com",
      },
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            teamId: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
          },
        ],
        organizer,
        apps: [TestData.apps["google-calendar"]],
      })
    );

    // Mock ZeroBounce API to fail with network error for this specific email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.fetch as any).mockImplementation((url: string | URL) => {
      const urlString = url.toString();
      if (urlString.includes("zerobounce.net/v2/validate")) {
        return Promise.reject(new Error("Network error: Failed to connect to ZeroBounce API"));
      }

      return Promise.resolve({
        ok: false,
        status: 404,
      } as Response);
    });

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: { id: "google_calendar_event_id" },
    });

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "New York" },
        },
      },
    });

    // Should succeed because it falls back to allowing the booking when API fails
    const createdBooking = await handleNewBooking({
      bookingData: mockBookingData,
    });

    expect(createdBooking.responses).toMatchObject({
      name: booker.name,
      email: booker.email,
    });

    await expectBookingToBeInDatabase({
      description: "",
      uid: createdBooking.uid!,
      eventTypeId: mockBookingData.eventTypeId,
      status: BookingStatus.ACCEPTED,
    });

    expectSuccessfulBookingCreationEmails({
      booking: { uid: createdBooking.uid! },
      booker,
      organizer,
      emails,
      iCalUID: createdBooking.iCalUID,
    });
  });

  test("should use cached email validation result from Redis", async () => {
    const handleNewBooking = getNewBookingHandler();
    const booker = getBooker({
      email: "cached-user@example.com",
      name: "Cached User",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
      destinationCalendar: {
        integration: TestData.apps["google-calendar"].type,
        externalId: "organizer@example.com",
      },
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            teamId: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
          },
        ],
        organizer,
        apps: [TestData.apps["google-calendar"]],
      })
    );

    const cachedResult = {
      email: "cached-user@example.com",
      status: "invalid",
    };

    mockRedisService.get.mockResolvedValue(cachedResult);

    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: { id: "google_calendar_event_id" },
    });

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "New York" },
        },
      },
    });

    await expect(
      handleNewBooking({
        bookingData: mockBookingData,
      })
    ).rejects.toThrow("Unable to create booking with this email address.");

    expect(mockRedisService.get).toHaveBeenCalledWith("email_validation:cached-user@example.com");
  });
});
