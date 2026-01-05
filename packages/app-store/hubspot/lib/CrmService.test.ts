import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import type { z } from "zod";

import type { CredentialPayload } from "@calcom/types/Credential";

import { CrmFieldType, DateFieldType, WhenToWrite } from "../../_lib/crm-enums";
import type { appDataSchema } from "../zod";

type AppOptions = z.infer<typeof appDataSchema>;

// Create hoisted mocks that will be available before module imports
const { mockHubspotClient, mockGetAppKeysFromSlug }: {
  mockHubspotClient: {
    crm: {
      properties: { coreApi: { getAll: ReturnType<typeof vi.fn> } };
      contacts: { searchApi: { doSearch: ReturnType<typeof vi.fn> }; basicApi: { create: ReturnType<typeof vi.fn> } };
      objects: { meetings: { basicApi: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; archive: ReturnType<typeof vi.fn> } } };
      associations: { batchApi: { create: ReturnType<typeof vi.fn> } };
      owners: { ownersApi: { getPage: ReturnType<typeof vi.fn> } };
    };
    oauth: { tokensApi: { createToken: ReturnType<typeof vi.fn> } };
    setAccessToken: ReturnType<typeof vi.fn>;
  };
  mockGetAppKeysFromSlug: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => {
  const mockHubspotClient = {
    crm: {
      properties: {
        coreApi: {
          getAll: vi.fn(),
        },
      },
      contacts: {
        searchApi: {
          doSearch: vi.fn(),
        },
        basicApi: {
          create: vi.fn(),
        },
      },
      objects: {
        meetings: {
          basicApi: {
            create: vi.fn(),
            update: vi.fn(),
            archive: vi.fn(),
          },
        },
      },
      associations: {
        batchApi: {
          create: vi.fn(),
        },
      },
      owners: {
        ownersApi: {
          getPage: vi.fn(),
        },
      },
    },
    oauth: {
      tokensApi: {
        createToken: vi.fn(),
      },
    },
    setAccessToken: vi.fn(),
  };

  const mockGetAppKeysFromSlug = vi.fn().mockResolvedValue({
    client_id: "mock_client_id",
    client_secret: "mock_client_secret",
  });

  return { mockHubspotClient, mockGetAppKeysFromSlug };
});

vi.mock("@hubspot/api-client", () => {
  return {
    Client: class {
      crm = mockHubspotClient.crm;
      oauth = mockHubspotClient.oauth;
      setAccessToken = mockHubspotClient.setAccessToken;
    },
  };
});

vi.mock("../../_utils/getAppKeysFromSlug", () => ({
  default: mockGetAppKeysFromSlug,
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      update: vi.fn(),
    },
  },
}));

import HubspotCalendarService from "./CrmService";

