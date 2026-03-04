import type { CalEventResponses, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Contact, ContactCreateInput, CRM, CrmEvent } from "@calcom/types/CrmService";
import type { TFunction } from "i18next";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/app-store/_utils/getCrm");

import getCrm from "@calcom/app-store/_utils/getCrm";
import CrmManager from "./crmManager";

const mockedGetCrm: ReturnType<typeof vi.mocked<typeof getCrm>> = vi.mocked(getCrm);

/**
 * A realistic fake CRM service that maintains in-memory state.
 * Implements the full CRM interface with actual behavior
 * rather than vi.fn() stubs.
 */
class FakeCrmService implements CRM {
  private contacts: Contact[] = [];
  private events: CrmEvent[] = [];
  private appOptions: Record<string, unknown>;
  private noShowCalls: Array<{ bookingUid: string; attendees: { email: string; noShow: boolean }[] }> = [];

  constructor(appOptions: Record<string, unknown> = {}) {
    this.appOptions = appOptions;
  }

  getAppOptions(): Record<string, unknown> {
    return this.appOptions;
  }

  async getContacts({
    emails,
  }: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
  }): Promise<Contact[]> {
    let emailList: string[];
    if (Array.isArray(emails)) {
      emailList = emails;
    } else {
      emailList = [emails];
    }
    return this.contacts.filter((c) => emailList.includes(c.email));
  }

  async createContacts(
    contactsToCreate: ContactCreateInput[],
    _organizerEmail?: string,
    _calEventResponses?: CalEventResponses | null
  ): Promise<Contact[]> {
    const created: Contact[] = contactsToCreate.map((c, i) => ({
      id: `fake-contact-${this.contacts.length + i}`,
      email: c.email,
    }));
    this.contacts.push(...created);
    return created;
  }

  async createEvent(_event: CalendarEvent, _contacts: Contact[]): Promise<CrmEvent> {
    const crmEvent: CrmEvent = {
      id: `fake-event-${this.events.length}`,
      uid: `fake-uid-${this.events.length}`,
    };
    this.events.push(crmEvent);
    return crmEvent;
  }

  async updateEvent(uid: string, _event: CalendarEvent): Promise<CrmEvent> {
    return { id: uid };
  }

  async deleteEvent(_uid: string, _event: CalendarEvent): Promise<void> {
    return;
  }

  async handleAttendeeNoShow(
    bookingUid: string,
    attendees: { email: string; noShow: boolean }[]
  ): Promise<void> {
    this.noShowCalls.push({ bookingUid, attendees });
  }

  // Test helpers to inspect internal state
  getStoredContacts(): Contact[] {
    return [...this.contacts];
  }

  getStoredEvents(): CrmEvent[] {
    return [...this.events];
  }

  getNoShowCalls(): Array<{ bookingUid: string; attendees: { email: string; noShow: boolean }[] }> {
    return [...this.noShowCalls];
  }

  seedContacts(contacts: Contact[]): void {
    this.contacts.push(...contacts);
  }
}

const tFunc = vi.fn((key: string) => key) as unknown as TFunction;

