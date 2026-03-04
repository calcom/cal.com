import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Contact, ContactCreateInput, CRM, CrmEvent } from "@calcom/types/CrmService";
import type { TFunction } from "i18next";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/app-store/_utils/getCrm");

import getCrm from "@calcom/app-store/_utils/getCrm";
import CrmManager from "./crmManager";

const mockedGetCrm: ReturnType<typeof vi.mocked<typeof getCrm>> = vi.mocked(getCrm);

function createMockCrmService(overrides?: Partial<CRM>): CRM {
  return {
    createEvent: vi.fn<CRM["createEvent"]>().mockResolvedValue({ id: "crm-event-1" }),
    updateEvent: vi.fn<CRM["updateEvent"]>().mockResolvedValue({ id: "crm-event-1" }),
    deleteEvent: vi.fn<CRM["deleteEvent"]>().mockResolvedValue(undefined),
    getContacts: vi.fn<CRM["getContacts"]>().mockResolvedValue([]),
    createContacts: vi.fn<CRM["createContacts"]>().mockResolvedValue([]),
    getAppOptions: vi.fn().mockReturnValue({}),
    handleAttendeeNoShow: vi.fn<NonNullable<CRM["handleAttendeeNoShow"]>>().mockResolvedValue(undefined),
    ...overrides,
  };
}

const tFunc = vi.fn((key: string) => key) as unknown as TFunction;

function createCredential(overrides?: Partial<CredentialPayload>): CredentialPayload {
  return {
    id: 1,
    type: "salesforce_crm",
    key: { clientId: "test-client-id" },
    userId: 1,
    teamId: null,
    appId: "salesforce",
    invalid: false,
    user: { email: "organizer@test.com" },
    delegationCredentialId: null,
    encryptedKey: null,
    ...overrides,
  } as CredentialPayload;
}

function createCalendarEvent(overrides?: Partial<CalendarEvent>): CalendarEvent {
  return {
    title: "Test Meeting",
    type: "test-meeting",
    startTime: "2024-01-01T10:00:00Z",
    endTime: "2024-01-01T11:00:00Z",
    organizer: {
      email: "organizer@test.com",
      name: "Organizer",
      timeZone: "UTC",
      language: { locale: "en", translate: tFunc },
    },
    attendees: [
      {
        email: "attendee1@test.com",
        name: "Attendee 1",
        timeZone: "UTC",
        language: { locale: "en", translate: tFunc },
      },
    ],
    ...overrides,
  };
}

function createContact(email: string, id?: string): Contact {
  return { id: id ?? `contact-${email}`, email };
}

