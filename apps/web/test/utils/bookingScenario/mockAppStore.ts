import {
  calendarServicesMapMock,
  videoAdaptersMapMock,
  paymentAppMapMock,
  crmServicesMapMock,
} from "../../../../../tests/libs/__mocks__/app-store";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

const log = logger.getSubLogger({ prefix: ["[mockAppStore]"] });

export class MockCalendarService implements Calendar {
  credential: CredentialPayload;
  private appKey: string;
  private calendarData: any;

  public createEventCalls: {
    args: { calEvent: CalendarEvent; credentialId: number; externalCalendarId?: string };
  }[] = [];
  public updateEventCalls: {
    args: { uid: string; calEvent: CalendarEvent; externalCalendarId?: string | null };
  }[] = [];
  public deleteEventCalls: {
    args: { uid: string; calEvent: CalendarEvent; externalCalendarId?: string | null };
  }[] = [];
  public getAvailabilityCalls: {
    args: { dateFrom: string; dateTo: string; selectedCalendars: IntegrationCalendar[] };
  }[] = [];

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.appKey = credential.appId || "";
    this.calendarData = {};
  }

  setCalendarData(calendarData: any) {
    this.calendarData = calendarData;
  }

  async createEvent(
    calEvent: CalendarEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    this.createEventCalls.push({ args: { calEvent, credentialId, externalCalendarId } });

    if (this.calendarData?.creationCrash) {
      throw new Error("MockCalendarService.createEvent fake error");
    }

    const app = this.appKey
      ? appStoreMetadata[this.appKey as keyof typeof appStoreMetadata]
      : { type: "calendar" };
    const isGoogleMeetLocation = calEvent?.location === "GoogleMeet";

    return Promise.resolve({
      id: this.calendarData.create?.id || "MOCK_ID",
      type: app.type,
      additionalInfo: {},
      uid: this.calendarData.create?.uid || "MOCK_UID",
      password: "",
      url: "",
      hangoutLink:
        (isGoogleMeetLocation
          ? this.calendarData.create?.appSpecificData?.googleCalendar?.hangoutLink
          : undefined) || "",
    });
  }

  async updateEvent(
    uid: string,
    calEvent: CalendarEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType> {
    this.updateEventCalls.push({ args: { uid, calEvent, externalCalendarId } });

    if (this.calendarData?.updationCrash) {
      throw new Error("MockCalendarService.updateEvent fake error");
    }

    const app = this.appKey
      ? appStoreMetadata[this.appKey as keyof typeof appStoreMetadata]
      : { type: "calendar" };

    return Promise.resolve({
      id: this.calendarData.update?.id || "UPDATED_MOCK_ID",
      type: app.type,
      additionalInfo: {},
      uid: this.calendarData.update?.uid || "UPDATED_MOCK_ID",
      password: "",
      url: "",
    });
  }

  async deleteEvent(uid: string, calEvent: CalendarEvent, externalCalendarId?: string | null): Promise<void> {
    this.deleteEventCalls.push({ args: { uid, calEvent, externalCalendarId } });
    return Promise.resolve();
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[]> {
    this.getAvailabilityCalls.push({ args: { dateFrom, dateTo, selectedCalendars } });

    if (this.calendarData?.getAvailabilityCrash) {
      throw new Error("MockCalendarService.getAvailability fake error");
    }

    return Promise.resolve(this.calendarData.busySlots || []);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }
}

export class MockVideoAdapter {
  private credential: CredentialPayload;
  private appKey: string;
  private videoData: any;
  private shouldCrashOnCreate = false;
  private shouldCrashOnUpdate = false;

  public createMeetingCalls: { args: any[] }[] = [];
  public updateMeetingCalls: { args: any[] }[] = [];
  public deleteMeetingCalls: { args: any[] }[] = [];

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.appKey = credential.appId || "";
    this.videoData = {
      password: "mock-password",
      id: "mock-id",
      url: "https://mock-video-url.com",
    };
  }

  setVideoData(videoData: any) {
    this.videoData = videoData;
  }

  setCrashOnCreate(shouldCrash: boolean) {
    this.shouldCrashOnCreate = shouldCrash;
  }

  setCrashOnUpdate(shouldCrash: boolean) {
    this.shouldCrashOnUpdate = shouldCrash;
  }

  async createMeeting(event: CalendarEvent): Promise<VideoCallData> {
    this.createMeetingCalls.push({ args: [event] });

    if (this.shouldCrashOnCreate) {
      throw new Error("MockVideoAdapter.createMeeting fake error");
    }

    const app = this.appKey
      ? appStoreMetadata[this.appKey as keyof typeof appStoreMetadata]
      : { type: "video" };

    return Promise.resolve({
      type: app.type,
      ...this.videoData,
    });
  }

  async updateMeeting(bookingRef: any, event: CalendarEvent): Promise<VideoCallData> {
    this.updateMeetingCalls.push({ args: [bookingRef, event] });

    if (this.shouldCrashOnUpdate) {
      throw new Error("MockVideoAdapter.updateMeeting fake error");
    }

    if (!bookingRef.type) {
      throw new Error("bookingRef.type is not defined");
    }

    if (!event.organizer) {
      throw new Error("calEvent.organizer is not defined");
    }

    const app = this.appKey
      ? appStoreMetadata[this.appKey as keyof typeof appStoreMetadata]
      : { type: "video" };

    return Promise.resolve({
      type: app.type,
      ...this.videoData,
    });
  }

  async deleteMeeting(uid: string): Promise<unknown> {
    this.deleteMeetingCalls.push({ args: [uid] });

    return Promise.resolve({});
  }

  async getAvailability(dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }
}

