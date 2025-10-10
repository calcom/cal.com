import matchers from "@testing-library/jest-dom/matchers";
import ResizeObserver from "resize-observer-polyfill";
import { vi, expect } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { CalendarService } from "@calcom/types/Calendar";

global.ResizeObserver = ResizeObserver;
const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

expect.extend(matchers);

class MockExchangeCalendarService implements CalendarService {
  private credential: any;
  
  constructor(credential?: any) {
    this.credential = credential;
  }
  
  getCredentialId?(): number {
    return this.credential?.id || 1;
  }

  async watchCalendar(args: { calendarId: string; eventTypeIds: any }) {
    const { SelectedCalendarRepository } = await import("@calcom/lib/server/repository/selectedCalendar");
    
    // Check if there's already a subscription for this calendarId (like the real implementation)
    const allCalendarsWithSubscription = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential?.id || 1,
        externalId: args.calendarId,
        integration: "google_calendar",
        googleChannelId: {
          not: null,
        },
      },
    });

    const otherCalendarsWithSameSubscription = allCalendarsWithSubscription.filter(
      (sc) => !args.eventTypeIds?.includes(sc.eventTypeId)
    );

    let googleChannelProps;
    
    if (!otherCalendarsWithSameSubscription.length) {
      // No existing subscription, create a new one by calling Google API
      const { calendarMock } = await import("./packages/app-store/googlecalendar/lib/__mocks__/googleapis");
      const response = await calendarMock.calendar_v3.Calendar().events.watch({
        calendarId: args.calendarId,
        requestBody: {
          type: "web_hook",
          token: process.env.GOOGLE_WEBHOOK_TOKEN,
        },
      });
      
      googleChannelProps = {
        googleChannelId: response.data.id,
        googleChannelKind: response.data.kind,
        googleChannelResourceId: response.data.resourceId,
        googleChannelResourceUri: response.data.resourceUri,
        googleChannelExpiration: response.data.expiration,
      };
    } else {
      // Reuse existing subscription without calling Google API
      const existingSubscription = otherCalendarsWithSameSubscription[0];
      googleChannelProps = {
        googleChannelId: existingSubscription.googleChannelId,
        googleChannelKind: existingSubscription.googleChannelKind,
        googleChannelResourceId: existingSubscription.googleChannelResourceId,
        googleChannelResourceUri: existingSubscription.googleChannelResourceUri,
        googleChannelExpiration: existingSubscription.googleChannelExpiration,
      };
    }

    // Update the SelectedCalendar records with Google channel properties
    await SelectedCalendarRepository.upsertManyForEventTypeIds({
      data: {
        externalId: args.calendarId,
        integration: "google_calendar",
        credentialId: this.credential?.id || 1,
        userId: this.credential?.userId || 1,
        ...googleChannelProps,
        delegationCredentialId: null,
      },
      eventTypeIds: args.eventTypeIds,
    });

    return googleChannelProps;
  }

  async unwatchCalendar(args: { calendarId: string; eventTypeIds: any }) {
    const { SelectedCalendarRepository } = await import("@calcom/lib/server/repository/selectedCalendar");
    
    // Check if there are other calendars still using the same subscription (like the real implementation)
    const allCalendarsWithSubscription = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential?.id || 1,
        externalId: args.calendarId,
        integration: "google_calendar",
        googleChannelId: {
          not: null,
        },
      },
    });

    const calendarsWithSameExternalIdToBeStillWatched = allCalendarsWithSubscription.filter(
      (sc) => !args.eventTypeIds?.includes(sc.eventTypeId)
    );

    // Only call Google API to stop subscription if no other calendars are using it
    if (!calendarsWithSameExternalIdToBeStillWatched.length) {
      const { calendarMock } = await import("./packages/app-store/googlecalendar/lib/__mocks__/googleapis");
      await calendarMock.calendar_v3.Calendar().channels.stop({
        requestBody: {
          id: "test-channel-id",
          resourceId: "test-resource-id",
        },
      });
    }

    // Clear the Google channel properties for the specific eventTypeIds being unwatched
    await SelectedCalendarRepository.upsertManyForEventTypeIds({
      data: {
        externalId: args.calendarId,
        integration: "google_calendar", 
        credentialId: this.credential?.id || 1,
        userId: this.credential?.userId || 1,
        // Always clear properties for the specific calendars being unwatched
        googleChannelId: null,
        googleChannelKind: null,
        googleChannelResourceId: null,
        googleChannelResourceUri: null,
        googleChannelExpiration: null,
        delegationCredentialId: null,
      },
      eventTypeIds: args.eventTypeIds,
    });

    // Update the cache to reflect the remaining watched calendars
    const remainingCalendars = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential?.id || 1,
        integration: "google_calendar",
        googleChannelId: {
          not: null,
        },
      },
      select: {
        externalId: true,
      },
    });

    const uniqueExternalIds = [...new Set(remainingCalendars.map(cal => cal.externalId))];
    
    // Update or create cache entry with remaining external IDs
    const prismock = (await import("./tests/libs/__mocks__/prisma")).default;
    await prismock.calendarCache.upsert({
      where: {
        credentialId: this.credential?.id || 1,
      },
      create: {
        credentialId: this.credential?.id || 1,
        key: JSON.stringify({
          items: uniqueExternalIds.map(id => ({ id })),
        }),
        value: "test-value",
        expiresAt: new Date(Date.now() + 100000000),
      },
      update: {
        key: JSON.stringify({
          items: uniqueExternalIds.map(id => ({ id })),
        }),
      },
    });

    return {};
  }
  
  async createEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async updateEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async deleteEvent() {}
  async getAvailability() {
    return [];
  }
  async listCalendars() {
    return [];
  }
}

