import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import dayjs from "@calcom/dayjs";
import { RefundPolicy } from "@calcom/lib/payment/types";

import { handlePaymentRefund } from "./handlePaymentRefund";
import { processPaymentRefund } from "./processPaymentRefund";

vi.mock("@calcom/app-store/_utils/payments/getPaymentAppData", () => ({
  getPaymentAppData: vi.fn(),
}));

vi.mock("./handlePaymentRefund", () => ({
  handlePaymentRefund: vi.fn(),
}));

const mockedGetPaymentAppData = vi.mocked(getPaymentAppData);

describe("processPaymentRefund", () => {
  const mockStartTime = new Date("2025-01-01T10:00:00Z");

  const mockPayment = [
    {
      id: 1,
      uid: "unique-id-1",
      appId: "123",
      bookingId: 456,
      amount: 1000,
      fee: 50,
      currency: "USD",
      success: true,
      refunded: false,
      data: {},
      externalId: "ext-1234",
      paymentOption: null,
    },
  ];

  const mockBooking = {
    startTime: mockStartTime,
    endTime: new Date("2025-01-01T11:00:00Z"),
    payment: mockPayment,
    eventType: {
      owner: { id: 1 },
      metadata: {},
    },
  };

  const mockAppData = {
    refundPolicy: RefundPolicy.DAYS,
    refundCountCalendarDays: false,
    refundDaysCount: 3,
  };

  const mockApp = {
    id: "123",
    slug: "stripe",
    dirName: "app1",
    categories: ["payment"],
    keys: {},
    enabled: true,
  };

  const mockCredential = {
    id: 1,
    key: "key1",
    appId: "123",
    userId: 1,
    teamId: null,
    type: "stripe_payment",
    invalid: false,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await prismock.credential.deleteMany();
    await prismock.app.deleteMany();
  });

  it("should not process refund if no teamId or eventType owner", async () => {
    await processPaymentRefund({ booking: mockBooking, teamId: null });
    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should not process refund if no successful payment found", async () => {
    const invalidBooking = { ...mockBooking, payment: [{ ...mockPayment[0], success: false }] };
    await processPaymentRefund({ booking: invalidBooking, teamId: 1 });
    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should not process refund if refund policy is NEVER", async () => {
    mockedGetPaymentAppData.mockReturnValueOnce({ ...mockAppData, refundPolicy: RefundPolicy.NEVER });
    await processPaymentRefund({ booking: mockBooking, teamId: 1 });
    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should process refund if refund policy is DAYS and within refund window", async () => {
    mockedGetPaymentAppData.mockReturnValueOnce(mockAppData);
    await prismock.app.create({ data: mockApp });
    await prismock.credential.create({ data: mockCredential });

    const mockNow = dayjs(mockStartTime).subtract(8, "days").toDate();
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        key: "key1",
        appId: "123",
      })
    );
  });

  it("should not process refund if past the refund deadline", async () => {
    mockedGetPaymentAppData.mockReturnValueOnce(mockAppData);
    await prismock.app.create({ data: mockApp });
    await prismock.credential.create({ data: mockCredential });

    const mockNow = dayjs(mockStartTime).subtract(2, "days").toDate();

    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should process refund if business days are considered and before deadline", async () => {
    mockedGetPaymentAppData.mockReturnValueOnce({ ...mockAppData, refundCountCalendarDays: false });
    await prismock.app.create({ data: mockApp });
    await prismock.credential.create({ data: mockCredential });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const mockNow = dayjs(mockStartTime).businessDaysSubtract(3).toDate();

    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        key: "key1",
        appId: "123",
      })
    );
  });

  it("should not process refund if business days are considered and after deadline", async () => {
    mockedGetPaymentAppData.mockReturnValueOnce({ ...mockAppData, refundCountCalendarDays: false });
    await prismock.app.create({ data: mockApp });
    await prismock.credential.create({ data: mockCredential });

    const mockNow = dayjs(mockStartTime).subtract(3, "days").toDate();

    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should not process refund if paymentAppCredential is not found", async () => {
    mockedGetPaymentAppData.mockReturnValueOnce(mockAppData);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });
    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });
});
