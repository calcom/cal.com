import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";
import type { TFunction } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { CrmFieldType, DateFieldType, WhenToWrite } from "../../_lib/crm-enums";
import type { appDataSchema } from "../zod";

type AppOptions = z.infer<typeof appDataSchema>;

// Create hoisted mocks that will be available before module imports
const {
  mockHubspotClient,
  mockGetAppKeysFromSlug,
  mockTrackingRepository,
  mockBookingRepository,
  mockCheckIfFreeEmailDomain,
}: {
  mockHubspotClient: {
    crm: {
      properties: { coreApi: { getAll: ReturnType<typeof vi.fn> } };
      contacts: {
        searchApi: { doSearch: ReturnType<typeof vi.fn> };
        basicApi: {
          create: ReturnType<typeof vi.fn>;
          getById: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
      };
      objects: {
        meetings: {
          basicApi: {
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            archive: ReturnType<typeof vi.fn>;
          };
        };
      };
      associations: { batchApi: { create: ReturnType<typeof vi.fn> } };
      owners: { ownersApi: { getPage: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn> } };
    };
    oauth: { tokensApi: { createToken: ReturnType<typeof vi.fn> } };
    setAccessToken: ReturnType<typeof vi.fn>;
  };
  mockGetAppKeysFromSlug: ReturnType<typeof vi.fn>;
  mockTrackingRepository: { findByBookingUid: ReturnType<typeof vi.fn> };
  mockBookingRepository: { findBookingByUid: ReturnType<typeof vi.fn> };
  mockCheckIfFreeEmailDomain: ReturnType<typeof vi.fn>;
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
          getById: vi.fn(),
          update: vi.fn(),
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
          getById: vi.fn(),
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

  const mockTrackingRepository = {
    findByBookingUid: vi.fn(),
  };

  const mockBookingRepository = {
    findBookingByUid: vi.fn(),
  };

  const mockCheckIfFreeEmailDomain = vi.fn();

  return {
    mockHubspotClient,
    mockGetAppKeysFromSlug,
    mockTrackingRepository,
    mockBookingRepository,
    mockCheckIfFreeEmailDomain,
  };
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

vi.mock("@calcom/lib/server/repository/PrismaTrackingRepository", () => ({
  PrismaTrackingRepository: class {
    findByBookingUid = mockTrackingRepository.findByBookingUid;
  },
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: class {
    findBookingByUid = mockBookingRepository.findBookingByUid;
  },
}));

vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: mockCheckIfFreeEmailDomain,
}));

import BuildCrmService from "./CrmService";

