import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    booking: {
      findUniqueOrThrow: vi.fn(),
    },
  };
  return { default: mockPrisma, bookingMinimalSelect: { title: true, startTime: true, endTime: true } };
});

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflows", () => ({
  workflowSelect: { id: true, name: true },
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: { id: true, type: true },
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
}));

import prisma from "@calcom/prisma";
import { getBookingToDelete } from "./getBookingToDelete";

describe("getBookingToDelete", () => {
  it("queries by id when provided", async () => {
    const mockBooking = { id: 1, uid: "test-uid", title: "Meeting" };
    vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(mockBooking as never);

    const result = await getBookingToDelete(1, undefined);
    expect(prisma.booking.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, uid: undefined },
      })
    );
    expect(result).toEqual(mockBooking);
  });

  it("queries by uid when provided", async () => {
    const mockBooking = { id: 2, uid: "uid-123", title: "Meeting" };
    vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(mockBooking as never);

    const result = await getBookingToDelete(undefined, "uid-123");
    expect(prisma.booking.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: undefined, uid: "uid-123" },
      })
    );
    expect(result).toEqual(mockBooking);
  });

  it("throws when booking is not found", async () => {
    vi.mocked(prisma.booking.findUniqueOrThrow).mockRejectedValue(new Error("Record not found"));

    await expect(getBookingToDelete(999, undefined)).rejects.toThrow("Record not found");
  });

  it("includes required relations in select", async () => {
    vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue({} as never);

    await getBookingToDelete(1, undefined);
    const callArgs = vi.mocked(prisma.booking.findUniqueOrThrow).mock.calls[0][0];
    const select = callArgs.select;

    expect(select).toHaveProperty("user");
    expect(select).toHaveProperty("references");
    expect(select).toHaveProperty("eventType");
    expect(select).toHaveProperty("payment");
    expect(select).toHaveProperty("uid");
    expect(select).toHaveProperty("status");
    expect(select).toHaveProperty("responses");
  });

  it("selects event type with team and workflow data", async () => {
    vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue({} as never);

    await getBookingToDelete(1, undefined);
    const callArgs = vi.mocked(prisma.booking.findUniqueOrThrow).mock.calls[0][0];
    const eventTypeSelect = callArgs.select?.eventType?.select;

    expect(eventTypeSelect).toHaveProperty("teamId");
    expect(eventTypeSelect).toHaveProperty("team");
    expect(eventTypeSelect).toHaveProperty("workflows");
    expect(eventTypeSelect).toHaveProperty("seatsPerTimeSlot");
  });
});
