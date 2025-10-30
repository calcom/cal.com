import { describe, expect, it, vi, beforeEach } from "vitest";

import { handlePayment } from "./handlePayment";

vi.mock("@calcom/app-store/zod-utils", () => ({
  eventTypeMetaDataSchemaWithTypedApps: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock("@calcom/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    stripepayment: Promise.resolve({
      PaymentService: class MockPaymentService {
        async create(paymentData: { amount: number; currency: string }) {
          return {
            ...paymentData,
            id: "mock-payment-id",
            externalId: "mock-external-id",
            success: true,
          };
        }

        async collectCard(paymentData: { amount: number; currency: string }) {
          return {
            ...paymentData,
            id: "mock-payment-id",
            externalId: "mock-external-id",
            success: true,
          };
        }

        async afterPayment() {
          return true;
        }
      },
    }),
  },
}));

describe("handlePayment", () => {
  const mockBooking = {
    id: 123,
    userId: 456,
    startTime: { toISOString: () => "2025-03-12T10:00:00Z" },
    uid: "test-uid",
    user: {
      email: "user@example.com",
      name: "Test User",
      timeZone: "UTC",
      username: "testuser",
    },
  };

  const mockEventType = {
    title: "Test Event",
    metadata: {
      apps: {
        stripe: {
          enabled: true,
          price: 1000,
          currency: "USD",
          paymentOption: "ON_BOOKING",
        },
      },
    },
  };

  const mockPaymentCredentials = {
    key: {},
    appId: "stripe" as const,
    app: {
      dirName: "stripepayment",
      categories: ["payment"],
    },
  };

  const mockEvent = {
    type: "testEvent",
    title: "Test Event",
    startTime: "2025-03-12T10:00:00Z",
    endTime: "2025-03-12T11:00:00Z",
    organizer: {
      name: "Test Organizer",
      email: "organizer@example.com",
      timeZone: "UTC",
      language: { locale: "en" },
    },
    attendees: [],
    responses: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle payment on dry run", async () => {
    const result = await handlePayment({
      evt: mockEvent,
      selectedEventType: mockEventType,
      paymentAppCredentials: mockPaymentCredentials,
      booking: mockBooking,
      bookerName: "John Doe",
      bookerEmail: "john@example.com",
      bookingFields: [],
      isDryRun: true,
    });

    expect(result).toBeNull();
  });

  it("should calculate total amount with no addons", async () => {
    const result = await handlePayment({
      evt: mockEvent,
      selectedEventType: mockEventType,
      paymentAppCredentials: mockPaymentCredentials,
      booking: mockBooking,
      bookerName: "John Doe",
      bookerEmail: "john@example.com",
      bookingFields: [],
    });

    expect(result?.amount).toBe(1000);
    expect(result?.currency).toBe("USD");
  });

  it("should calculate total amount with number field addon", async () => {
    const mockEventWithResponse = {
      ...mockEvent,
      responses: {
        quantity: { value: "2" },
      },
    };

    const bookingFields = [
      {
        name: "quantity",
        type: "number" as const,
        price: 5,
        required: false,
      },
    ];

    const result = await handlePayment({
      evt: mockEventWithResponse,
      selectedEventType: mockEventType,
      paymentAppCredentials: mockPaymentCredentials,
      booking: mockBooking,
      bookerName: "John Doe",
      bookerEmail: "john@example.com",
      bookingFields,
    });

    expect(result?.amount).toBe(2000); // Base 1000 cents + (2 * $5 * 100 cents)
  });

  it("should calculate total amount with boolean field addon", async () => {
    const mockEventWithResponse = {
      ...mockEvent,
      responses: {
        extraService: { value: true },
      },
    };

    const bookingFields = [
      {
        name: "extraService",
        type: "boolean" as const,
        price: 15,
        required: false,
      },
    ];

    const result = await handlePayment({
      evt: mockEventWithResponse,
      selectedEventType: mockEventType,
      paymentAppCredentials: mockPaymentCredentials,
      booking: mockBooking,
      bookerName: "John Doe",
      bookerEmail: "john@example.com",
      bookingFields,
    });

    expect(result?.amount).toBe(2500); // Base 1000 cents + ($15 * 100 cents)
  });

  it("should calculate total amount with select field addon", async () => {
    const mockEventWithResponse = {
      ...mockEvent,
      responses: {
        package: { value: "premium" },
      },
    };

    const bookingFields = [
      {
        name: "package",
        type: "select" as const,
        required: false,
        options: [
          { value: "basic", label: "Basic Package", price: 10 },
          { value: "premium", label: "Premium Package", price: 20 },
        ],
      },
    ];

    const result = await handlePayment({
      evt: mockEventWithResponse,
      selectedEventType: mockEventType,
      paymentAppCredentials: mockPaymentCredentials,
      booking: mockBooking,
      bookerName: "John Doe",
      bookerEmail: "john@example.com",
      bookingFields,
    });

    expect(result?.amount).toBe(3000); // Base 1000 cents + ($20 * 100 cents)
  });

  it("should calculate total amount with multiple addons", async () => {
    const mockEventWithResponse = {
      ...mockEvent,
      responses: {
        quantity: { value: "2" },
        extraService: { value: true },
        package: { value: "premium" },
      },
    };

    const bookingFields = [
      {
        name: "quantity",
        type: "number" as const,
        price: 5,
        required: false,
      },
      {
        name: "extraService",
        type: "boolean" as const,
        price: 15,
        required: false,
      },
      {
        name: "package",
        type: "select" as const,
        required: false,
        options: [
          { value: "basic", label: "Basic Package", price: 10 },
          { value: "premium", label: "Premium Package", price: 20 },
        ],
      },
    ];

    const result = await handlePayment({
      evt: mockEventWithResponse,
      selectedEventType: mockEventType,
      paymentAppCredentials: mockPaymentCredentials,
      booking: mockBooking,
      bookerName: "John Doe",
      bookerEmail: "john@example.com",
      bookingFields,
    });

    expect(result?.amount).toBe(5500); // Base 1000 cents + (2 * $5 * 100 cents) + ($15 * 100 cents) + ($20 * 100 cents)
  });

  it("should calculate total amount with radio field addon using locale", async () => {
    const mockEventWithResponse = {
      ...mockEvent,
      responses: {
        mealChoice: { value: "premium ($20.00)" }, // Formatted with price
      },
    };

    const bookingFields = [
      {
        name: "mealChoice",
        type: "radio" as const,
        required: false,
        options: [
          { value: "basic", label: "Basic Meal", price: 10 },
          { value: "premium", label: "Premium Meal", price: 20 },
        ],
      },
    ];

    const result = await handlePayment({
      evt: mockEventWithResponse,
      selectedEventType: mockEventType,
      paymentAppCredentials: mockPaymentCredentials,
      booking: mockBooking,
      bookerName: "John Doe",
      bookerEmail: "john@example.com",
      bookingFields,
      locale: "en",
    });

    expect(result?.amount).toBe(3000); // Base 1000 cents + ($20 * 100 cents)
  });
});
