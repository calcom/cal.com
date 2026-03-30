import { describe, expect, it, vi } from "vitest";

const {
  mockPaymentIntentCreate,
  mockCustomerRetrieve,
  mockPaymentMethodRetrieve,
  mockPrismaPaymentUpdate,
  mockFindByIdIncludeUserAndAttendees,
} = vi.hoisted(() => ({
  mockPaymentIntentCreate: vi.fn(),
  mockCustomerRetrieve: vi.fn(),
  mockPaymentMethodRetrieve: vi.fn(),
  mockPrismaPaymentUpdate: vi.fn(),
  mockFindByIdIncludeUserAndAttendees: vi.fn(),
}));

// Stripe is used as `new Stripe(...)` in PaymentService constructor.
// We need a function that can be called with `new` and returns our mock methods.
vi.mock("stripe", () => {
  function StripeMock() {
    return {
      paymentIntents: { create: mockPaymentIntentCreate },
      customers: { retrieve: mockCustomerRetrieve },
      paymentMethods: { retrieve: mockPaymentMethodRetrieve },
      webhooks: { constructEvent: vi.fn() },
    };
  }
  return { default: StripeMock };
});

vi.mock("@calcom/prisma", () => ({
  default: {
    payment: { update: mockPrismaPaymentUpdate },
  },
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: function () {
    return { findByIdIncludeUserAndAttendees: mockFindByIdIncludeUserAndAttendees };
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/features/tasker", () => ({
  default: { create: vi.fn() },
}));

// Mock the customer module to prevent its top-level Stripe usage
vi.mock("./customer", () => ({
  retrieveOrCreateStripeCustomerByEmail: vi.fn(),
}));

// Mock the server module that also does `new Stripe(...)` at top level
vi.mock("./server", () => ({
  default: {},
}));

import { BuildPaymentService } from "./PaymentService";

const MOCK_CREDENTIALS = {
  key: {
    stripe_user_id: "acct_test123",
    default_currency: "usd",
    stripe_publishable_key: "pk_test_123",
  },
};

const ORIGINAL_SETUP_INTENT_ID = "seti_original123";
const NEW_PAYMENT_INTENT_ID = "pi_newcharge456";

const mockPayment = {
  id: 1,
  uid: "pay-uid-123",
  amount: 5000,
  currency: "usd",
  externalId: ORIGINAL_SETUP_INTENT_ID,
  data: {
    setupIntent: {
      id: ORIGINAL_SETUP_INTENT_ID,
      customer: "cus_test123",
      payment_method: "pm_test123",
    },
    stripe_publishable_key: "pk_test_123",
    stripeAccount: "acct_test123",
  },
  bookingId: 1,
  appId: "stripe",
  fee: 0,
  refunded: false,
  success: false,
  paymentOption: "HOLD",
};

const mockBooking = {
  id: 1,
  uid: "booking-uid-123",
  title: "Test Meeting",
  user: {
    id: 1,
    username: "testuser",
    email: "organizer@test.com",
    name: "Test User",
  },
  attendees: [
    {
      name: "Attendee",
      email: "attendee@test.com",
      phoneNumber: null,
    },
  ],
  eventType: {
    title: "Test Event",
  },
};

function setupMocks() {
  mockCustomerRetrieve.mockResolvedValue({ id: "cus_test123" });
  mockPaymentMethodRetrieve.mockResolvedValue({ id: "pm_test123" });
  mockFindByIdIncludeUserAndAttendees.mockResolvedValue(mockBooking);
}

describe("StripePaymentService.chargeCard", () => {

  it("should update externalId to the new PaymentIntent ID", async () => {
    setupMocks();
    mockPaymentIntentCreate.mockResolvedValue({ id: NEW_PAYMENT_INTENT_ID });
    mockPrismaPaymentUpdate.mockResolvedValue({
      ...mockPayment,
      success: true,
      externalId: NEW_PAYMENT_INTENT_ID,
    });

    const service = BuildPaymentService(MOCK_CREDENTIALS);
    await service.chargeCard(mockPayment as never, mockBooking.id);

    // Verify prisma.payment.update was called with the new externalId
    expect(mockPrismaPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockPayment.id },
        data: expect.objectContaining({
          success: true,
          externalId: NEW_PAYMENT_INTENT_ID,
        }),
      })
    );

    // The externalId must be the NEW PaymentIntent ID, not the old SetupIntent ID
    const updateCall = mockPrismaPaymentUpdate.mock.calls[0][0];
    expect(updateCall.data.externalId).toBe(NEW_PAYMENT_INTENT_ID);
    expect(updateCall.data.externalId).not.toBe(ORIGINAL_SETUP_INTENT_ID);
  });

  it("should store the new PaymentIntent in the data field", async () => {
    setupMocks();
    const newPaymentIntent = { id: NEW_PAYMENT_INTENT_ID };
    mockPaymentIntentCreate.mockResolvedValue(newPaymentIntent);
    mockPrismaPaymentUpdate.mockResolvedValue({
      ...mockPayment,
      success: true,
      externalId: NEW_PAYMENT_INTENT_ID,
    });

    const service = BuildPaymentService(MOCK_CREDENTIALS);
    await service.chargeCard(mockPayment as never, mockBooking.id);

    const updateCall = mockPrismaPaymentUpdate.mock.calls[0][0];
    // data field should contain the original setupIntent data spread + new paymentIntent
    expect(updateCall.data.data.paymentIntent).toEqual(newPaymentIntent);
    expect(updateCall.data.data.setupIntent).toEqual(mockPayment.data.setupIntent);
  });

  it("should create PaymentIntent with correct params from setupIntent", async () => {
    setupMocks();
    mockPaymentIntentCreate.mockResolvedValue({ id: NEW_PAYMENT_INTENT_ID });
    mockPrismaPaymentUpdate.mockResolvedValue({
      ...mockPayment,
      success: true,
      externalId: NEW_PAYMENT_INTENT_ID,
    });

    const service = BuildPaymentService(MOCK_CREDENTIALS);
    await service.chargeCard(mockPayment as never, mockBooking.id);

    expect(mockPaymentIntentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: mockPayment.amount,
        currency: mockPayment.currency,
        customer: "cus_test123",
        payment_method: "pm_test123",
        off_session: true,
        confirm: true,
      }),
      { stripeAccount: "acct_test123" }
    );
  });
});
