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

function createMockPaymentService(_credentials?: unknown) {
  return {
    async create(
      payment: { amount: number; currency: string },
      bookingId: number,
      _userId: number,
      _username: string | null,
      _bookerName: string | null,
      paymentOption: string,
      _bookerEmail: string,
      _bookerPhoneNumber?: string | null,
      _selectedEventTypeTitle?: string,
      _eventTitle?: string
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
    },
    async collectCard() {
      return { success: true };
    },
    async chargeCard() {
      return { success: true };
    },
    async refund() {
      return { success: true };
    },
    async deletePayment() {
      return { success: true };
    },
    async afterPayment(
      event: Record<string, unknown>,
      _booking: Record<string, unknown>,
      paymentData: { paymentOption?: string; amount: number; currency: string }
    ) {
      const { sendAwaitingPaymentEmailAndSMS } = await import("@calcom/emails/email-manager");
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
    },
  };
}

vi.mock("@calcom/app-store/stripepayment/index", () => ({
  PaymentService: createMockPaymentService,
}));

vi.mock("@calcom/app-store/paypal/index", () => ({
  PaymentService: createMockPaymentService,
}));

vi.mock("@calcom/app-store/alby/index", () => ({
  PaymentService: createMockPaymentService,
}));

vi.mock("@calcom/app-store/hitpay/index", () => ({
  PaymentService: createMockPaymentService,
}));

vi.mock("@calcom/app-store/btcpayserver/index", () => ({
  PaymentService: createMockPaymentService,
}));

vi.mock("@calcom/app-store/mock-payment-app/index", () => ({
  PaymentService: createMockPaymentService,
}));

vi.mock("@calcom/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    stripepayment: Promise.resolve({ PaymentService: createMockPaymentService }),
    paypal: Promise.resolve({ PaymentService: createMockPaymentService }),
    alby: Promise.resolve({ PaymentService: createMockPaymentService }),
    hitpay: Promise.resolve({ PaymentService: createMockPaymentService }),
    btcpayserver: Promise.resolve({ PaymentService: createMockPaymentService }),
    "mock-payment-app": Promise.resolve({ PaymentService: createMockPaymentService }),
  },
}));
