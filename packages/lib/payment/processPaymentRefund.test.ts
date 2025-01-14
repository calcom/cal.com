import prismaMock from "../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";

import { getPaymentAppData } from "../getPaymentAppData";
import { handlePaymentRefund } from "./handlePaymentRefund";
import { processPaymentRefund } from "./processPaymentRefund";
import { RefundPolicy } from "./types";

vi.mock("@calcom/lib/getPaymentAppData", () => ({
  getPaymentAppData: vi.fn(),
}));

vi.mock("@calcom/lib/payment/handlePaymentRefund", () => ({
  handlePaymentRefund: vi.fn(),
}));

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

  const mockPaymentAppCredentials = [
    {
      key: "key1",
      appId: "123",
      app: {
        categories: ["category1"],
        dirName: "app1",
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
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
    (getPaymentAppData as any).mockReturnValueOnce({ ...mockAppData, refundPolicy: RefundPolicy.NEVER });
    await processPaymentRefund({ booking: mockBooking, teamId: 1 });
    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should process refund if refund policy is DAYS and within refund window", async () => {
    (getPaymentAppData as any).mockReturnValueOnce(mockAppData);
    prismaMock.credential.findMany.mockResolvedValueOnce(mockPaymentAppCredentials);

    const mockNow = dayjs(mockStartTime).subtract(8, "days").toDate();
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).toHaveBeenCalledWith(1, mockPaymentAppCredentials[0]);
  });

  it("should not process refund if past the refund deadline", async () => {
    (getPaymentAppData as any).mockReturnValueOnce(mockAppData);
    prismaMock.credential.findMany.mockResolvedValueOnce(mockPaymentAppCredentials);

    const mockNow = dayjs(mockStartTime).subtract(2, "days").toDate();

    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should process refund if business days are considered and before deadline", async () => {
    (getPaymentAppData as any).mockReturnValueOnce({ ...mockAppData, refundCountCalendarDays: false });
    prismaMock.credential.findMany.mockResolvedValueOnce(mockPaymentAppCredentials);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const mockNow = dayjs(mockStartTime).businessDaysSubtract(3).toDate();

    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).toHaveBeenCalledWith(1, mockPaymentAppCredentials[0]);
  });

  it("should not process refund if business days are considered and after deadline", async () => {
    (getPaymentAppData as any).mockReturnValueOnce({ ...mockAppData, refundCountCalendarDays: false });
    prismaMock.credential.findMany.mockResolvedValueOnce(mockPaymentAppCredentials);

    const mockNow = dayjs(mockStartTime).subtract(3, "days").toDate();

    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });

    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });

  it("should not process refund if paymentAppCredential is not found", async () => {
    (getPaymentAppData as any).mockReturnValueOnce(mockAppData);
    prismaMock.credential.findMany.mockResolvedValueOnce([]);

    await processPaymentRefund({ booking: mockBooking, teamId: 1 });
    expect(handlePaymentRefund).not.toHaveBeenCalled();
  });
});