export class MockPaymentService {
  private credential: CredentialPayload;
  private appKey: string;
  private paymentData: any;

  public chargeCardCalls: { args: any[] }[] = [];
  public createPaymentCalls: { args: any[] }[] = [];

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.appKey = credential.appId || "";
    this.paymentData = {
      externalId: "mock-payment-id",
      paymentUid: "mock-payment-uid",
    };
  }

  setPaymentData(paymentData: any) {
    this.paymentData = paymentData;
  }

  async chargeCard(payment: any, amount: number) {
    this.chargeCardCalls.push({ args: [payment, amount] });
    return Promise.resolve({
      externalId: this.paymentData.externalId,
      id: this.paymentData.paymentUid,
    });
  }

  async create(payment: any) {
    this.createPaymentCalls.push({ args: [payment] });
    return Promise.resolve({
      externalId: this.paymentData.externalId,
      id: this.paymentData.paymentUid,
    });
  }

  async update(payment: any) {
    return Promise.resolve({
      success: true,
    });
  }

  async refund(payment: any) {
    return Promise.resolve({
      success: true,
    });
  }
}

export class MockCrmService {
  private credential: CredentialPayload;
  private appKey: string;
  private crmData: any;

  public createContactCalls: { args: any[] }[] = [];
  public getContactsCalls: { args: any[] }[] = [];
  public createEventCalls: { args: any[] }[] = [];

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.appKey = credential.appId || "";
    this.crmData = {};
  }

  setCrmData(crmData: any) {
    this.crmData = crmData;
  }

  async createContact(contact: any) {
    this.createContactCalls.push({ args: [contact] });
    if (this.crmData?.createContacts) {
      return Promise.resolve(this.crmData.createContacts);
    }
    return Promise.resolve([]);
  }

  async getContacts(email: string) {
    this.getContactsCalls.push({ args: [email] });
    if (this.crmData?.getContacts) {
      const contactsQueried = this.crmData.getContacts;
      const contactsOfEmail = contactsQueried.filter((contact: any) => contact.email === email);
      return Promise.resolve(contactsOfEmail);
    }
    return Promise.resolve([]);
  }

  async createEvent(event: any) {
    this.createEventCalls.push({ args: [event] });
    return Promise.resolve({});
  }
}

