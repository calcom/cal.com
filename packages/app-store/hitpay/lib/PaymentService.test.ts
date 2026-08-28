import qs from "qs";
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
      findMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
  },
}));

import axios from "axios";
import prisma from "@calcom/prisma";
import type { Booking, Payment, PaymentOption } from "@calcom/prisma/client";
import { BuildPaymentService } from "./PaymentService";

const mockedAxiosPost = vi.mocked(axios.post);
const mockedAxiosGet = vi.mocked(axios.get);
const mockedBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockedBookingFindMany = vi.mocked(prisma.booking.findMany);
const mockedPaymentCreate = vi.mocked(prisma.payment.create);

const booking = {
  uid: "uid-1",
  title: "HitPay test booking",
  startTime: new Date("2026-08-28T10:00:00Z"),
  endTime: new Date("2026-08-28T10:30:00Z"),
  eventTypeId: 1,
  eventType: { slug: "hitpay-test", seatsPerTimeSlot: null },
  attendees: [],
} as unknown as Booking;

const payment = { amount: 10000, currency: "JPY" };

beforeEach(() => {
  mockedBookingFindUnique.mockResolvedValue(booking);
  mockedBookingFindMany.mockResolvedValue([]);
  mockedPaymentCreate.mockImplementation((async (args) => ({
    id: 1,
    ...args.data,
  })) as unknown as typeof mockedPaymentCreate);
  mockedAxiosPost.mockResolvedValue({
    data: { id: "req-1", amount: "10000", currency: "JPY", url: "http://hitpay.test/pay" },
  });
  mockedAxiosGet.mockResolvedValue({
    data: { data: [{ url: "http://hitpay.test/pay/default" }] },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

const buildService = () =>
  BuildPaymentService({
    key: { isSandbox: true, sandbox: { apiKey: "sandbox-key" } },
  });

const createPayment = (paymentOption: PaymentOption = "HOLD") =>
  buildService().create(payment, 1, 1, "user", "Booker", paymentOption, "booker@test.com");

describe("HitPayPaymentService amount handling", () => {
  it("sends zero-decimal currency amounts unscaled to the HitPay API", async () => {
    await createPayment();

    const [url, body] = mockedAxiosPost.mock.calls[0];
    expect(url).toContain("/v1/payment-requests");
    expect(qs.parse(body as string)).toMatchObject({ amount: "10000", currency: "JPY" });
  });

  it("sends two-decimal currency amounts divided by 100 to the HitPay API", async () => {
    mockedAxiosPost.mockResolvedValue({
      data: { id: "req-2", amount: "100.00", currency: "USD" },
    });

    await buildService().create(
      { amount: 10000, currency: "USD" },
      1,
      1,
      "user",
      "Booker",
      "HOLD",
      "booker@test.com"
    );

    const [, body] = mockedAxiosPost.mock.calls[0];
    expect(qs.parse(body as string)).toMatchObject({ amount: "100", currency: "USD" });
  });

  it("stores the echoed zero-decimal amount unscaled, preserving the charged amount", async () => {
    await createPayment();

    const stored = mockedPaymentCreate.mock.calls[0][0];
    expect(stored.data.amount).toBe(10000);
    expect(stored.data.currency).toBe("JPY");
  });

  it("stores an echoed two-decimal amount scaled to the smallest unit", async () => {
    mockedAxiosPost.mockResolvedValue({
      data: { id: "req-3", amount: "100.00", currency: "USD" },
    });

    await buildService().create(
      { amount: 10000, currency: "USD" },
      1,
      1,
      "user",
      "Booker",
      "HOLD",
      "booker@test.com"
    );

    const stored = mockedPaymentCreate.mock.calls[0][0];
    expect(stored.data.amount).toBe(10000);
    expect(stored.data.currency).toBe("USD");
  });
});