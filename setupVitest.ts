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
  constructor() {}
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