vi.mock("@calcom/exchangecalendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@calcom/exchange2013calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@calcom/exchange2016calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

const MOCK_PAYMENT_UID = "MOCK_PAYMENT_UID";

class MockPaymentService {
  constructor(credentials?: any) {
    this.credentials = credentials;
  }
  
  private credentials: any;
  
  async create(
    payment: any,
    bookingId: number,
    userId: number,
    username: string | null,
    bookerName: string | null,
    paymentOption: any,
    bookerEmail: string,
    bookerPhoneNumber?: string | null,
    selectedEventTypeTitle?: string,
    eventTitle?: string
  ) {
    const { default: prismaMock } = await import("./tests/libs/__mocks__/prisma");
    const externalId = "mock_payment_external_id";
    
    const paymentCreateData = {
      uid: MOCK_PAYMENT_UID,
      appId: null,
      bookingId,
      fee: 10,
      success: false,
      refunded: false,
      data: {},
      externalId,
      paymentOption,
      amount: payment.amount,
      currency: payment.currency,
    };

    const createdPayment = await prismaMock.payment.create({
      data: paymentCreateData,
    });
    
    return createdPayment;
  }
  async collectCard() {
    return { success: true };
  }
  async chargeCard() {
    return { success: true };
  }
  async refund() {
    return { success: true };
  }
  async deletePayment() {
    return { success: true };
  }
  async afterPayment(event: any, booking: any, paymentData: any) {
    const { sendAwaitingPaymentEmailAndSMS } = await import("@calcom/emails");
    await sendAwaitingPaymentEmailAndSMS({
      ...event,
      paymentInfo: {
        link: "http://mock-payment.example.com/",
        paymentOption: paymentData.paymentOption || "ON_BOOKING",
        amount: paymentData.amount,
        currency: paymentData.currency,
      },
    });
    return { success: true };
  }
}

vi.mock("@calcom/app-store/stripepayment/index", () => ({
  PaymentService: MockPaymentService,
}));

vi.mock("@calcom/app-store/paypal/index", () => ({
  PaymentService: MockPaymentService,
}));

vi.mock("@calcom/app-store/alby/index", () => ({
  PaymentService: MockPaymentService,
}));

vi.mock("@calcom/app-store/hitpay/index", () => ({
  PaymentService: MockPaymentService,
}));

vi.mock("@calcom/app-store/btcpayserver/index", () => ({
  PaymentService: MockPaymentService,
}));

vi.mock("@calcom/app-store/mock-payment-app/index", () => ({
  PaymentService: MockPaymentService,
}));

vi.mock("@calcom/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    stripepayment: MockPaymentService,
    paypal: MockPaymentService,
    alby: MockPaymentService,
    hitpay: MockPaymentService,
    btcpayserver: MockPaymentService,
    "mock-payment-app": MockPaymentService,
  },
}));

vi.mock("@calcom/app-store/calendar.services.generated", () => ({
  CalendarServiceMap: {
    applecalendar: MockExchangeCalendarService,
    caldavcalendar: MockExchangeCalendarService,
    exchange2013calendar: MockExchangeCalendarService,
    exchange2016calendar: MockExchangeCalendarService,
    exchangecalendar: MockExchangeCalendarService,
    feishucalendar: MockExchangeCalendarService,
    googlecalendar: MockExchangeCalendarService,
    "ics-feedcalendar": MockExchangeCalendarService,
    larkcalendar: MockExchangeCalendarService,
    office365calendar: MockExchangeCalendarService,
    zohocalendar: MockExchangeCalendarService,
  },
}));

vi.mock("@calcom/app-store/video.adapters.generated", () => ({
  VideoApiAdapterMap: {
    dailyvideo: vi.fn(),
    huddle01video: vi.fn(),
    jelly: vi.fn(),
    jitsivideo: vi.fn(),
    nextcloudtalk: vi.fn(),
    office365video: vi.fn(),
    shimmervideo: vi.fn(),
    sylapsvideo: vi.fn(),
    tandemvideo: vi.fn(),
    webex: vi.fn(),
    zoomvideo: vi.fn(),
  },
}));
