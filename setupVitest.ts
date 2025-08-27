import matchers from "@testing-library/jest-dom/matchers";
import ResizeObserver from "resize-observer-polyfill";
import { vi, expect } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { CalendarService } from "@calcom/types/Calendar";
import prismaMock from "./tests/libs/__mocks__/prisma";
import { v4 as uuidv4 } from "uuid";

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
  lib: {
    PaymentService: MockPaymentService,
  },
}));

vi.mock("@calcom/app-store/paypal/index", () => ({
  lib: {
    PaymentService: MockPaymentService,
  },
}));

vi.mock("@calcom/app-store/alby/index", () => ({
  lib: {
    PaymentService: MockPaymentService,
  },
}));

vi.mock("@calcom/app-store/hitpay/index", () => ({
  lib: {
    PaymentService: MockPaymentService,
  },
}));

vi.mock("@calcom/app-store/btcpayserver/index", () => ({
  lib: {
    PaymentService: MockPaymentService,
  },
}));

vi.mock("@calcom/app-store/mock-payment-app/index", () => ({
  lib: {
    PaymentService: MockPaymentService,
  },
}));

vi.mock("@calcom/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    stripepayment: Promise.resolve({ lib: { PaymentService: MockPaymentService } }),
    paypal: Promise.resolve({ lib: { PaymentService: MockPaymentService } }),
    alby: Promise.resolve({ lib: { PaymentService: MockPaymentService } }),
    hitpay: Promise.resolve({ lib: { PaymentService: MockPaymentService } }),
    btcpayserver: Promise.resolve({ lib: { PaymentService: MockPaymentService } }),
    "mock-payment-app": Promise.resolve({ lib: { PaymentService: MockPaymentService } }),
  },
}));