export function createMockCalendarService(appKey: string, calendarData?: any) {
  const app = appStoreMetadata[appKey as keyof typeof appStoreMetadata];
  const credential = {
    id: 1,
    type: "oauth",
    key: "MOCK_CREDENTIAL",
    userId: 1,
    teamId: null,
    appId: app.slug,
    user: {
      email: "MOCK_USER_EMAIL",
    },
    invalid: false,
    delegatedTo: null,
  };

  class SpecificMockCalendarService extends MockCalendarService {
    constructor(cred: CredentialPayload) {
      super(cred);
      if (calendarData) {
        this.setCalendarData(calendarData);
      }
    }
  }

  const calendarServiceFactory = (cred: CredentialPayload): Calendar => {
    return new SpecificMockCalendarService(cred);
  };

  calendarServicesMapMock[appKey as keyof typeof calendarServicesMapMock] = calendarServiceFactory as any;

  return SpecificMockCalendarService;
}

export function createMockVideoAdapter(
  appKey: string,
  videoData?: any,
  options?: { crashOnCreate?: boolean; crashOnUpdate?: boolean }
) {
  const app = appStoreMetadata[appKey as keyof typeof appStoreMetadata];
  const credential = {
    id: 1,
    type: "oauth",
    key: "MOCK_CREDENTIAL",
    userId: 1,
    teamId: null,
    appId: app.slug,
    user: {
      email: "MOCK_USER_EMAIL",
    },
    invalid: false,
    delegatedTo: null,
  };

  const mockAdapter = new MockVideoAdapter(credential);
  if (videoData) {
    mockAdapter.setVideoData(videoData);
  }
  if (options?.crashOnCreate) {
    mockAdapter.setCrashOnCreate(true);
  }
  if (options?.crashOnUpdate) {
    mockAdapter.setCrashOnUpdate(true);
  }

  const videoAdapterFactory = (cred: CredentialPayload): VideoApiAdapter => {
    return {
      createMeeting: async (event: CalendarEvent) => {
        return mockAdapter.createMeeting(event);
      },
      updateMeeting: async (bookingRef: any, event: CalendarEvent) => {
        return mockAdapter.updateMeeting(bookingRef, event);
      },
      deleteMeeting: async (uid: string) => {
        return mockAdapter.deleteMeeting(uid);
      },
      getAvailability: async (dateFrom?: string, dateTo?: string) => {
        return mockAdapter.getAvailability(dateFrom, dateTo);
      },
    } as unknown as VideoApiAdapter;
  };

  videoAdaptersMapMock[appKey as keyof typeof videoAdaptersMapMock] = videoAdapterFactory as any;

  return {
    factory: videoAdapterFactory,
    adapter: mockAdapter,
  };
}

export function createMockPaymentService(appKey: string, paymentData?: any) {
  const app = appStoreMetadata[appKey as keyof typeof appStoreMetadata];
  const credential = {
    id: 1,
    type: "oauth",
    key: "MOCK_CREDENTIAL",
    userId: 1,
    teamId: null,
    appId: app.slug,
    user: {
      email: "MOCK_USER_EMAIL",
    },
    invalid: false,
    delegatedToId: null,
  };

  class SpecificMockPaymentService extends MockPaymentService {
    constructor(cred: CredentialPayload) {
      super(cred);
      if (paymentData) {
        this.setPaymentData(paymentData);
      }
    }
  }

  const mockInstance = new SpecificMockPaymentService(credential);

  paymentAppMapMock[appKey as keyof typeof paymentAppMapMock] = ((cred: CredentialPayload) =>
    mockInstance) as any;

  return {
    PaymentService: SpecificMockPaymentService,
    service: mockInstance,
  };
}

export function createMockCrmService(appKey: string, crmData?: any) {
  const app = appStoreMetadata[appKey as keyof typeof appStoreMetadata];
  const credential = {
    id: 1,
    type: "oauth",
    key: "MOCK_CREDENTIAL",
    userId: 1,
    teamId: null,
    appId: app.slug,
    user: {
      email: "MOCK_USER_EMAIL",
    },
    invalid: false,
    delegatedToId: null,
  };

  class SpecificMockCrmService extends MockCrmService {
    constructor(cred: CredentialPayload) {
      super(cred);
      if (crmData) {
        this.setCrmData(crmData);
      }
    }
  }

  const mockInstance = new SpecificMockCrmService(credential);

  crmServicesMapMock[appKey as keyof typeof crmServicesMapMock] = ((cred: CredentialPayload) =>
    mockInstance) as any;

  return {
    CrmService: SpecificMockCrmService,
    service: mockInstance,
  };
}

export class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockError";
  }
}
