import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import type { TFunction } from "next-i18next";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { prisma } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import SalesforceCRMService from "./CrmService";
import { SalesforceRecordEnum } from "./enums";

// Define mock translation function type for tests
type MockLanguage = {
  translate: TFunction;
  locale: string;
};

// Mock translation function
const mockLanguage: MockLanguage = {
  translate: ((key: string) => key) as unknown as TFunction,
  locale: "en",
};

// Mock sfApiErrors since it's not exported from CrmService
const sfApiErrors = {
  INVALID_EVENTWHOIDS: "INVALID_FIELD: No such column 'EventWhoIds' on sobject of type Event",
};

describe("SalesforceCRMService", () => {
  let service: SalesforceCRMService;
  let mockConnection: {
    query: ReturnType<typeof vi.fn>;
    sobject: ReturnType<typeof vi.fn>;
    describe: ReturnType<typeof vi.fn>;
  };

  setupAndTeardown();

  beforeEach(() => {
    mockConnection = {
      query: vi.fn(),
      sobject: vi.fn(),
      describe: vi.fn(),
    };

    const mockCredential: CredentialPayload = {
      id: 1,
      type: "salesforce_crm",
      key: {
        access_token: "mock_token",
        refresh_token: "mock_refresh",
        instance_url: "https://mock.salesforce.com",
      },
      userId: 1,
      appId: "salesforce",
      teamId: null,
      invalid: false,
      user: {
        email: "test-user@example.com",
      },
    };

    service = new SalesforceCRMService(
      mockCredential,
      {
        sendNoShowAttendeeData: true,
        sendNoShowAttendeeDataField: "No_Show__c",
      },
      true
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    service.conn = Promise.resolve(mockConnection);
  });

  describe("getContacts", () => {
    it("should return empty array when no records found", async () => {
      // Setup mock response
      mockConnection.query.mockResolvedValueOnce({ records: [] });

      const result = await service.getContacts({ emails: "test@example.com" });

      expect(result).toEqual([]);
      expect(mockConnection.query).toHaveBeenCalledWith(
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test@example.com')"
      );
    });

    it("should handle single email string input", async () => {
      // Setup mock response with descriptive name
      const contactQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
          },
        ],
      };

      // Setup query spy
      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce(contactQueryResponse);

      const result = await service.getContacts({ emails: "test@example.com" });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          recordType: "Contact",
        },
      ]);

      // Verify the exact query made
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test@example.com')"
      );
    });

    it("should handle array of emails input", async () => {
      const contactsQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test1@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
          },
          {
            Id: "002",
            Email: "test2@example.com",
            OwnerId: "owner002",
            attributes: { type: "Contact" },
          },
        ],
      };

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce(contactsQueryResponse);

      const result = await service.getContacts({
        emails: ["test1@example.com", "test2@example.com"],
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test1@example.com",
          recordType: "Contact",
        },
        {
          id: "002",
          email: "test2@example.com",
          recordType: "Contact",
        },
      ]);

      expect(querySpy).toHaveBeenCalledWith(
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test1@example.com','test2@example.com')"
      );
    });

    it("should include owner information when includeOwner is true", async () => {
      const contactQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
          },
        ],
      };

      const ownerQueryResponse = {
        records: [
          {
            Id: "owner001",
            Email: "owner@example.com",
            Name: "Test Owner",
          },
        ],
      };

      // Setup query spy with specific responses
      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy
        .mockResolvedValueOnce(contactQueryResponse) // Contact query
        .mockResolvedValueOnce(ownerQueryResponse); // Owner query

      const result = await service.getContacts({
        emails: "test@example.com",
        includeOwner: true,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          ownerId: "owner001",
          ownerEmail: "owner@example.com",
          recordType: "Contact",
        },
      ]);

      expect(querySpy).toHaveBeenNthCalledWith(
        1,
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test@example.com')"
      );
      expect(querySpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("SELECT Id, Email, Name FROM User WHERE Id = 'owner001'")
      );
    });

    it("should handle account record type with round robin skip", async () => {
      service = new SalesforceCRMService(
        {} as CredentialPayload,
        {
          createEventOn: SalesforceRecordEnum.ACCOUNT,
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.ACCOUNT,
        },
        true
      );
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      service.conn = Promise.resolve(mockConnection);

      const initialContactQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            AccountId: "acc001",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
          },
        ],
      };

      const accountQueryResponse = {
        records: [
          {
            Id: "acc001",
            OwnerId: "owner001",
            Email: "test@example.com",
            attributes: { type: "Account" },
          },
        ],
      };

      const ownerQueryResponse = {
        records: [
          {
            Id: "owner001",
            Email: "owner@example.com",
            Name: "Test Owner",
          },
        ],
      };

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy
        .mockResolvedValueOnce(initialContactQueryResponse)
        .mockResolvedValueOnce(accountQueryResponse)
        .mockResolvedValueOnce(ownerQueryResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
        includeOwner: true,
      });

      expect(result).toEqual([
        {
          id: "acc001",
          email: "test@example.com",
          ownerId: "owner001",
          ownerEmail: "owner@example.com",
          recordType: "Account",
        },
      ]);

      expect(querySpy).toHaveBeenNthCalledWith(
        1,
        "SELECT Id, Email, OwnerId, AccountId FROM Contact WHERE Email = 'test@example.com' AND AccountId != null"
      );
      expect(querySpy).toHaveBeenNthCalledWith(2, "SELECT Id, OwnerId FROM Account WHERE Id = 'acc001'");
      expect(querySpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("SELECT Id, Email, Name FROM User WHERE Id = 'owner001'")
      );
    });
  });

  describe("createEvent", () => {
    it("should create a Salesforce event successfully", async () => {
      // Mock the event creation response
      const mockEventResponse = {
        success: true,
        id: "event001",
      };

      // Setup mock for sobject
      mockConnection.query = vi.fn().mockResolvedValueOnce({
        records: [{ Id: "user001", Email: "organizer@example.com" }],
      });
      const mockSObject = {
        create: vi.fn().mockResolvedValue(mockEventResponse),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      // Create test event data
      const testEvent: CalendarEvent = {
        type: "default",
        title: "Test Event",
        description: "",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: mockLanguage,
        },
        attendees: [
          {
            email: "attendee@example.com",
            name: "Test Attendee",
            timeZone: "UTC",
            language: mockLanguage,
          },
        ],
        location: "Test Location",
      };

      const testContacts = [
        {
          id: "contact001",
          email: "attendee@example.com",
        },
      ];

      const result = await service.createEvent(testEvent, testContacts);

      // Verify the event was created with correct data
      expect(mockConnection.sobject).toHaveBeenCalledWith("Event");
      expect(mockSObject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          StartDateTime: new Date(testEvent.startTime).toISOString(),
          EndDateTime: new Date(testEvent.endTime).toISOString(),
          Subject: testEvent.title,
          Location: testEvent.location,
          EventWhoIds: ["contact001"],
        })
      );

      // Verify the returned event has the correct shape
      expect(result).toEqual({
        uid: "event001",
        id: "event001",
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: {
          contacts: testContacts,
          sfEvent: mockEventResponse,
          calWarnings: [],
        },
      });
    });

    it("should handle multiple contacts and fall back to WhoId when EventWhoIds fails", async () => {
      // Create test event data
      const testEvent: CalendarEvent = {
        type: "default",
        title: "Test Event",
        description: "",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: mockLanguage,
        },
        attendees: [
          {
            email: "attendee1@example.com",
            name: "Attendee 1",
            timeZone: "UTC",
            language: mockLanguage,
          },
          {
            email: "attendee2@example.com",
            name: "Attendee 2",
            timeZone: "UTC",
            language: mockLanguage,
          },
        ],
        location: "Test Location",
      };

      const testContacts = [
        { id: "contact001", email: "attendee1@example.com" },
        { id: "contact002", email: "attendee2@example.com" },
      ];

      // Mock the event creation responses
      const mockEventResponseFailure = sfApiErrors.INVALID_EVENTWHOIDS;
      const mockEventResponseSuccess = {
        success: true,
        id: "event001",
      };

      // Setup mock for sobject with initial failure then success
      mockConnection.query = vi.fn().mockResolvedValueOnce({
        records: [{ Id: "user001", Email: "organizer@example.com" }],
      });
      const mockSObject = {
        create: vi
          .fn()
          .mockRejectedValueOnce(mockEventResponseFailure)
          .mockResolvedValueOnce(mockEventResponseSuccess),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      const result = await service.createEvent(testEvent, testContacts);

      // Verify both attempts were made
      expect(mockSObject.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          EventWhoIds: ["contact001", "contact002"],
        })
      );
      expect(mockSObject.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          WhoId: expect.objectContaining({
            id: "contact001",
            email: "attendee1@example.com",
          }),
        })
      );

      // Verify the returned event has the correct shape
      expect(result).toEqual({
        uid: "event001",
        id: "event001",
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: {
          contacts: testContacts,
          sfEvent: mockEventResponseSuccess,
          calWarnings: [
            expect.stringContaining("Allow Users to Relate Multiple Contacts to Tasks and Events"),
          ],
        },
      });
    });
  });

  describe("updateEvent", () => {
    it("should update a Salesforce event successfully", async () => {
      // Mock the event update response
      const mockEventResponse = {
        success: true,
        id: "event001",
      };

      // Setup mock for sobject
      const mockSObject = {
        update: vi.fn().mockResolvedValue(mockEventResponse),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      // Create test event data
      const testEvent: CalendarEvent = {
        type: "default",
        title: "Updated Test Event",
        description: "",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: mockLanguage,
        },
        attendees: [
          {
            email: "attendee@example.com",
            name: "Test Attendee",
            timeZone: "UTC",
            language: mockLanguage,
          },
        ],
        location: "Updated Test Location",
      };

      const result = await service.updateEvent("event001", testEvent);

      // Verify the event was updated with correct data
      expect(mockConnection.sobject).toHaveBeenCalledWith("Event");
      expect(mockSObject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: "event001",
          StartDateTime: new Date(testEvent.startTime).toISOString(),
          EndDateTime: new Date(testEvent.endTime).toISOString(),
          Subject: testEvent.title,
          Location: testEvent.location,
        })
      );

      // Verify the returned event has the correct shape
      expect(result).toEqual({
        uid: "event001",
        id: "event001",
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: {
          calWarnings: [],
        },
      });
    });

    it("should handle update failure gracefully", async () => {
      // Mock the event update failure
      const mockError = new Error("Update failed");
      const mockSObject = {
        update: vi.fn().mockRejectedValue(mockError),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      const testEvent: CalendarEvent = {
        type: "default",
        title: "Test Event",
        description: "",
        startTime: "2023-01-01T10:00:00Z",
        endTime: "2023-01-01T11:00:00Z",
        organizer: {
          email: "organizer@example.com",
          name: "Organizer",
          timeZone: "UTC",
          language: mockLanguage,
        },
        attendees: [
          {
            email: "attendee@example.com",
            name: "Test Attendee",
            timeZone: "UTC",
            language: mockLanguage,
          },
        ],
        location: "Test Location",
      };

      // Expect the update to throw an error
      await expect(service.updateEvent("event001", testEvent)).rejects.toThrow("Update failed");
    });
  });

  describe("deleteEvent", () => {
    it("should delete a Salesforce event successfully", async () => {
      const mockSObject = {
        delete: vi.fn().mockResolvedValue({ success: true }),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      await service.deleteEvent("event001");

      expect(mockConnection.sobject).toHaveBeenCalledWith("Event");
      expect(mockSObject.delete).toHaveBeenCalledWith("event001");
    });

    it("should handle delete failure gracefully", async () => {
      const mockError = new Error("Delete failed");
      const mockSObject = {
        delete: vi.fn().mockRejectedValue(mockError),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      await expect(service.deleteEvent("event001")).rejects.toThrow("Delete failed");
    });
  });

  describe("createContacts", () => {
    it("should create contacts successfully", async () => {
      const mockSObject = {
        create: vi
          .fn()
          .mockImplementation((contact: { Email?: string; FirstName?: string; LastName?: string }) => {
            if (!contact.Email) throw new Error("Invalid contact");
            return Promise.resolve({
              success: true,
              id: contact.Email === "attendee1@example.com" ? "contact001" : "contact002",
            });
          }),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      const attendees = [
        {
          email: "attendee1@example.com",
          name: "Attendee 1",
          timeZone: "UTC",
          language: mockLanguage,
        },
        {
          email: "attendee2@example.com",
          name: "Attendee 2",
          timeZone: "UTC",
          language: mockLanguage,
        },
      ];

      const result = await service.createContacts(attendees);

      expect(mockConnection.sobject).toHaveBeenCalledWith("Contact");
      expect(mockSObject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: "attendee1@example.com",
          FirstName: "Attendee",
          LastName: "1",
        })
      );
      expect(mockSObject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          Email: "attendee2@example.com",
          FirstName: "Attendee",
          LastName: "2",
        })
      );

      expect(result).toEqual([
        { id: "contact001", email: "attendee1@example.com" },
        { id: "contact002", email: "attendee2@example.com" },
      ]);
    });

    it("should handle contact creation failure", async () => {
      const mockError = new Error("Contact creation failed");
      const mockSObject = {
        create: vi.fn().mockRejectedValue(new Error("Contact creation failed")),
      };
      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      const attendees = [
        {
          email: "attendee@example.com",
          name: "Test Attendee",
          timeZone: "UTC",
          language: mockLanguage,
        },
      ];

      const result = await service.createContacts(attendees);
      expect(result).toEqual([]);
    });
  });

  describe("handleAttendeeNoShow", () => {
    it("should update event with no-show status", async () => {
      // Mock prisma bookingReference
      vi.spyOn(prisma.bookingReference, "findMany").mockResolvedValue([
        { uid: "event001", type: "salesforce_other_calendar" },
      ]);

      // Mock Event object description
      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [
          {
            name: "No_Show__c",
            type: "boolean",
            updateable: true,
            custom: true,
            label: "No Show",
            soapType: "xsd:boolean",
          },
        ],
      });

      // Mock queries for WhoId and contact/lead lookups
      mockConnection.query = vi
        .fn()
        .mockResolvedValueOnce({ records: [{ WhoId: "contact001" }] }) // Event query
        .mockResolvedValueOnce({ records: [{ Email: "attendee@example.com" }] }) // Contact query
        .mockResolvedValueOnce({ records: [] }); // Lead query (empty since we found contact)

      const mockSObject = {
        update: vi.fn().mockResolvedValue([{ success: true }]),
      };

      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      const eventId = "event001";
      const attendees = [{ email: "attendee@example.com", noShow: true }];
      await service.handleAttendeeNoShow(eventId, attendees);

      expect(mockConnection.sobject).toHaveBeenCalledWith("Event");
      expect(mockSObject.update).toHaveBeenCalledWith({
        Id: eventId,
        No_Show__c: true,
      });
    });

    it("should handle no-show update failure", async () => {
      // Mock prisma bookingReference
      vi.spyOn(prisma.bookingReference, "findMany").mockResolvedValue([
        { uid: "event001", type: "salesforce_other_calendar" },
      ]);

      // Mock Event object description
      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [
          {
            name: "No_Show__c",
            type: "boolean",
            updateable: true,
            custom: true,
            label: "No Show",
            soapType: "xsd:boolean",
          },
        ],
      });

      // Mock queries for WhoId and contact/lead lookups
      mockConnection.query = vi
        .fn()
        .mockResolvedValueOnce({ records: [{ WhoId: "contact001" }] }) // Event query
        .mockResolvedValueOnce({ records: [{ Email: "attendee@example.com" }] }) // Contact query
        .mockResolvedValueOnce({ records: [] }); // Lead query (empty since we found contact)

      const mockError = new Error("No-show update failed");
      const mockSObject = {
        update: vi.fn().mockRejectedValue(mockError),
      };

      mockConnection.sobject = vi.fn().mockReturnValue(mockSObject);

      const attendees = [{ email: "attendee@example.com", noShow: true }];
      await expect(service.handleAttendeeNoShow("event001", attendees)).rejects.toThrow(
        "No-show update failed"
      );
    });
  });
});
