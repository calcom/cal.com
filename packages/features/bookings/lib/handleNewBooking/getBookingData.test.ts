import { OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { getBookingData } from "./getBookingData";
import type { getEventTypeResponse } from "./getEventTypesFromDB";

// Mock the dependencies
vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn().mockReturnValue({
    userFieldsResponses: {},
    responses: {},
  }),
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: Function) => fn,
}));

const createMockEventType = (overrides: Partial<getEventTypeResponse> = {}): getEventTypeResponse => {
  return {
    id: 1,
    length: 30,
    bookingFields: [
      { name: "name", type: "name", required: true },
      { name: "email", type: "email", required: true },
      { name: "location", type: "radioInput", required: false },
    ],
    customInputs: [],
    seatsPerTimeSlot: null,
    ...overrides,
  } as getEventTypeResponse;
};

const createMockSchema = () => {
  return z.object({
    eventTypeId: z.number(),
    start: z.string(),
    end: z.string().optional(),
    timeZone: z.string(),
    language: z.string(),
    metadata: z.record(z.string()),
    responses: z.object({
      name: z.string(),
      email: z.string(),
      location: z
        .object({
          value: z.string(),
          optionValue: z.string().optional(),
        })
        .optional(),
      attendeePhoneNumber: z.string().optional(),
      guests: z.array(z.string()).optional(),
      smsReminderNumber: z.string().optional(),
      notes: z.string().optional(),
      rescheduleReason: z.string().optional(),
    }),
  });
};

describe("getBookingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("location extraction", () => {
    it("should ignore optionValue when location type is OrganizerDefaultConferencingAppType", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          location: {
            value: OrganizerDefaultConferencingAppType, // "conferencing"
            optionValue: "+15551234567", // Phone number that should be ignored
          },
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      // The location should be the conferencing type, NOT the phone number
      expect(result.location).toBe(OrganizerDefaultConferencingAppType);
      expect(result.location).not.toBe("+15551234567");
    });

    it("should use optionValue for non-OrganizerDefaultConferencingAppType locations", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          location: {
            value: "phone",
            optionValue: "+15551234567",
          },
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      // For phone location type, optionValue should be used
      expect(result.location).toBe("+15551234567");
    });

    it("should fall back to value when optionValue is empty for non-conferencing locations", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          location: {
            value: "integrations:daily",
            optionValue: "",
          },
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      // Should fall back to value when optionValue is empty
      expect(result.location).toBe("integrations:daily");
    });

    it("should return empty string when location is not provided", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          // No location provided
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.location).toBe("");
    });

    it("should use OrganizerDefaultConferencingAppType value even when optionValue contains meeting URL", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          location: {
            value: OrganizerDefaultConferencingAppType,
            optionValue: "https://meet.google.com/abc-defg-hij", // Should be ignored
          },
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      // The location should be the conferencing type, NOT the URL
      expect(result.location).toBe(OrganizerDefaultConferencingAppType);
    });
  });

  describe("end time auto-calculation", () => {
    it("should auto-set end time from start + eventType.length when end is not provided", async () => {
      const mockEventType = createMockEventType({ length: 45 });
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.end).toBe("2024-01-15T10:45:00Z");
    });

    it("should preserve explicitly provided end time", async () => {
      const mockEventType = createMockEventType({ length: 30 });
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T11:00:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.end).toBe("2024-01-15T11:00:00.000Z");
    });
  });

  describe("response field mapping", () => {
    it("should extract name and email from responses", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "John Doe",
          email: "john@example.com",
          notes: "Please call me 5 min early",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.name).toBe("John Doe");
      expect(result.email).toBe("john@example.com");
      expect(result.notes).toBe("Please call me 5 min early");
    });

    it("should default notes to empty string when not provided", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.notes).toBe("");
    });

    it("should default guests to empty array when not provided", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.guests).toEqual([]);
    });

    it("should pass through guests array from responses", async () => {
      const schema = z.object({
        eventTypeId: z.number(),
        start: z.string(),
        end: z.string().optional(),
        timeZone: z.string(),
        language: z.string(),
        metadata: z.record(z.string()),
        responses: z.object({
          name: z.string(),
          email: z.string(),
          guests: z.array(z.string()).optional(),
        }),
      });

      const mockEventType = createMockEventType();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          guests: ["guest1@example.com", "guest2@example.com"],
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.guests).toEqual(["guest1@example.com", "guest2@example.com"]);
    });

    it("should extract attendeePhoneNumber from responses", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          attendeePhoneNumber: "+15559876543",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.attendeePhoneNumber).toBe("+15559876543");
    });

    it("should extract rescheduleReason from responses", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
          rescheduleReason: "Conflicting meeting",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.rescheduleReason).toBe("Conflicting meeting");
    });

    it("should set customInputs to undefined when using responses path", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
        },
      };

      const result = await getBookingData({
        reqBody,
        eventType: mockEventType,
        schema,
      });

      expect(result.customInputs).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should throw when responses is nullish", async () => {
      const mockEventType = createMockEventType();
      const schema = z.object({
        eventTypeId: z.number(),
        start: z.string(),
        end: z.string().optional(),
        timeZone: z.string(),
        language: z.string(),
        metadata: z.record(z.string()),
        responses: z
          .object({
            name: z.string(),
            email: z.string(),
          })
          .nullish(),
      });

      const reqBody = {
        eventTypeId: 1,
        start: "2024-01-15T10:00:00.000Z",
        end: "2024-01-15T10:30:00.000Z",
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: null,
      };

      await expect(
        getBookingData({
          reqBody,
          eventType: mockEventType,
          schema,
        })
      ).rejects.toThrow("`responses` must not be nullish");
    });

    it("should throw on schema validation failure", async () => {
      const mockEventType = createMockEventType();
      const schema = createMockSchema();

      const reqBody = {
        // Missing required 'start' field
        eventTypeId: 1,
        timeZone: "America/New_York",
        language: "en",
        metadata: {},
        responses: {
          name: "Test User",
          email: "test@example.com",
        },
      };

      await expect(
        getBookingData({
          reqBody,
          eventType: mockEventType,
          schema,
        })
      ).rejects.toThrow();
    });
  });
});
