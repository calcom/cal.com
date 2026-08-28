import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      findUnique: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
  },
}));

import axios from "axios";
import prisma from "@calcom/prisma";
import { BuildPaymentService } from "./PaymentService";

const mockedAxiosPost = vi.mocked(axios.post);
const mockedAxiosGet = vi.mocked(axios.get);
const mockedBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockedPaymentCreate = vi.mocked(prisma.payment.create);

const booking = {
  uid: "uid-1",
  title: "HitPay test booking",
  startTime: new Date("2026-08-28T10:00:00Z"),
  endTime: new Date("2026-08-28T10:30:00Z"),
  eventTypeId: 1,
  eventType: { slug: "hitpay-test", seatsPerTimeSlot: null },
  attendees: [],
};

const paymentDefaults = {
  amount: 10000,
  currency: "JPY",
};

beforeEach(() => {
  mockedBookingFindUnique.mockResolvedValue(booking as any);
  mockedPaymentCreate.mockImplementation(((args: any) =>
    Promise.resolve({ id: 1, ...args.data })) as any);
  mockedAxiosPost.mockResolvedValue({
    data: { id: "req-1", amount: "10000", currency: "JPY", url: "http://hitpay.test/pay" },
  } as any);
  mockedAxiosGet.mockResolvedValue({
    data: { data: [{ url: "http://hitpay.test/pay/default" }] },
  } as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("HitPayPaymentService amount handling", () => {
  it("sends zero-decimal currency amounts unscaled to the HitPay API", async () => {
    const service = BuildPaymentService({
      key: { isSandbox: true, sandbox: { apiKey: "sandbox-key" } },
    });

    await service.create(paymentDefaults as any, 1, 1, "user", "Booker", "HOLD", "booker@test.com");

    const [url, formData] = mockedAxiosPost.mock.calls[0];
    expect(url).toContain("/v1/payment-requests");
    expect((formData as any).amount).toBe(10000);
    expect((formData as any).currency).toBe("JPY");
  });

  it("sends two-decimal currency amounts divided by 100 to the HitPay API", async () => {
    mockedAxiosPost.mockResolvedValue({
      data: { id: "req-2", amount: "100.00", currency: "USD" },
    } as any);
    const service = BuildPaymentService({
      key: { isSandbox: true, sandbox: { apiKey: "sandbox-key" } },
    });

    await service.create(
      { amount: 10000, currency: "USD" } as any,
      1,
      1,
      "user",
      "Booker",
      "HOLD",
      "booker@test.com"
    );

    const [, formData] = mockedAxiosPost.mock.calls[0];
    expect((formData as any).amount).toBe(100);
  });

  it("stores the echoed zero-decimal amount unscaled, preserving the charged amount", async () => {
    const service = BuildPaymentService({
      key: { isSandbox: true, sandbox: { apiKey: "sandbox-key" } },
    });

    await service.create(paymentDefaults as any, 1, 1, "user", "Booker", "HOLD", "booker@test.com");

    const stored = mockedPaymentCreate.mock.calls[0][0] as any;
    expect(stored.data.amount).toBe(10000);
    expect(stored.data.currency).toBe("JPY");
  });

  it("stores an echoed two-decimal amount scaled to the smallest unit", async () => {
    mockedAxiosPost.mockResolvedValue({
      data: { id: "req-3", amount: "100.00", currency: "USD" },
    } as any);
    const service = BuildPaymentService({
      key: { isSandbox: true, sandbox: { apiKey: "sandbox-key" } },
    });

    await service.create(
      { amount: 10000, currency: "USD" } as any,
      1,
      1,
      "user",
      "Booker",
      "HOLD",
      "booker@test.com"
    );

    const stored = mockedPaymentCreate.mock.calls[0][0] as any;
    expect(stored.data.amount).toBe(10000);
  });
});