import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { outOfOfficeDeleteReason } from "./outOfOfficeDeleteReason.handler";

vi.mock("@calcom/prisma", () => {
  return {
    default: {
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

    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({} as any);

    const result = await outOfOfficeDeleteReason({ ctx: { user: mockUser }, input });

    expect(prisma.outOfOfficeReason.delete).toHaveBeenCalledWith({
      where: {
        id: 5,
        userId: 4,
      },
    });

    expect(result).toEqual({ success: true });
  });

  it("should throw NOT_FOUND error if reason does not belong to user", async () => {
    const input = {
      id: 999,
    };

    vi.mocked(prisma.outOfOfficeReason.delete).mockRejectedValueOnce(new Error("Record not found"));

    await expect(outOfOfficeDeleteReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Failed to delete custom reason."
    );

    expect(prisma.outOfOfficeReason.delete).toHaveBeenCalledWith({
      where: {
        id: 999,
        userId: 4,
      },
    });
  });

  it("should throw NOT_FOUND error if reason does not exist", async () => {
    const input = {
      id: 100,
    };

    const notFoundError = new Error("Record to delete does not exist");
    vi.mocked(prisma.outOfOfficeReason.delete).mockRejectedValueOnce(notFoundError);

    await expect(outOfOfficeDeleteReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Failed to delete custom reason."
    );
  });

  it("should only delete reasons belonging to the authenticated user", async () => {
    const input = {
      id: 6,
    };

    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({} as any);

    await outOfOfficeDeleteReason({ ctx: { user: mockUser }, input });

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

    vi.mocked(prisma.outOfOfficeReason.delete).mockResolvedValueOnce({} as any);

    await outOfOfficeDeleteReason({ ctx: { user: differentUser }, input });

    expect(prisma.outOfOfficeReason.delete).toHaveBeenCalledWith({
      where: {
        id: 7,
        userId: 10,
      },
    });
  });
});
