import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { outOfOfficeDeleteReason } from "./outOfOfficeDeleteReason.handler";

vi.mock("@calcom/prisma", () => {
  return {
    default: {
      outOfOfficeEntry: {
        findMany: vi.fn(),
      },
      outOfOfficeReason: {
        delete: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

const mockUser = {
  id: 4,
} as NonNullable<TrpcSessionUser>;

const mockDeletedReason = {
  id: 5,
  userId: 4,
  emoji: "💼",
  reason: "Vacation",
  enabled: true,
};

const mockOutOfOfficeEntry = {
  id: 1,
  uuid: "test-uuid",
  userId: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  start: new Date(),
  end: new Date(),
  notes: null,
  showNotePublicly: false,
  toUserId: null,
  reasonId: 5,
};

describe("outOfOfficeDeleteReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a custom reason successfully", async () => {
    const input = {
      id: 5,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.findFirst).mockResolvedValueOnce(mockDeletedReason);
    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce(mockDeletedReason);

    const result = await outOfOfficeDeleteReason({ ctx: { user: mockUser }, input });

    expect(prisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
      where: {
        reasonId: 5,
        userId: 4,
      },
    });

    expect(prisma.outOfOfficeReason.delete).toHaveBeenCalledWith({
      where: {
        id: 5,
      },
    });

    expect(result).toEqual({ success: true });
  });

  it("should throw BAD_REQUEST error if reason is already in use", async () => {
    const input = {
      id: 5,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([mockOutOfOfficeEntry]);

    await expect(outOfOfficeDeleteReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Your custom reason already in use"
    );

    expect(prisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
      where: {
        reasonId: 5,
        userId: 4,
      },
    });

    expect(prisma.outOfOfficeReason.delete).not.toHaveBeenCalled();
  });

  it("should throw NOT_FOUND if reason does not belong to user", async () => {
    const input = {
      id: 999,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.findFirst).mockResolvedValueOnce(null);

    await expect(outOfOfficeDeleteReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Custom reason not found"
    );

    expect(prisma.outOfOfficeReason.findFirst).toHaveBeenCalledWith({
      where: {
        id: 999,
        userId: 4,
      },
    });

    expect(prisma.outOfOfficeReason.delete).not.toHaveBeenCalled();
  });

  it("should throw INTERNAL_SERVER_ERROR if delete fails unexpectedly", async () => {
    const input = {
      id: 100,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.findFirst).mockResolvedValueOnce(mockDeletedReason);
    vi.mocked(prisma.outOfOfficeReason.delete).mockRejectedValueOnce(new Error("Database connection error"));

    await expect(outOfOfficeDeleteReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Failed to delete custom reason"
    );
  });

  it("should only delete reasons belonging to the authenticated user", async () => {
    const input = {
      id: 6,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.findFirst).mockResolvedValueOnce({ ...mockDeletedReason, id: 6 });
    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({ ...mockDeletedReason, id: 6 });

    await outOfOfficeDeleteReason({ ctx: { user: mockUser }, input });

    expect(prisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
      where: {
        reasonId: 6,
        userId: 4,
      },
    });

    expect(prisma.outOfOfficeReason.delete).toHaveBeenCalledWith({
      where: {
        id: 6,
      },
    });
  });

  it("should handle different user IDs correctly", async () => {
    const differentUser = {
      ...mockUser,
      id: 10,
    } as NonNullable<TrpcSessionUser>;

    const input = {
      id: 7,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.findFirst).mockResolvedValueOnce({
      ...mockDeletedReason,
      id: 7,
      userId: 10,
    });
    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({
      ...mockDeletedReason,
      id: 7,
      userId: 10,
    });

    await outOfOfficeDeleteReason({ ctx: { user: differentUser }, input });

    expect(prisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
      where: {
        reasonId: 7,
        userId: 10,
      },
    });

    expect(prisma.outOfOfficeReason.delete).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
    });
  });
});
