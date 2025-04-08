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

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.appKey = credential.appId || "";
    this.calendarData = {};
  }

  setCalendarData(calendarData: any) {
    this.calendarData = calendarData;
  }

  async createEvent(
    event: CalendarEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    if (this.calendarData?.creationCrash) {
      throw new Error("MockCalendarService.createEvent fake error");
    }

    const app = this.appKey
      ? appStoreMetadata[this.appKey as keyof typeof appStoreMetadata]
      : { type: "calendar" };
    const isGoogleMeetLocation = event?.location === "GoogleMeet";

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
    return Promise.resolve();
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[]> {
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

  async create(payment: any) {
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

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.appKey = credential.appId || "";
    this.crmData = {};
  }

  setCrmData(crmData: any) {
    this.crmData = crmData;
  }

  async createContact() {
    if (this.crmData?.createContacts) {
      return Promise.resolve(this.crmData.createContacts);
    }
    return Promise.resolve([]);
  }

  async getContacts(email: string) {
    if (this.crmData?.getContacts) {
      const contactsQueried = this.crmData.getContacts;
      const contactsOfEmail = contactsQueried.filter((contact: any) => contact.email === email);
      return Promise.resolve(contactsOfEmail);
    }
    return Promise.resolve([]);
  }

  async createEvent() {
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

  calendarServicesMapMock[appKey as keyof typeof calendarServicesMapMock] =
    SpecificMockCalendarService as any;

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

  const videoAdapterFactory = (cred: CredentialPayload): VideoApiAdapter => {
    const adapter = new MockVideoAdapter(cred);
    if (videoData) {
      adapter.setVideoData(videoData);
    }
    if (options?.crashOnCreate) {
      adapter.setCrashOnCreate(true);
    }
    if (options?.crashOnUpdate) {
      adapter.setCrashOnUpdate(true);
    }
    return adapter as unknown as VideoApiAdapter;
  };

  videoAdaptersMapMock[appKey as keyof typeof videoAdaptersMapMock] = videoAdapterFactory as any;

  return videoAdapterFactory;
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
    delegatedTo: null,
  };

  class SpecificMockPaymentService extends MockPaymentService {
    constructor(cred: CredentialPayload) {
      super(cred);
      if (paymentData) {
        this.setPaymentData(paymentData);
      }
    }
  }

  paymentAppMapMock[appKey as keyof typeof paymentAppMapMock] = SpecificMockPaymentService as any;

  return SpecificMockPaymentService;
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
    delegatedTo: null,
  };

  class SpecificMockCrmService extends MockCrmService {
    constructor(cred: CredentialPayload) {
      super(cred);
      if (crmData) {
        this.setCrmData(crmData);
      }
    }
  }

  crmServicesMapMock[appKey as keyof typeof crmServicesMapMock] = SpecificMockCrmService as any;

  return SpecificMockCrmService;
}

export class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockError";
  }
}
