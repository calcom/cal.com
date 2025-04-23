import prismaMock from "../../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../../types";
import { deleteHandler } from "../delete.handler";

describe("deleteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCtx = {
    user: {
      id: 123,
      name: "test",
      email: "test@example.com",
      timeZone: "timeZone",
      username: "test_username",
    } as NonNullable<TrpcSessionUser>,
  };

  const pastBookingMock = { id: 1, userId: 123, endTime: new Date(Date.now() - 1000 * 60 * 60 * 24) };
  const futureBookingMock = { id: 1, userId: 123, endTime: new Date(Date.now() + 1000 * 60 * 60 * 24) };

  it("should delete a single booking successfully", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(pastBookingMock);

    await deleteHandler({
      ctx: mockCtx,
      input: { id: 1 },
    });

    expect(prismaMock.booking.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("should prevent deletion of unauthorized bookings", async () => {
    const mockBooking = { id: 1, userId: 124, endTime: new Date(Date.now() - 1000 * 60 * 60 * 24) };
    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

    await expect(
      deleteHandler({
        ctx: mockCtx,
        input: { id: 1 },
      })
    ).rejects.toThrow("Unauthorized: You don't have permission to delete this booking");

    expect(prismaMock.booking.delete).not.toHaveBeenCalled();
  });

  it("should prevent deletion of bookings that are not in the past", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(futureBookingMock);

    await expect(
      deleteHandler({
        ctx: mockCtx,
        input: { id: 1 },
      })
    ).rejects.toThrow("Only past bookings can be deleted");

    expect(prismaMock.booking.delete).not.toHaveBeenCalled();
  });

  it("should delete a single booking successfully as a team admin", async () => {
    const mockTeamBooking = {
      id: 1,
      userId: 124,
      eventType: {
        team: {
          members: [{ userId: 123, role: MembershipRole.ADMIN }],
        },
      },
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockTeamBooking);
    prismaMock.membership.findFirst.mockResolvedValue({
      id: 1,
      userId: 123,
      teamId: 1,
      accepted: true,
      role: MembershipRole.ADMIN,
      team: {
        id: 1,
        name: "test",
        slug: "test",
        parentId: null,
        isOrganization: false,
      },
    });

    await deleteHandler({
      ctx: mockCtx,
      input: { id: 1 },
    });

    expect(prismaMock.booking.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("should prevent deleting a single booking when user is not a team admin", async () => {
    const mockBooking = {
      id: 1,
      userId: 124,
      eventTypeId: 1,
      eventType: {
        teamId: 1,
      },
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
    prismaMock.membership.findFirst.mockResolvedValue(null);

    await expect(
      deleteHandler({
        ctx: mockCtx,
        input: { id: 1 },
      })
    ).rejects.toThrow("Unauthorized: You don't have permission to delete this booking");

    expect(prismaMock.booking.delete).not.toHaveBeenCalled();
  });
});