describe("CrmManager", () => {
  let mockCrmService: CRM;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCrmService = createMockCrmService();
    mockedGetCrm.mockResolvedValue(mockCrmService);
  });

  // ===== 2.3.1 Service Initialization (tested indirectly) =====

  describe("service initialization", () => {
    test("scenario 1: first method call initializes CRM service via getCrm", async () => {
      const credential = createCredential();
      const crmManager = new CrmManager(credential);

      await crmManager.getContacts({ emails: ["test@test.com"] });

      expect(mockedGetCrm).toHaveBeenCalledTimes(1);
      expect(mockedGetCrm).toHaveBeenCalledWith(credential, undefined);
    });

    test("scenario 2: second method call uses cached service, does NOT call getCrm again", async () => {
      const crmManager = new CrmManager(createCredential());

      await crmManager.getContacts({ emails: ["test@test.com"] });
      await crmManager.getContacts({ emails: ["test2@test.com"] });

      expect(mockedGetCrm).toHaveBeenCalledTimes(1);
    });

    test("scenario 3: getCrm returns null logs error and methods return undefined", async () => {
      mockedGetCrm.mockResolvedValue(null);
      const crmManager = new CrmManager(createCredential());

      const result = await crmManager.getContacts({ emails: ["test@test.com"] });

      expect(result).toBeUndefined();
    });
  });

  // ===== 2.3.2 createEvent -- Core Business Logic =====

  describe("createEvent", () => {
    test("scenario 4: CRM service is null returns undefined immediately", async () => {
      mockedGetCrm.mockResolvedValue(null);
      const crmManager = new CrmManager(createCredential());

      const result = await crmManager.createEvent(createCalendarEvent());

      expect(result).toBeUndefined();
    });

    test("scenario 5: all contacts already exist calls createEvent with existing contacts", async () => {
      const existingContact = createContact("attendee1@test.com");
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([existingContact]);

      const crmManager = new CrmManager(createCredential());
      const event = createCalendarEvent();

      await crmManager.createEvent(event);

      expect(mockCrmService.createContacts).not.toHaveBeenCalled();
      expect(mockCrmService.createEvent).toHaveBeenCalledWith(event, [existingContact]);
    });

    test("scenario 6: some contacts missing with skipContactCreation=false creates missing contacts", async () => {
      const event = createCalendarEvent({
        attendees: [
          {
            email: "existing@test.com",
            name: "Existing",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
          {
            email: "new@test.com",
            name: "New Contact",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
        ],
      });

      const existingContact = createContact("existing@test.com");
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([existingContact]);

      const newContact = createContact("new@test.com");
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([newContact]);

      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(event);

      expect(mockCrmService.createContacts).toHaveBeenCalledWith(
        [{ email: "new@test.com", name: "New Contact", phone: undefined }],
        "organizer@test.com",
        undefined
      );
      expect(mockCrmService.createEvent).toHaveBeenCalledWith(event, [existingContact, newContact]);
    });

    test("scenario 7: some contacts missing with skipContactCreation=true returns undefined", async () => {
      vi.mocked(mockCrmService.getAppOptions).mockReturnValue({ skipContactCreation: true });
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);

      const crmManager = new CrmManager(createCredential());
      const result = await crmManager.createEvent(createCalendarEvent());

      expect(result).toBeUndefined();
      expect(mockCrmService.createContacts).not.toHaveBeenCalled();
      expect(mockCrmService.createEvent).not.toHaveBeenCalled();
    });

    test("scenario 8: no contacts exist creates all contacts then creates event", async () => {
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);
      const createdContact = createContact("attendee1@test.com");
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([createdContact]);

      const crmManager = new CrmManager(createCredential());
      const event = createCalendarEvent();
      await crmManager.createEvent(event);

      expect(mockCrmService.createContacts).toHaveBeenCalledWith(
        [{ email: "attendee1@test.com", name: "Attendee 1", phone: undefined }],
        "organizer@test.com",
        undefined
      );
      expect(mockCrmService.createEvent).toHaveBeenCalledWith(event, [createdContact]);
    });

    test("scenario 9: ignoreGuests=true only processes first attendee", async () => {
      vi.mocked(mockCrmService.getAppOptions).mockReturnValue({ ignoreGuests: true });
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);
      const createdContact = createContact("attendee1@test.com");
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([createdContact]);

      const event = createCalendarEvent({
        attendees: [
          {
            email: "attendee1@test.com",
            name: "Attendee 1",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
          {
            email: "attendee2@test.com",
            name: "Attendee 2",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
          {
            email: "attendee3@test.com",
            name: "Attendee 3",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
        ],
      });

      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(event);

      expect(mockCrmService.getContacts).toHaveBeenCalledWith({
        emails: ["attendee1@test.com"],
      });
      expect(mockCrmService.createContacts).toHaveBeenCalledWith(
        [{ email: "attendee1@test.com", name: "Attendee 1", phone: undefined }],
        "organizer@test.com",
        undefined
      );
    });

    test("scenario 10: ignoreGuests=false (default) processes all attendees", async () => {
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);

      const contacts = [
        createContact("attendee1@test.com"),
        createContact("attendee2@test.com"),
        createContact("attendee3@test.com"),
      ];
      vi.mocked(mockCrmService.createContacts).mockResolvedValue(contacts);

      const event = createCalendarEvent({
        attendees: [
          {
            email: "attendee1@test.com",
            name: "Attendee 1",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
          {
            email: "attendee2@test.com",
            name: "Attendee 2",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
          {
            email: "attendee3@test.com",
            name: "Attendee 3",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
        ],
      });

      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(event);

      expect(mockCrmService.getContacts).toHaveBeenCalledWith({
        emails: ["attendee1@test.com", "attendee2@test.com", "attendee3@test.com"],
      });
    });

    test("scenario 11: getAppOptions returns null defaults to skipContactCreation=false, ignoreGuests=false", async () => {
      vi.mocked(mockCrmService.getAppOptions).mockReturnValue(null);
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);
      const createdContact = createContact("attendee1@test.com");
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([createdContact]);

      const event = createCalendarEvent();
      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(event);

      // Should proceed with contact creation (skipContactCreation defaults to false)
      expect(mockCrmService.createContacts).toHaveBeenCalled();
      // Should use all attendees (ignoreGuests defaults to false)
      expect(mockCrmService.getContacts).toHaveBeenCalledWith({
        emails: ["attendee1@test.com"],
      });
      expect(mockCrmService.createEvent).toHaveBeenCalled();
    });

    test("scenario 12: contact deduplication only creates missing contacts", async () => {
      const event = createCalendarEvent({
        attendees: [
          {
            email: "existing1@test.com",
            name: "Existing 1",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
          {
            email: "existing2@test.com",
            name: "Existing 2",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
          {
            email: "new@test.com",
            name: "New Contact",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
          },
        ],
      });

      const existingContacts = [createContact("existing1@test.com"), createContact("existing2@test.com")];
      vi.mocked(mockCrmService.getContacts).mockResolvedValue(existingContacts);

      const newContact = createContact("new@test.com");
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([newContact]);

      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(event);

      expect(mockCrmService.createContacts).toHaveBeenCalledWith(
        [{ email: "new@test.com", name: "New Contact", phone: undefined }],
        "organizer@test.com",
        undefined
      );
      expect(mockCrmService.createEvent).toHaveBeenCalledWith(event, [...existingContacts, newContact]);
    });

    test("scenario 13: phone number mapping passes phoneNumber as phone", async () => {
      const event = createCalendarEvent({
        attendees: [
          {
            email: "attendee@test.com",
            name: "Attendee",
            timeZone: "UTC",
            language: { locale: "en", translate: tFunc },
            phoneNumber: "+1234567890",
          },
        ],
      });

      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([createContact("attendee@test.com")]);

      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(event);

      const createContactsCall = vi.mocked(mockCrmService.createContacts).mock.calls[0];
      const contactsToCreate = createContactsCall[0] as ContactCreateInput[];
      expect(contactsToCreate[0].phone).toBe("+1234567890");
    });

    test("scenario 14: phone number undefined when attendee has no phoneNumber", async () => {
      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([createContact("attendee1@test.com")]);

      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(createCalendarEvent());

      const createContactsCall = vi.mocked(mockCrmService.createContacts).mock.calls[0];
      const contactsToCreate = createContactsCall[0] as ContactCreateInput[];
      expect(contactsToCreate[0].phone).toBeUndefined();
    });

    test("scenario 15: organizer email and responses passed through to createContacts", async () => {
      const responses = { name: { label: "Name", value: "Test" } };
      const event = createCalendarEvent({
        organizer: {
          email: "org@test.com",
          name: "Org",
          timeZone: "UTC",
          language: { locale: "en", translate: tFunc },
        },
        responses,
      });

      vi.mocked(mockCrmService.getContacts).mockResolvedValue([]);
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([createContact("attendee1@test.com")]);

      const crmManager = new CrmManager(createCredential());
      await crmManager.createEvent(event);

      expect(mockCrmService.createContacts).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ email: "attendee1@test.com" })]),
        "org@test.com",
        responses
      );
    });

    test("scenario 16: getContacts returns null falls back to empty array and creates all contacts", async () => {
      vi.mocked(mockCrmService.getContacts).mockResolvedValue(null as unknown as Contact[]);
      const createdContact = createContact("attendee1@test.com");
      vi.mocked(mockCrmService.createContacts).mockResolvedValue([createdContact]);

      const crmManager = new CrmManager(createCredential());
      const event = createCalendarEvent();
      await crmManager.createEvent(event);

      expect(mockCrmService.createContacts).toHaveBeenCalled();
      expect(mockCrmService.createEvent).toHaveBeenCalledWith(event, [createdContact]);
    });
  });

  // ===== 2.3.3 updateEvent =====

  describe("updateEvent", () => {
    test("scenario 17: CRM service available calls crmService.updateEvent and returns result", async () => {
      const expectedResult: CrmEvent = { id: "updated-event-1" };
      vi.mocked(mockCrmService.updateEvent).mockResolvedValue(expectedResult);

      const crmManager = new CrmManager(createCredential());
      const event = createCalendarEvent();
      const result = await crmManager.updateEvent("uid-123", event);

      expect(mockCrmService.updateEvent).toHaveBeenCalledWith("uid-123", event);
      expect(result).toEqual(expectedResult);
    });

    test("scenario 18: CRM service is null returns undefined", async () => {
      mockedGetCrm.mockResolvedValue(null);
      const crmManager = new CrmManager(createCredential());

      const result = await crmManager.updateEvent("uid-123", createCalendarEvent());

      expect(result).toBeUndefined();
    });
  });

  // ===== 2.3.4 deleteEvent =====

  describe("deleteEvent", () => {
    test("scenario 19: CRM service available calls crmService.deleteEvent and returns result", async () => {
      const crmManager = new CrmManager(createCredential());
      const event = createCalendarEvent();

      await crmManager.deleteEvent("uid-123", event);

      expect(mockCrmService.deleteEvent).toHaveBeenCalledWith("uid-123", event);
    });

    test("scenario 20: CRM service is null returns undefined", async () => {
      mockedGetCrm.mockResolvedValue(null);
      const crmManager = new CrmManager(createCredential());

      const result = await crmManager.deleteEvent("uid-123", createCalendarEvent());

      expect(result).toBeUndefined();
    });
  });

  // ===== 2.3.5 getContacts =====

  describe("getContacts", () => {
    test("scenario 21: CRM service available calls crmService.getContacts with all params", async () => {
      const expectedContacts = [createContact("test@test.com")];
      vi.mocked(mockCrmService.getContacts).mockResolvedValue(expectedContacts);

      const crmManager = new CrmManager(createCredential());
      const params = {
        emails: ["test@test.com"],
        includeOwner: true,
        forRoundRobinSkip: true,
      };
      const result = await crmManager.getContacts(params);

      expect(mockCrmService.getContacts).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedContacts);
    });

    test("scenario 22: CRM service is null returns undefined", async () => {
      mockedGetCrm.mockResolvedValue(null);
      const crmManager = new CrmManager(createCredential());

      const result = await crmManager.getContacts({ emails: ["test@test.com"] });

      expect(result).toBeUndefined();
    });
  });

  // ===== 2.3.6 createContacts =====

  describe("createContacts", () => {
    test("scenario 23: CRM service available calls crmService.createContacts and returns created contacts", async () => {
      const contactsToCreate: ContactCreateInput[] = [{ email: "new@test.com", name: "New Contact" }];
      const expectedContacts = [createContact("new@test.com")];
      vi.mocked(mockCrmService.createContacts).mockResolvedValue(expectedContacts);

      const crmManager = new CrmManager(createCredential());
      const result = await crmManager.createContacts(contactsToCreate, "org@test.com", null);

      expect(mockCrmService.createContacts).toHaveBeenCalledWith(contactsToCreate, "org@test.com", null);
      expect(result).toEqual(expectedContacts);
    });

    test("scenario 24: CRM service is null returns empty array", async () => {
      mockedGetCrm.mockResolvedValue(null);
      const crmManager = new CrmManager(createCredential());

      const result = await crmManager.createContacts(
        [{ email: "new@test.com", name: "New Contact" }],
        "org@test.com"
      );

      expect(result).toEqual([]);
    });
  });

  // ===== 2.3.7 handleAttendeeNoShow =====

  describe("handleAttendeeNoShow", () => {
    test("scenario 25: CRM service has handleAttendeeNoShow method calls it", async () => {
      const crmManager = new CrmManager(createCredential());
      const attendees = [{ email: "attendee@test.com", noShow: true }];

      await crmManager.handleAttendeeNoShow("booking-uid-1", attendees);

      expect(mockCrmService.handleAttendeeNoShow).toHaveBeenCalledWith("booking-uid-1", attendees);
    });

    test("scenario 26: CRM service does NOT have handleAttendeeNoShow method no-ops silently", async () => {
      const serviceWithoutNoShow = createMockCrmService();
      delete (serviceWithoutNoShow as Record<string, unknown>).handleAttendeeNoShow;
      mockedGetCrm.mockResolvedValue(serviceWithoutNoShow);

      const crmManager = new CrmManager(createCredential());
      const attendees = [{ email: "attendee@test.com", noShow: true }];

      // Should not throw
      await expect(crmManager.handleAttendeeNoShow("booking-uid-1", attendees)).resolves.toBeUndefined();
    });

    test("scenario 27: CRM service is null returns undefined", async () => {
      mockedGetCrm.mockResolvedValue(null);
      const crmManager = new CrmManager(createCredential());

      const result = await crmManager.handleAttendeeNoShow("booking-uid-1", [
        { email: "attendee@test.com", noShow: true },
      ]);

      expect(result).toBeUndefined();
    });
  });
});
