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
      },
    },
  };
});

const mockUser = {
  id: 4,
} as NonNullable<TrpcSessionUser>;

describe("outOfOfficeDeleteReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a custom reason successfully", async () => {
    const input = {
      id: 5,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({} as any);

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
        userId: 4,
      },
    });

    expect(result).toEqual({ success: true });
  });

  it("should throw BAD_REQUEST error if reason is already in use", async () => {
    const input = {
      id: 5,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([
      { id: 1, reasonId: 5, userId: 4 },
    ] as any);

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

  it("should throw BAD_REQUEST error if reason does not belong to user", async () => {
    const input = {
      id: 999,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.delete).mockRejectedValueOnce(new Error("Record not found"));

    await expect(outOfOfficeDeleteReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Record not found"
    );

    expect(prisma.outOfOfficeReason.delete).toHaveBeenCalledWith({
      where: {
        id: 999,
        userId: 4,
      },
    });
  });

  it("should throw BAD_REQUEST error if reason does not exist", async () => {
    const input = {
      id: 100,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    const notFoundError = new Error("Record to delete does not exist");
    vi.mocked(prisma.outOfOfficeReason.delete).mockRejectedValueOnce(notFoundError);

    await expect(outOfOfficeDeleteReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Record to delete does not exist"
    );
  });

  it("should only delete reasons belonging to the authenticated user", async () => {
    const input = {
      id: 6,
    };

    vi.mocked(prisma.outOfOfficeEntry.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({} as any);

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
        userId: 4,
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
    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({} as any);

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
        userId: 10,
      },
    });
  });
});
