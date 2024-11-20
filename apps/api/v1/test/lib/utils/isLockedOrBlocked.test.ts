import { describe, expect, it, vi, beforeEach } from "vitest";

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

  it("should return false if no user in request", async () => {
    const req = { userId: null, user: null } as any;
    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);
  });

  it("should return false if user has no email", async () => {
    const req = { userId: 123, user: { email: null } } as any;
    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);
  });

  it("should return true if user is locked", async () => {
    const req = {
      userId: 123,
      user: {
        locked: true,
        email: "test@example.com",
      },
    } as any;

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);
  });

  it("should return true if user email domain is blacklisted", async () => {
    const req = {
      userId: 123,
      user: {
        locked: false,
        email: "test@blocked.com",
      },
    } as any;

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);
  });

  it("should return false if user is not locked and email domain is not blacklisted", async () => {
    const req = {
      userId: 123,
      user: {
        locked: false,
        email: "test@example.com",
      },
    } as any;

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);
  });

  it("should handle email domains case-insensitively", async () => {
    const req = {
      userId: 123,
      user: {
        locked: false,
        email: "test@BLOCKED.COM",
      },
    } as any;

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);
  });
});