describe("HubspotCalendarService", () => {
  let service: HubspotCalendarService;
  let mockTrackingRepository: {
    findByBookingUid: ReturnType<typeof vi.fn>;
  };
  let mockBookingRepository: {
    findBookingByUid: ReturnType<typeof vi.fn>;
  };

  setupAndTeardown();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));

    // Re-apply mock implementation for getAppKeysFromSlug (needed after clearAllMocks)
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "mock_client_id",
      client_secret: "mock_client_secret",
    });

    mockTrackingRepository = {
      findByBookingUid: vi.fn(),
    };

    mockBookingRepository = {
      findBookingByUid: vi.fn(),
    };

    const mockCredential: CredentialPayload = {
      id: 1,
      type: "hubspot_other_calendar",
      key: {
        accessToken: "mock_token",
        refreshToken: "mock_refresh",
        expiryDate: Date.now() + 3600000,
        tokenType: "Bearer",
      },
      userId: 1,
      appId: "hubspot",
      teamId: null,
      invalid: false,
      user: {
        email: "test-user@example.com",
      },
      delegationCredentialId: null,
    };

    service = new HubspotCalendarService(mockCredential, {});

    // @ts-expect-error - Injecting mock repositories for testing
    service.trackingRepository = mockTrackingRepository;
    // @ts-expect-error - Injecting mock repositories for testing
    service.bookingRepository = mockBookingRepository;
    // @ts-expect-error - Injecting mock hubspot client for testing
    service.hubspotClient = mockHubspotClient;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function mockAppOptions(appOptions: AppOptions): void {
    const appOptionsSpy = vi.spyOn(service, "getAppOptions");
    appOptionsSpy.mockReturnValue(appOptions);
  }

  describe("ensureFieldsExistOnMeeting", () => {
    it("should return intersection of requested fields with HubSpot properties", async () => {
      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [
          { name: "custom_field_1", type: "string" },
          { name: "custom_field_2", type: "string" },
          { name: "custom_field_3", type: "string" },
        ],
      });

      // @ts-expect-error - Testing private method
      const result = await service.ensureFieldsExistOnMeeting([
        "custom_field_1",
        "custom_field_2",
        "nonexistent_field",
      ]);

      expect(result).toEqual([
        { name: "custom_field_1", type: "string" },
        { name: "custom_field_2", type: "string" },
      ]);
      expect(mockHubspotClient.crm.properties.coreApi.getAll).toHaveBeenCalledWith("meetings");
    });

    it("should return subset when some fields are missing (graceful degradation)", async () => {
      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "existing_field", type: "string" }],
      });

      // @ts-expect-error - Testing private method
      const result = await service.ensureFieldsExistOnMeeting(["existing_field", "missing_field_1", "missing_field_2"]);

      expect(result).toEqual([{ name: "existing_field", type: "string" }]);
    });

    it("should return empty array when API throws error", async () => {
      mockHubspotClient.crm.properties.coreApi.getAll.mockRejectedValueOnce(new Error("API Error"));

      // @ts-expect-error - Testing private method
      const result = await service.ensureFieldsExistOnMeeting(["any_field"]);

      expect(result).toEqual([]);
    });

    it("should return empty array when no fields match", async () => {
      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "other_field", type: "string" }],
      });

      // @ts-expect-error - Testing private method
      const result = await service.ensureFieldsExistOnMeeting(["nonexistent_field"]);

      expect(result).toEqual([]);
    });
  });

  describe("getTextValueFromBookingTracking", () => {
    it("should return empty string when no tracking record exists", async () => {
      mockTrackingRepository.findByBookingUid.mockResolvedValueOnce(null);

      // @ts-expect-error - Testing private method
      const result = await service.getTextValueFromBookingTracking("{utm:source}", "booking-123", "utm_source_field");

      expect(result).toBe("");
      expect(mockTrackingRepository.findByBookingUid).toHaveBeenCalledWith("booking-123");
    });

    it("should return UTM value when tracking exists", async () => {
      mockTrackingRepository.findByBookingUid.mockResolvedValueOnce({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "summer_sale",
      });

      // @ts-expect-error - Testing private method
      const result = await service.getTextValueFromBookingTracking("{utm:source}", "booking-123", "utm_source_field");

      expect(result).toBe("google");
    });

    it("should return empty string when UTM key is missing from tracking", async () => {
      mockTrackingRepository.findByBookingUid.mockResolvedValueOnce({
        utm_source: "google",
      });

      // @ts-expect-error - Testing private method
      const result = await service.getTextValueFromBookingTracking("{utm:campaign}", "booking-123", "utm_campaign_field");

      expect(result).toBe("");
    });

    it("should handle different UTM parameters correctly", async () => {
      mockTrackingRepository.findByBookingUid.mockResolvedValue({
        utm_source: "facebook",
        utm_medium: "social",
        utm_campaign: "winter_promo",
        utm_term: "scheduling",
        utm_content: "banner_ad",
      });

      // @ts-expect-error - Testing private method
      const sourceResult = await service.getTextValueFromBookingTracking("{utm:source}", "booking-123", "field");
      // @ts-expect-error - Testing private method
      const mediumResult = await service.getTextValueFromBookingTracking("{utm:medium}", "booking-123", "field");
      // @ts-expect-error - Testing private method
      const campaignResult = await service.getTextValueFromBookingTracking("{utm:campaign}", "booking-123", "field");

      expect(sourceResult).toBe("facebook");
      expect(mediumResult).toBe("social");
      expect(campaignResult).toBe("winter_promo");
    });
  });

  describe("getTextValueFromBookingResponse", () => {
    it("should replace single placeholder with booking response value", () => {
      const calEventResponses = {
        name: { label: "Name", value: "John Doe" },
      };

      // @ts-expect-error - Testing private method
      const result = service.getTextValueFromBookingResponse("{name}", calEventResponses);

      expect(result).toBe("John Doe");
    });

    it("should replace multiple placeholders", () => {
      const calEventResponses = {
        name: { label: "Name", value: "John Doe" },
        email: { label: "Email", value: "john@example.com" },
      };

      // @ts-expect-error - Testing private method
      const result = service.getTextValueFromBookingResponse("{name} - {email}", calEventResponses);

      expect(result).toBe("John Doe - john@example.com");
    });

    it("should leave unknown placeholder as-is", () => {
      const calEventResponses = {
        name: { label: "Name", value: "John Doe" },
      };

      // @ts-expect-error - Testing private method
      const result = service.getTextValueFromBookingResponse("{unknown}", calEventResponses);

      expect(result).toBe("{unknown}");
    });

    it("should handle mixed known and unknown placeholders", () => {
      const calEventResponses = {
        name: { label: "Name", value: "John" },
      };

      // @ts-expect-error - Testing private method
      const result = service.getTextValueFromBookingResponse("Hello {name}, your {unknown} is ready", calEventResponses);

      expect(result).toBe("Hello John, your {unknown} is ready");
    });

    it("should convert non-string response values to string", () => {
      const calEventResponses = {
        count: { label: "Count", value: 42 },
        active: { label: "Active", value: true },
      };

      // @ts-expect-error - Testing private method
      const countResult = service.getTextValueFromBookingResponse("{count}", calEventResponses);
      // @ts-expect-error - Testing private method
      const activeResult = service.getTextValueFromBookingResponse("{active}", calEventResponses);

      expect(countResult).toBe("42");
      expect(activeResult).toBe("true");
    });
  });

  describe("getDateFieldValue", () => {
    it("should return ISO string for BOOKING_START_DATE with startTime", async () => {
      const startTime = "2024-01-20T14:00:00.000Z";

      // @ts-expect-error - Testing private method
      const result = await service.getDateFieldValue(DateFieldType.BOOKING_START_DATE, startTime, null);

      expect(result).toBe("2024-01-20T14:00:00.000Z");
    });

    it("should return null for BOOKING_START_DATE without startTime", async () => {
      // @ts-expect-error - Testing private method
      const result = await service.getDateFieldValue(DateFieldType.BOOKING_START_DATE, undefined, null);

      expect(result).toBeNull();
    });

    it("should return createdAt ISO for BOOKING_CREATED_DATE with valid booking", async () => {
      mockBookingRepository.findBookingByUid.mockResolvedValueOnce({
        id: 1,
        uid: "booking-123",
        createdAt: new Date("2024-01-10T09:00:00.000Z"),
      });

      // @ts-expect-error - Testing private method
      const result = await service.getDateFieldValue(DateFieldType.BOOKING_CREATED_DATE, undefined, "booking-123");

      expect(result).toBe("2024-01-10T09:00:00.000Z");
      expect(mockBookingRepository.findBookingByUid).toHaveBeenCalledWith({ bookingUid: "booking-123" });
    });

    it("should return null for BOOKING_CREATED_DATE with missing booking", async () => {
      mockBookingRepository.findBookingByUid.mockResolvedValueOnce(null);

      // @ts-expect-error - Testing private method
      const result = await service.getDateFieldValue(DateFieldType.BOOKING_CREATED_DATE, undefined, "nonexistent-booking");

      expect(result).toBeNull();
    });

    it("should return current time ISO for BOOKING_CANCEL_DATE", async () => {
      // @ts-expect-error - Testing private method
      const result = await service.getDateFieldValue(DateFieldType.BOOKING_CANCEL_DATE, undefined, null);

      expect(result).toBe("2024-01-15T10:00:00.000Z");
    });

    it("should return null for unknown date field type", async () => {
      // @ts-expect-error - Testing private method
      const result = await service.getDateFieldValue("UNKNOWN_DATE_TYPE", undefined, null);

      expect(result).toBeNull();
    });
  });

  describe("getFieldValue", () => {
    describe("CHECKBOX field type", () => {
      it("should return true for truthy value", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: true,
          fieldType: CrmFieldType.CHECKBOX,
          fieldName: "checkbox_field",
        });

        expect(result).toBe(true);
      });

      it("should return false for falsy value", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: false,
          fieldType: CrmFieldType.CHECKBOX,
          fieldName: "checkbox_field",
        });

        expect(result).toBe(false);
      });

      it("should coerce string to boolean", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "true",
          fieldType: CrmFieldType.CHECKBOX,
          fieldName: "checkbox_field",
        });

        expect(result).toBe(true);
      });
    });

    describe("DATE/DATETIME field types", () => {
      it("should delegate to getDateFieldValue for DATE type", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: DateFieldType.BOOKING_START_DATE,
          fieldType: CrmFieldType.DATE,
          startTime: "2024-01-20T14:00:00.000Z",
          fieldName: "date_field",
        });

        expect(result).toBe("2024-01-20T14:00:00.000Z");
      });

      it("should delegate to getDateFieldValue for DATETIME type", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: DateFieldType.BOOKING_CANCEL_DATE,
          fieldType: CrmFieldType.DATETIME,
          fieldName: "datetime_field",
        });

        expect(result).toBe("2024-01-15T10:00:00.000Z");
      });
    });

    describe("TEXT-like field types", () => {
      it("should return null if fieldValue is not a string", async () => {
        // @ts-expect-error - Testing private method with invalid fieldValue type
        const result = await service.getFieldValue({
          fieldValue: 123 as unknown as string,
          fieldType: CrmFieldType.TEXT,
          fieldName: "text_field",
        });

        expect(result).toBeNull();
      });

      it("should return static value unchanged when no braces", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "Static text value",
          fieldType: CrmFieldType.TEXT,
          fieldName: "text_field",
        });

        expect(result).toBe("Static text value");
      });

      it("should return UTM tracking value for UTM token", async () => {
        mockTrackingRepository.findByBookingUid.mockResolvedValueOnce({
          utm_source: "google",
        });

        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "{utm:source}",
          fieldType: CrmFieldType.TEXT,
          bookingUid: "booking-123",
          fieldName: "utm_field",
        });

        expect(result).toBe("google");
      });

      it("should return null for UTM token without bookingUid", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "{utm:source}",
          fieldType: CrmFieldType.TEXT,
          fieldName: "utm_field",
        });

        expect(result).toBeNull();
      });

      it("should return booking response value for response token", async () => {
        const calEventResponses = {
          name: { label: "Name", value: "John Doe" },
        };

        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "{name}",
          fieldType: CrmFieldType.TEXT,
          calEventResponses,
          fieldName: "name_field",
        });

        expect(result).toBe("John Doe");
      });

      it("should return null for response token without calEventResponses", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "{name}",
          fieldType: CrmFieldType.TEXT,
          fieldName: "name_field",
        });

        expect(result).toBeNull();
      });

      it("should return null when no replacement happened", async () => {
        const calEventResponses = {
          other: { label: "Other", value: "value" },
        };

        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "{unknown}",
          fieldType: CrmFieldType.TEXT,
          calEventResponses,
          fieldName: "unknown_field",
        });

        expect(result).toBeNull();
      });

      it("should work with STRING field type", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "Static string",
          fieldType: CrmFieldType.STRING,
          fieldName: "string_field",
        });

        expect(result).toBe("Static string");
      });

      it("should work with PHONE field type", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "+1234567890",
          fieldType: CrmFieldType.PHONE,
          fieldName: "phone_field",
        });

        expect(result).toBe("+1234567890");
      });

      it("should work with TEXTAREA field type", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "Multi-line\ntext\nvalue",
          fieldType: CrmFieldType.TEXTAREA,
          fieldName: "textarea_field",
        });

        expect(result).toBe("Multi-line\ntext\nvalue");
      });

      it("should work with CUSTOM field type", async () => {
        // @ts-expect-error - Testing private method
        const result = await service.getFieldValue({
          fieldValue: "Custom value",
          fieldType: CrmFieldType.CUSTOM,
          fieldName: "custom_field",
        });

        expect(result).toBe("Custom value");
      });
    });

    describe("unsupported field types", () => {
      it("should return null for unsupported field type", async () => {
        // @ts-expect-error - Testing private method with invalid type
        const result = await service.getFieldValue({
          fieldValue: "some value",
          fieldType: "UNSUPPORTED_TYPE" as unknown as CrmFieldType,
          fieldName: "unsupported_field",
        });

        expect(result).toBeNull();
      });
    });
  });

  describe("generateWriteToMeetingBody", () => {
    const mockEvent = {
      title: "Test Meeting",
      startTime: "2024-01-20T14:00:00.000Z",
      endTime: "2024-01-20T15:00:00.000Z",
      uid: "booking-123",
      responses: {
        name: { label: "Name", value: "John Doe" },
        email: { label: "Email", value: "john@example.com" },
      },
      organizer: {
        email: "organizer@example.com",
        name: "Organizer",
        language: {
          translate: (key: string) => key,
        },
      },
      attendees: [
        {
          email: "attendee@example.com",
          name: "Attendee",
          timeZone: "America/New_York",
        },
      ],
    };

    it("should return empty object when feature is disabled", async () => {
      mockAppOptions({});

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({});
    });

    it("should return empty object when onBookingWriteToEventObject is false", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: false,
        onBookingWriteToEventObjectFields: {
          custom_field: { fieldType: CrmFieldType.TEXT, value: "test", whenToWrite: WhenToWrite.EVERY_BOOKING },
        },
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({});
    });

    it("should return empty object when no fields are configured", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({});
    });

    it("should return object with validated field values when enabled", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          custom_name: { fieldType: CrmFieldType.TEXT, value: "{name}", whenToWrite: WhenToWrite.EVERY_BOOKING },
          custom_static: { fieldType: CrmFieldType.TEXT, value: "Static Value", whenToWrite: WhenToWrite.EVERY_BOOKING },
        },
      });

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [
          { name: "custom_name", type: "string" },
          { name: "custom_static", type: "string" },
        ],
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({
        custom_name: "John Doe",
        custom_static: "Static Value",
      });
    });

    it("should return empty object when ensureFieldsExistOnMeeting returns empty array", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          nonexistent_field: { fieldType: CrmFieldType.TEXT, value: "test", whenToWrite: WhenToWrite.EVERY_BOOKING },
        },
      });

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [],
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({});
    });

    it("should include null values in output when getFieldValue returns null", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          custom_field: { fieldType: CrmFieldType.TEXT, value: "{unknown}", whenToWrite: WhenToWrite.EVERY_BOOKING },
        },
      });

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "custom_field", type: "string" }],
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({
        custom_field: null,
      });
    });

    it("should handle checkbox field type", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          is_active: { fieldType: CrmFieldType.CHECKBOX, value: true, whenToWrite: WhenToWrite.EVERY_BOOKING },
        },
      });

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "is_active", type: "bool" }],
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({
        is_active: true,
      });
    });

    it("should handle date field type with booking start date", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          meeting_date: {
            fieldType: CrmFieldType.DATE,
            value: DateFieldType.BOOKING_START_DATE,
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "meeting_date", type: "date" }],
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({
        meeting_date: "2024-01-20T14:00:00.000Z",
      });
    });

    it("should handle UTM tracking fields", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          utm_source_field: { fieldType: CrmFieldType.TEXT, value: "{utm:source}", whenToWrite: WhenToWrite.EVERY_BOOKING },
        },
      });

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "utm_source_field", type: "string" }],
      });

      mockTrackingRepository.findByBookingUid.mockResolvedValueOnce({
        utm_source: "google_ads",
      });

      // @ts-expect-error - Testing private method
      const result = await service.generateWriteToMeetingBody(mockEvent);

      expect(result).toEqual({
        utm_source_field: "google_ads",
      });
    });
  });

  describe("getContacts", () => {
    it("should return contacts when found", async () => {
      mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
        results: [
          { id: "contact-1", properties: { email: "test@example.com" } },
          { id: "contact-2", properties: { email: "test2@example.com" } },
        ],
      });

      // Mock auth
      // @ts-expect-error - Mocking auth for testing
      service.auth = Promise.resolve({ getToken: vi.fn() });

      const result = await service.getContacts({ emails: ["test@example.com", "test2@example.com"] });

      expect(result).toEqual([
        { id: "contact-1", email: "test@example.com" },
        { id: "contact-2", email: "test2@example.com" },
      ]);
    });

    it("should handle single email string input", async () => {
      mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
        results: [{ id: "contact-1", properties: { email: "test@example.com" } }],
      });

      // @ts-expect-error - Mocking auth for testing
      service.auth = Promise.resolve({ getToken: vi.fn() });

      const result = await service.getContacts({ emails: "test@example.com" });

      expect(result).toEqual([{ id: "contact-1", email: "test@example.com" }]);
    });

    it("should return empty array when no contacts found", async () => {
      mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
        results: [],
      });

      // @ts-expect-error - Mocking auth for testing
      service.auth = Promise.resolve({ getToken: vi.fn() });

      const result = await service.getContacts({ emails: "nonexistent@example.com" });

      expect(result).toEqual([]);
    });
  });
});
