import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  NewCalendarEventType,
  IntegrationCalendar,
  CalendarServiceEvent,
  CalEventResponses,
} from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, ContactCreateInput, CrmEvent } from "@calcom/types/CrmService";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";

import type { IAppStore, ICalendarService, ICrmService, IVideoService } from "./IAppStore";

export interface TestCalendarConfig {
  createEventResult?: Partial<NewCalendarEventType>;
  updateEventResult?: Partial<NewCalendarEventType>;
  busySlots?: EventBusyDate[];
  shouldCrashOnCreate?: boolean;
  shouldCrashOnUpdate?: boolean;
  shouldCrashOnAvailability?: boolean;
}

export interface TestCrmConfig {
  contacts?: Contact[];
  createEventResult?: Partial<CrmEvent>;
  updateEventResult?: Partial<CrmEvent>;
}

export interface TestVideoConfig {
  meetingData?: Partial<VideoCallData>;
  shouldCrashOnCreate?: boolean;
}

class TestCalendar implements Calendar {
  constructor(private config: TestCalendarConfig = {}) {}

  async createEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    if (this.config.shouldCrashOnCreate) {
      throw new Error("TestCalendar.createEvent fake error");
    }
    return {
      uid: "MOCK_ID",
      id: "MOCK_ID",
      type: "test_calendar",
      password: "MOCK_PASS",
      url: "http://mock-test.example.com",
      additionalInfo: {},
      ...this.config.createEventResult,
    };
  }

  async updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    if (this.config.shouldCrashOnUpdate) {
      throw new Error("TestCalendar.updateEvent fake error");
    }
    return {
      uid: "UPDATED_MOCK_ID",
      id: "UPDATED_MOCK_ID",
      type: "test_calendar",
      password: "MOCK_PASS",
      url: "http://mock-test.example.com",
      additionalInfo: {},
      ...this.config.updateEventResult,
    };
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<unknown> {
    return Promise.resolve();
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    if (this.config.shouldCrashOnAvailability) {
      throw new Error("TestCalendar.getAvailability fake error");
    }
    return this.config.busySlots || [];
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return [];
  }
}

class TestCrm implements CRM {
  constructor(private config: TestCrmConfig = {}) {}

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent | undefined> {
    return {
      id: "MOCK_CRM_EVENT_ID",
      uid: "MOCK_CRM_EVENT_UID",
      type: "test_crm",
      ...this.config.createEventResult,
    };
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent> {
    return {
      id: "UPDATED_MOCK_CRM_EVENT_ID",
      uid: "UPDATED_MOCK_CRM_EVENT_UID",
      type: "test_crm",
      ...this.config.updateEventResult,
    };
  }

  async deleteEvent(uid: string, event: CalendarEvent): Promise<void> {
    return Promise.resolve();
  }

  async getContacts({
    emails,
  }: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
  }): Promise<Contact[]> {
    return this.config.contacts || [];
  }

  async createContacts(
    contactsToCreate: ContactCreateInput[],
    organizerEmail?: string,
    calEventResponses?: CalEventResponses | null
  ): Promise<Contact[]> {
    return contactsToCreate.map((contact, index) => ({
      id: `MOCK_CONTACT_${index}`,
      email: contact.email,
      ownerId: "MOCK_OWNER_ID",
    }));
  }

  getAppOptions() {
    return {};
  }
}

class TestVideoAdapter {
  constructor(private config: TestVideoConfig = {}) {}

  async createMeeting(event: CalendarEvent): Promise<VideoCallData> {
    if (this.config.shouldCrashOnCreate) {
      throw new Error("TestVideoAdapter.createMeeting fake error");
    }
    return {
      type: "test_video",
      id: "MOCK_MEETING_ID",
      password: "MOCK_PASS",
      url: "http://mock-video.example.com",
      ...this.config.meetingData,
    };
  }

  async updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> {
    return {
      type: "test_video",
      id: "UPDATED_MOCK_MEETING_ID",
      password: "MOCK_PASS",
      url: "http://mock-video.example.com",
      ...this.config.meetingData,
    };
  }

  async deleteMeeting(uid: string): Promise<unknown> {
    return Promise.resolve();
  }

  async getAvailability(): Promise<EventBusyDate[]> {
    return [];
  }
}

class TestCalendarService implements ICalendarService {
  constructor(private config: TestCalendarConfig = {}) {}

  async getService(credential: CredentialForCalendarService): Promise<Calendar | null> {
    return new TestCalendar(this.config);
  }
}

class TestCrmService implements ICrmService {
  constructor(private config: TestCrmConfig = {}) {}

  async getService(credential: CredentialPayload, appOptions: any): Promise<CRM | null> {
    return new TestCrm(this.config);
  }
}

class TestVideoService implements IVideoService {
  constructor(private config: TestVideoConfig = {}) {}

  async getService(credential: CredentialPayload): Promise<any> {
    return new TestVideoAdapter(this.config);
  }
}

export class TestAppStore implements IAppStore {
  calendar: ICalendarService;
  crm: ICrmService;
  video: IVideoService;

  constructor(
    config: {
      calendar?: TestCalendarConfig;
      crm?: TestCrmConfig;
      video?: TestVideoConfig;
    } = {}
  ) {
    this.calendar = new TestCalendarService(config.calendar);
    this.crm = new TestCrmService(config.crm);
    this.video = new TestVideoService(config.video);
  }
}