describe("HubspotCalendarService", () => {
  let service: CRM & { getAppOptions: () => AppOptions };

  setupAndTeardown();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));

    // Re-apply mock implementation for getAppKeysFromSlug (needed after clearAllMocks)
    mockGetAppKeysFromSlug.mockResolvedValue({
      client_id: "mock_client_id",
      client_secret: "mock_client_secret",
    });

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
      encryptedKey: null,
    };

    service = BuildCrmService(mockCredential, {}) as CRM & { getAppOptions: () => AppOptions };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function mockAppOptions(appOptions: AppOptions): void {
    const appOptionsSpy = vi.spyOn(service, "getAppOptions");
    appOptionsSpy.mockReturnValue(appOptions);
  }

  // Helper to create a mock CalendarEvent
  function createMockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
      type: "test-event",
      title: "Test Meeting",
      startTime: "2024-01-20T14:00:00.000Z",
      endTime: "2024-01-20T15:00:00.000Z",
      uid: "booking-123",
      responses: {
        name: { label: "Name", value: "John Doe" },
        email: { label: "Email", value: "john@example.com" },
      },
      // customInputs is required by getLabelValueMapFromResponses when userFieldsResponses is not present
      customInputs: {},
      organizer: {
        email: "organizer@example.com",
        name: "Organizer",
        timeZone: "America/New_York",
        language: {
          translate: ((key: string) => key) as TFunction,
          locale: "en",
        },
      },
      attendees: [
        {
          email: "attendee@example.com",
          name: "Attendee",
          timeZone: "America/New_York",
          language: {
            translate: ((key: string) => key) as TFunction,
            locale: "en",
          },
        },
      ],
      ...overrides,
    };
  }

  // Helper to setup common mocks for createEvent tests
  function setupCreateEventMocks(): void {
    // Mock owner lookup - return empty results (no owner found)
    mockHubspotClient.crm.owners.ownersApi.getPage.mockResolvedValue({ results: [] });

    // Mock meeting creation
    mockHubspotClient.crm.objects.meetings.basicApi.create.mockResolvedValue({
      id: "meeting-123",
      properties: {},
    });

    // Mock association creation
    mockHubspotClient.crm.associations.batchApi.create.mockResolvedValue({
      results: [],
    });
  }

  describe("getContacts", () => {
    it("should return contacts when found", async () => {
      mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
        results: [
          { id: "contact-1", properties: { email: "test@example.com" } },
          { id: "contact-2", properties: { email: "test2@example.com" } },
        ],
      });

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

      const result = await service.getContacts({ emails: "test@example.com" });

      expect(result).toEqual([{ id: "contact-1", email: "test@example.com" }]);
    });

    it("should return empty array when no contacts found", async () => {
      mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
        results: [],
      });

      const result = await service.getContacts({ emails: "nonexistent@example.com" });

      expect(result).toEqual([]);
    });

    describe("forRoundRobinSkip param is passed", () => {
      it("should return contact with owner info when forRoundRobinSkip is true", async () => {
        mockAppOptions({ roundRobinLeadSkip: true });

        mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
          results: [
            {
              id: "contact-1",
              properties: {
                email: "test@example.com",
                hubspot_owner_id: "12345",
              },
            },
          ],
        });

        mockHubspotClient.crm.owners.ownersApi.getById.mockResolvedValueOnce({
          id: "12345",
          email: "owner@example.com",
        });

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "contact-1",
            email: "test@example.com",
            ownerId: "12345",
            ownerEmail: "owner@example.com",
            recordType: "CONTACT",
          },
        ]);

        expect(mockHubspotClient.crm.contacts.searchApi.doSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: ["hs_object_id", "email", "hubspot_owner_id"],
          })
        );

        expect(mockHubspotClient.crm.owners.ownersApi.getById).toHaveBeenCalledWith(12345);
      });

      it("should return contact without ownerEmail when contact has no owner", async () => {
        mockAppOptions({ roundRobinLeadSkip: true });

        mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
          results: [
            {
              id: "contact-1",
              properties: {
                email: "test@example.com",
                hubspot_owner_id: null,
              },
            },
          ],
        });

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "contact-1",
            email: "test@example.com",
            ownerId: null,
            ownerEmail: undefined,
            recordType: "CONTACT",
          },
        ]);

        expect(mockHubspotClient.crm.owners.ownersApi.getById).not.toHaveBeenCalled();
      });

      it("should skip owner lookup for free email domains when ifFreeEmailDomainSkipOwnerCheck is enabled", async () => {
        mockAppOptions({ roundRobinLeadSkip: true, ifFreeEmailDomainSkipOwnerCheck: true });
        mockCheckIfFreeEmailDomain.mockResolvedValueOnce(true);

        mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
          results: [
            {
              id: "contact-1",
              properties: {
                email: "user@gmail.com",
              },
            },
          ],
        });

        const result = await service.getContacts({
          emails: "user@gmail.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "contact-1",
            email: "user@gmail.com",
          },
        ]);

        expect(mockCheckIfFreeEmailDomain).toHaveBeenCalledWith({ email: "user@gmail.com" });
        expect(mockHubspotClient.crm.contacts.searchApi.doSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: ["hs_object_id", "email"],
          })
        );
        expect(mockHubspotClient.crm.owners.ownersApi.getById).not.toHaveBeenCalled();
      });

      it("should include owner lookup for business email domains even when ifFreeEmailDomainSkipOwnerCheck is enabled", async () => {
        mockAppOptions({ roundRobinLeadSkip: true, ifFreeEmailDomainSkipOwnerCheck: true });
        mockCheckIfFreeEmailDomain.mockResolvedValueOnce(false);

        mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
          results: [
            {
              id: "contact-1",
              properties: {
                email: "user@company.com",
                hubspot_owner_id: "45678",
              },
            },
          ],
        });

        mockHubspotClient.crm.owners.ownersApi.getById.mockResolvedValueOnce({
          id: "45678",
          email: "owner@company.com",
        });

        const result = await service.getContacts({
          emails: "user@company.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "contact-1",
            email: "user@company.com",
            ownerId: "45678",
            ownerEmail: "owner@company.com",
            recordType: "CONTACT",
          },
        ]);

        expect(mockCheckIfFreeEmailDomain).toHaveBeenCalledWith({ email: "user@company.com" });
        expect(mockHubspotClient.crm.contacts.searchApi.doSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: ["hs_object_id", "email", "hubspot_owner_id"],
          })
        );
      });

      it("should handle owner lookup API error gracefully", async () => {
        mockAppOptions({ roundRobinLeadSkip: true });

        mockHubspotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce({
          results: [
            {
              id: "contact-1",
              properties: {
                email: "test@example.com",
                hubspot_owner_id: "99999",
              },
            },
          ],
        });

        mockHubspotClient.crm.owners.ownersApi.getById.mockRejectedValueOnce(new Error("Owner not found"));

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "contact-1",
            email: "test@example.com",
            ownerId: "99999",
            ownerEmail: undefined,
            recordType: "CONTACT",
          },
        ]);
      });
    });
  });

  describe("createContacts", () => {
    it("should create contacts successfully", async () => {
      mockHubspotClient.crm.contacts.basicApi.create.mockResolvedValueOnce({
        id: "new-contact-1",
        properties: { email: "new@example.com", firstname: "New", lastname: "Contact" },
      });

      const result = await service.createContacts([{ name: "New Contact", email: "new@example.com" }]);

      expect(result).toEqual([{ id: "new-contact-1", email: "new@example.com" }]);
      expect(mockHubspotClient.crm.contacts.basicApi.create).toHaveBeenCalledWith({
        properties: {
          firstname: "New",
          lastname: "Contact",
          email: "new@example.com",
        },
      });
    });

    it("should handle existing contact error gracefully", async () => {
      mockHubspotClient.crm.contacts.basicApi.create.mockRejectedValueOnce({
        body: { message: "Contact already exists. Existing ID: existing-contact-123" },
      });

      const result = await service.createContacts([
        { name: "Existing Contact", email: "existing@example.com" },
      ]);

      expect(result).toEqual([{ id: "existing-contact-123", email: "existing@example.com" }]);
    });
  });

  describe("createEvent", () => {
    it("should create a meeting without custom fields when feature is disabled", async () => {
      mockAppOptions({});
      setupCreateEventMocks();

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      // Verify meeting was created with standard properties only
      expect(mockHubspotClient.crm.objects.meetings.basicApi.create).toHaveBeenCalledWith({
        properties: expect.objectContaining({
          hs_meeting_title: "Test Meeting",
          hs_meeting_outcome: "SCHEDULED",
        }),
      });

      // Verify no custom fields were included
      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties).not.toHaveProperty("custom_name");
    });

    it("should include custom text field with static value", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          custom_source: {
            fieldType: CrmFieldType.TEXT,
            value: "Cal.com Booking",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      // Mock field validation - field exists on HubSpot
      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "custom_source", type: "string" }],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.custom_source).toBe("Cal.com Booking");
    });

    it("should include custom text field with booking response placeholder", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          attendee_name: {
            fieldType: CrmFieldType.TEXT,
            value: "{name}",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "attendee_name", type: "string" }],
      });

      const event = createMockEvent({
        responses: {
          name: { label: "Name", value: "John Doe" },
        },
      });
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.attendee_name).toBe("John Doe");
    });

    it("should include custom text field with UTM tracking value", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          utm_source_field: {
            fieldType: CrmFieldType.TEXT,
            value: "{utm:source}",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "utm_source_field", type: "string" }],
      });

      mockTrackingRepository.findByBookingUid.mockResolvedValueOnce({
        utm_source: "google_ads",
        utm_medium: "cpc",
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.utm_source_field).toBe("google_ads");
    });

    it("should include checkbox field with boolean value", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          is_confirmed: {
            fieldType: CrmFieldType.CHECKBOX,
            value: true,
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "is_confirmed", type: "bool" }],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.is_confirmed).toBe(true);
    });

    it("should include date field with booking start date", async () => {
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
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "meeting_date", type: "date" }],
      });

      const event = createMockEvent({ startTime: "2024-01-20T14:00:00.000Z" });
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.meeting_date).toBe("2024-01-20T14:00:00.000Z");
    });

    it("should include date field with booking created date", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          created_date: {
            fieldType: CrmFieldType.DATE,
            value: DateFieldType.BOOKING_CREATED_DATE,
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "created_date", type: "date" }],
      });

      mockBookingRepository.findBookingByUid.mockResolvedValueOnce({
        id: 1,
        uid: "booking-123",
        createdAt: new Date("2024-01-10T09:00:00.000Z"),
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.created_date).toBe("2024-01-10T09:00:00.000Z");
    });

    it("should include phone field with static value", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          contact_phone: {
            fieldType: CrmFieldType.PHONE,
            value: "+1234567890",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "contact_phone", type: "phone" }],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.contact_phone).toBe("+1234567890");
    });

    it("should skip fields that do not exist on HubSpot meeting object", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          existing_field: {
            fieldType: CrmFieldType.TEXT,
            value: "exists",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
          nonexistent_field: {
            fieldType: CrmFieldType.TEXT,
            value: "does not exist",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      // Only return existing_field from HubSpot properties
      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "existing_field", type: "string" }],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.existing_field).toBe("exists");
      expect(createCall.properties).not.toHaveProperty("nonexistent_field");
    });

    it("should handle multiple custom fields of different types", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          text_field: {
            fieldType: CrmFieldType.TEXT,
            value: "Static Text",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
          name_field: {
            fieldType: CrmFieldType.TEXT,
            value: "{name}",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
          checkbox_field: {
            fieldType: CrmFieldType.CHECKBOX,
            value: true,
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
          date_field: {
            fieldType: CrmFieldType.DATE,
            value: DateFieldType.BOOKING_START_DATE,
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [
          { name: "text_field", type: "string" },
          { name: "name_field", type: "string" },
          { name: "checkbox_field", type: "bool" },
          { name: "date_field", type: "date" },
        ],
      });

      const event = createMockEvent({
        responses: { name: { label: "Name", value: "Jane Smith" } },
        startTime: "2024-02-15T10:00:00.000Z",
      });
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.text_field).toBe("Static Text");
      expect(createCall.properties.name_field).toBe("Jane Smith");
      expect(createCall.properties.checkbox_field).toBe(true);
      expect(createCall.properties.date_field).toBe("2024-02-15T10:00:00.000Z");
    });

    it("should skip fields with unknown placeholders that cannot be resolved", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectFields: {
          unknown_field: {
            fieldType: CrmFieldType.TEXT,
            value: "{unknown_placeholder}",
            whenToWrite: WhenToWrite.EVERY_BOOKING,
          },
        },
      });
      setupCreateEventMocks();

      mockHubspotClient.crm.properties.coreApi.getAll.mockResolvedValueOnce({
        results: [{ name: "unknown_field", type: "string" }],
      });

      const event = createMockEvent({
        responses: { name: { label: "Name", value: "John" } },
      });
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      // Field with null value should be filtered out and not sent to HubSpot
      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties).not.toHaveProperty("unknown_field");
    });

    it("should associate meeting with contacts", async () => {
      mockAppOptions({});
      setupCreateEventMocks();

      const event = createMockEvent();
      const contacts = [
        { id: "contact-1", email: "attendee1@example.com" },
        { id: "contact-2", email: "attendee2@example.com" },
      ];

      await service.createEvent(event, contacts);

      expect(mockHubspotClient.crm.associations.batchApi.create).toHaveBeenCalledWith(
        "meetings",
        "contacts",
        {
          inputs: [
            { _from: { id: "meeting-123" }, to: { id: "contact-1" }, type: "meeting_event_to_contact" },
            { _from: { id: "meeting-123" }, to: { id: "contact-2" }, type: "meeting_event_to_contact" },
          ],
        }
      );
    });
    it("should set contact owner when setOrganizerAsOwner is enabled and organizer email matches", async () => {
      mockAppOptions({ setOrganizerAsOwner: true });

      // Mock owner lookup - return matching owner
      mockHubspotClient.crm.owners.ownersApi.getPage.mockResolvedValue({
        results: [{ id: "owner-123", email: "organizer@example.com" }],
      });

      // Mock contact owner lookup - return no existing owner
      mockHubspotClient.crm.contacts.basicApi.getById.mockResolvedValue({
        id: "contact-1",
        properties: { hubspot_owner_id: null },
      });

      // Mock contact update
      mockHubspotClient.crm.contacts.basicApi.update.mockResolvedValue({
        id: "contact-1",
        properties: { hubspot_owner_id: "owner-123" },
      });

      mockHubspotClient.crm.objects.meetings.basicApi.create.mockResolvedValue({
        id: "meeting-123",
        properties: {},
      });

      mockHubspotClient.crm.associations.batchApi.create.mockResolvedValue({
        results: [],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      // Verify contact owner was set
      expect(mockHubspotClient.crm.contacts.basicApi.update).toHaveBeenCalledWith("contact-1", {
        properties: { hubspot_owner_id: "owner-123" },
      });

      // Verify meeting was created with hubspot_owner_id (meeting owner is always set from organizer)
      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.hubspot_owner_id).toBe("owner-123");
    });

    it("should overwrite existing contact owner when overwriteContactOwner is true", async () => {
      mockAppOptions({ setOrganizerAsOwner: true, overwriteContactOwner: true });

      mockHubspotClient.crm.owners.ownersApi.getPage.mockResolvedValue({
        results: [{ id: "owner-123", email: "organizer@example.com" }],
      });

      mockHubspotClient.crm.contacts.basicApi.update.mockResolvedValue({
        id: "contact-1",
        properties: { hubspot_owner_id: "owner-123" },
      });

      mockHubspotClient.crm.objects.meetings.basicApi.create.mockResolvedValue({
        id: "meeting-123",
        properties: {},
      });

      mockHubspotClient.crm.associations.batchApi.create.mockResolvedValue({
        results: [],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      expect(mockHubspotClient.crm.contacts.basicApi.update).toHaveBeenCalledWith("contact-1", {
        properties: { hubspot_owner_id: "owner-123" },
      });
      expect(mockHubspotClient.crm.contacts.basicApi.getById).not.toHaveBeenCalled();
    });

    it("should not overwrite existing contact owner when overwriteContactOwner is false", async () => {
      mockAppOptions({ setOrganizerAsOwner: true, overwriteContactOwner: false });

      mockHubspotClient.crm.owners.ownersApi.getPage.mockResolvedValue({
        results: [{ id: "owner-123", email: "organizer@example.com" }],
      });

      mockHubspotClient.crm.contacts.basicApi.getById.mockResolvedValue({
        id: "contact-1",
        properties: { hubspot_owner_id: "existing-owner-456" },
      });

      mockHubspotClient.crm.objects.meetings.basicApi.create.mockResolvedValue({
        id: "meeting-123",
        properties: {},
      });

      mockHubspotClient.crm.associations.batchApi.create.mockResolvedValue({
        results: [],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      expect(mockHubspotClient.crm.contacts.basicApi.getById).toHaveBeenCalledWith("contact-1", [
        "hubspot_owner_id",
      ]);
      expect(mockHubspotClient.crm.contacts.basicApi.update).not.toHaveBeenCalled();
    });

    it("should not set contact owner when organizer has no matching HubSpot owner", async () => {
      mockAppOptions({ setOrganizerAsOwner: true });

      mockHubspotClient.crm.owners.ownersApi.getPage.mockResolvedValue({ results: [] });

      mockHubspotClient.crm.objects.meetings.basicApi.create.mockResolvedValue({
        id: "meeting-123",
        properties: {},
      });

      mockHubspotClient.crm.associations.batchApi.create.mockResolvedValue({
        results: [],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      await service.createEvent(event, contacts);

      expect(mockHubspotClient.crm.contacts.basicApi.getById).not.toHaveBeenCalled();
      expect(mockHubspotClient.crm.contacts.basicApi.update).not.toHaveBeenCalled();

      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.hubspot_owner_id).toBeUndefined();
    });

    it("should create meeting successfully when owner lookup fails due to missing scope", async () => {
      mockAppOptions({});

      // Mock owner lookup to fail with 403 missing scope error (simulating owners.read scope not granted)
      mockHubspotClient.crm.owners.ownersApi.getPage.mockRejectedValue({
        code: 403,
        body: {
          status: "error",
          message: "This app hasn't been granted all required scopes to make this call.",
          category: "MISSING_SCOPES",
        },
      });

      mockHubspotClient.crm.objects.meetings.basicApi.create.mockResolvedValue({
        id: "meeting-123",
        properties: {},
      });

      mockHubspotClient.crm.associations.batchApi.create.mockResolvedValue({
        results: [],
      });

      const event = createMockEvent();
      const contacts = [{ id: "contact-1", email: "attendee@example.com" }];

      // Should not throw and meeting should be created successfully
      const result = await service.createEvent(event, contacts);

      expect(result).toEqual({
        uid: "meeting-123",
        id: "meeting-123",
        type: "hubspot_other_calendar",
        password: "",
        url: "",
        additionalInfo: { contacts, associatedMeeting: { results: [] } },
      });

      // Verify meeting was created without owner
      const createCall = mockHubspotClient.crm.objects.meetings.basicApi.create.mock.calls[0][0];
      expect(createCall.properties.hubspot_owner_id).toBeUndefined();

      // Verify meeting creation and association still happened
      expect(mockHubspotClient.crm.objects.meetings.basicApi.create).toHaveBeenCalled();
      expect(mockHubspotClient.crm.associations.batchApi.create).toHaveBeenCalled();
    });
  });

  describe("updateEvent", () => {
    it("should update meeting with standard properties", async () => {
      mockHubspotClient.crm.objects.meetings.basicApi.update.mockResolvedValue({
        id: "meeting-123",
        properties: {},
      });

      const event = createMockEvent({
        title: "Updated Meeting",
        startTime: "2024-01-25T14:00:00.000Z",
        endTime: "2024-01-25T15:00:00.000Z",
      });

      await service.updateEvent("meeting-123", event);

      expect(mockHubspotClient.crm.objects.meetings.basicApi.update).toHaveBeenCalledWith("meeting-123", {
        properties: expect.objectContaining({
          hs_meeting_title: "Updated Meeting",
          hs_meeting_outcome: "RESCHEDULED",
        }),
      });
    });
  });

  describe("deleteEvent", () => {
    it("should cancel meeting when organizer has not changed", async () => {
      mockHubspotClient.crm.objects.meetings.basicApi.update.mockResolvedValue({
        id: "meeting-123",
        properties: {},
      });

      const event = createMockEvent({ hasOrganizerChanged: false });

      await service.deleteEvent("meeting-123", event);

      expect(mockHubspotClient.crm.objects.meetings.basicApi.update).toHaveBeenCalledWith("meeting-123", {
        properties: {
          hs_meeting_outcome: "CANCELED",
        },
      });
    });

    it("should archive meeting when organizer has changed", async () => {
      mockHubspotClient.crm.objects.meetings.basicApi.archive.mockResolvedValue(undefined);

      const event = createMockEvent({ hasOrganizerChanged: true });

      await service.deleteEvent("meeting-123", event);

      expect(mockHubspotClient.crm.objects.meetings.basicApi.archive).toHaveBeenCalledWith("meeting-123");
    });
  });
});
