import { describe, expect, it, vi, beforeEach } from "vitest";

import prisma from "@calcom/prisma";

import { isLockedOrBlocked } from "../../../lib/utils/isLockedOrBlocked";

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("isLockedOrBlocked", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.BLACKLIST_EMAIL_DOMAINS = "blocked.com,spam.com";
  });

  it("should return false if no userId in request", async () => {
    const req = { userId: null } as any;
    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);
  });

  it("should return false if user not found", async () => {
    const req = { userId: 123 } as any;
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);
  });

  it("should return false if user has no email", async () => {
    const req = { userId: 123 } as any;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      locked: false,
      email: null,
    } as any);

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);
  });

  it("should return true if user is locked", async () => {
    const req = { userId: 123 } as any;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      locked: true,
      email: "test@example.com",
    } as any);

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);
  });

  it("should return true if user email domain is blacklisted", async () => {
    const req = { userId: 123 } as any;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      locked: false,
      email: "test@blocked.com",
    } as any);

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);
  });

  it("should return false if user is not locked and email domain is not blacklisted", async () => {
    const req = { userId: 123 } as any;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      locked: false,
      email: "test@example.com",
    } as any);

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);
  });

  it("should handle email domains case-insensitively", async () => {
    const req = { userId: 123 } as any;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      locked: false,
      email: "test@BLOCKED.COM",
    } as any);

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);
  });
});
