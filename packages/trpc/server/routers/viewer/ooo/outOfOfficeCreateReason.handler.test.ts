import type { OutOfOfficeReason } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { outOfOfficeCreateReason } from "./outOfOfficeCreateReason.handler";

const mocks = vi.hoisted(() => {
  return {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    getTranslation: vi.fn(),
  };
});

vi.mock("@calcom/prisma", () => {
  return {
    default: {
      outOfOfficeReason: {
        findFirst: mocks.findFirst,
        findMany: mocks.findMany,
        create: mocks.create,
      },
    },
  };
});

const mockTranslations: Record<string, string> = {
  ooo_reasons_vacation: "Vacation",
  ooo_reasons_travel: "Travel",
  ooo_reasons_sick_leave: "Sick leave",
  ooo_reasons_public_holiday: "Public holiday",
  ooo_reasons_unspecified: "Unspecified",
};

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: mocks.getTranslation,
}));

const mockUser = {
  id: 4,
} as NonNullable<TrpcSessionUser>;

describe("outOfOfficeCreateReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTranslation.mockResolvedValue((key: string) => mockTranslations[key] || key);
  });

  it("should create a custom reason successfully", async () => {
    const input = {
      emoji: "💼",
      reason: "Client visit",
    };

    const mockCreatedReason: OutOfOfficeReason = {
      id: 6,
      emoji: "💼",
      reason: "Client visit",
      userId: 4,
      enabled: true,
    };

    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.create.mockResolvedValueOnce(mockCreatedReason);

    const result = await outOfOfficeCreateReason({ ctx: { user: mockUser }, input });

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 4,
        reason: "Client visit",
      },
    });

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        emoji: "💼",
        reason: "Client visit",
        userId: 4,
        enabled: true,
      },
    });

    expect(result).toEqual(mockCreatedReason);
  });

  it("should throw CONFLICT error if user already has a reason with the same text", async () => {
    const input = {
      emoji: "🏢",
      reason: "On-site day",
    };

    const existingReason: OutOfOfficeReason = {
      id: 5,
      emoji: "💼",
      reason: "On-site day",
      userId: 4,
      enabled: true,
    };

    mocks.findFirst.mockResolvedValueOnce(existingReason);

    await expect(outOfOfficeCreateReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "You already have a custom reason with this text"
    );

    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("should throw CONFLICT error if reason already exists as a system default", async () => {
    const input = {
      emoji: "🏢",
      reason: "Vacation",
    };

    const existingSystemDefault: OutOfOfficeReason = {
      id: 1,
      emoji: "🏖️",
      reason: "ooo_reasons_vacation",
      userId: null,
      enabled: true,
    };

    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([existingSystemDefault]);

    await expect(outOfOfficeCreateReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "This reason already exists as a system default"
    );

    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("should handle compound emojis (skin tones, flags, ZWJ sequences)", async () => {
    const input = {
      emoji: "👍🏽",
      reason: "Focus day",
    };

    const mockCreatedReason: OutOfOfficeReason = {
      id: 7,
      emoji: "👍🏽",
      reason: "Focus day",
      userId: 4,
      enabled: true,
    };

    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.create.mockResolvedValueOnce(mockCreatedReason);

    const result = await outOfOfficeCreateReason({ ctx: { user: mockUser }, input });

    expect(result).toEqual(mockCreatedReason);
  });

  it("should handle flag emojis", async () => {
    const input = {
      emoji: "🇮🇳",
      reason: "International travel",
    };

    const mockCreatedReason: OutOfOfficeReason = {
      id: 8,
      emoji: "🇮🇳",
      reason: "International travel",
      userId: 4,
      enabled: true,
    };

    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.create.mockResolvedValueOnce(mockCreatedReason);

    const result = await outOfOfficeCreateReason({ ctx: { user: mockUser }, input });

    expect(result).toEqual(mockCreatedReason);
  });

  it("should handle ZWJ sequence emojis", async () => {
    const input = {
      emoji: "👨‍💻",
      reason: "Working remotely",
    };

    const mockCreatedReason: OutOfOfficeReason = {
      id: 9,
      emoji: "👨‍💻",
      reason: "Working remotely",
      userId: 4,
      enabled: true,
    };

    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.create.mockResolvedValueOnce(mockCreatedReason);

    const result = await outOfOfficeCreateReason({ ctx: { user: mockUser }, input });

    expect(result).toEqual(mockCreatedReason);
  });

  it("should throw INTERNAL_SERVER_ERROR on unexpected errors", async () => {
    const input = {
      emoji: "📅",
      reason: "Meeting",
    };

    mocks.findFirst.mockRejectedValueOnce(new Error("Database error"));

    await expect(outOfOfficeCreateReason({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "Failed to create custom out-of-office reason"
    );
  });
});