function createCredential(): CredentialPayload {
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

describe("CrmManager Integration Tests", () => {
  let fakeCrm: FakeCrmService;

  beforeEach(() => {
    vi.clearAllMocks();
    fakeCrm = new FakeCrmService();
    mockedGetCrm.mockResolvedValue(fakeCrm);
  });

  test("scenario 1: full booking flow with new attendee — creates contact then event", async () => {
    const crmManager = new CrmManager(createCredential());
    const event = createCalendarEvent();

    const result = await crmManager.createEvent(event);

    // Contact was created in the fake CRM
    const storedContacts = fakeCrm.getStoredContacts();
    expect(storedContacts).toHaveLength(1);
    expect(storedContacts[0].email).toBe("attendee1@test.com");

    // Event was created
    const storedEvents = fakeCrm.getStoredEvents();
    expect(storedEvents).toHaveLength(1);
    expect(result).toEqual(storedEvents[0]);
  });

  test("scenario 2: full booking flow with existing attendee — reuses contact, skips creation", async () => {
    // Pre-seed the fake CRM with an existing contact
    fakeCrm.seedContacts([{ id: "existing-contact-1", email: "attendee1@test.com" }]);

    const crmManager = new CrmManager(createCredential());
    const event = createCalendarEvent();

    const result = await crmManager.createEvent(event);

    // No new contacts created — still just the seeded one
    const storedContacts = fakeCrm.getStoredContacts();
    expect(storedContacts).toHaveLength(1);
    expect(storedContacts[0].id).toBe("existing-contact-1");

    // Event was still created
    const storedEvents = fakeCrm.getStoredEvents();
    expect(storedEvents).toHaveLength(1);
    expect(result).toEqual(storedEvents[0]);
  });

  test("scenario 3: mixed attendees — only creates missing contacts, event includes all", async () => {
    // Pre-seed 1 of 3 contacts
    fakeCrm.seedContacts([{ id: "existing-contact-1", email: "attendee1@test.com" }]);

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

    // 1 existing + 2 newly created = 3 total contacts
    const storedContacts = fakeCrm.getStoredContacts();
    expect(storedContacts).toHaveLength(3);

    const contactEmails = storedContacts.map((c) => c.email);
    expect(contactEmails).toContain("attendee1@test.com");
    expect(contactEmails).toContain("attendee2@test.com");
    expect(contactEmails).toContain("attendee3@test.com");

    // Event was created
    expect(fakeCrm.getStoredEvents()).toHaveLength(1);
  });

  test("scenario 4: guest filtering with ignoreGuests=true — only first attendee processed", async () => {
    fakeCrm = new FakeCrmService({ ignoreGuests: true });
    mockedGetCrm.mockResolvedValue(fakeCrm);

    const event = createCalendarEvent({
      attendees: [
        {
          email: "main@test.com",
          name: "Main Attendee",
          timeZone: "UTC",
          language: { locale: "en", translate: tFunc },
        },
        {
          email: "guest1@test.com",
          name: "Guest 1",
          timeZone: "UTC",
          language: { locale: "en", translate: tFunc },
        },
        {
          email: "guest2@test.com",
          name: "Guest 2",
          timeZone: "UTC",
          language: { locale: "en", translate: tFunc },
        },
      ],
    });

    const crmManager = new CrmManager(createCredential());
    await crmManager.createEvent(event);

    // Only the first attendee should have been processed
    const storedContacts = fakeCrm.getStoredContacts();
    expect(storedContacts).toHaveLength(1);
    expect(storedContacts[0].email).toBe("main@test.com");

    // Event still created
    expect(fakeCrm.getStoredEvents()).toHaveLength(1);
  });

  test("scenario 5: skipContactCreation=true — no contacts created, no event created", async () => {
    fakeCrm = new FakeCrmService({ skipContactCreation: true });
    mockedGetCrm.mockResolvedValue(fakeCrm);

    const crmManager = new CrmManager(createCredential());
    const result = await crmManager.createEvent(createCalendarEvent());

    // No contacts or events created
    expect(fakeCrm.getStoredContacts()).toHaveLength(0);
    expect(fakeCrm.getStoredEvents()).toHaveLength(0);
    expect(result).toBeUndefined();
  });

  test("scenario 6: no-show handling end-to-end — data reaches CRM service", async () => {
    const crmManager = new CrmManager(createCredential());
    const attendees = [
      { email: "attendee1@test.com", noShow: true },
      { email: "attendee2@test.com", noShow: false },
    ];

    await crmManager.handleAttendeeNoShow("booking-uid-123", attendees);

    const noShowCalls = fakeCrm.getNoShowCalls();
    expect(noShowCalls).toHaveLength(1);
    expect(noShowCalls[0].bookingUid).toBe("booking-uid-123");
    expect(noShowCalls[0].attendees).toEqual(attendees);
  });

  test("scenario 7: service caching — getCrm called only once across multiple operations", async () => {
    const crmManager = new CrmManager(createCredential());

    // Perform multiple operations on the same CrmManager instance
    await crmManager.createEvent(createCalendarEvent());
    await crmManager.updateEvent("uid-1", createCalendarEvent());
    await crmManager.getContacts({ emails: ["test@test.com"] });

    // getCrm should only have been called once (cached after first call)
    expect(mockedGetCrm).toHaveBeenCalledTimes(1);
  });

  test("scenario 8: error resilience — getCrm returns null, all methods gracefully return", async () => {
    mockedGetCrm.mockResolvedValue(null);
    const crmManager = new CrmManager(createCredential());

    // All methods should return undefined or empty without throwing
    const createResult = await crmManager.createEvent(createCalendarEvent());
    expect(createResult).toBeUndefined();

    const updateResult = await crmManager.updateEvent("uid-1", createCalendarEvent());
    expect(updateResult).toBeUndefined();

    const deleteResult = await crmManager.deleteEvent("uid-1", createCalendarEvent());
    expect(deleteResult).toBeUndefined();

    const contactsResult = await crmManager.getContacts({ emails: ["test@test.com"] });
    expect(contactsResult).toBeUndefined();

    const createContactsResult = await crmManager.createContacts([{ email: "new@test.com", name: "New" }]);
    expect(createContactsResult).toEqual([]);

    // handleAttendeeNoShow should not throw
    await expect(
      crmManager.handleAttendeeNoShow("booking-uid", [{ email: "a@test.com", noShow: true }])
    ).resolves.toBeUndefined();
  });
});
