import type { NextApiRequest } from "next";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import type { WatchlistFeature } from "@calcom/features/watchlist/lib/facade/WatchlistFeature";

import { isLockedOrBlocked } from "../../../lib/utils/isLockedOrBlocked";

vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => ({
  getWatchlistFeature: vi.fn(),
}));

describe("isLockedOrBlocked", () => {
  let mockWatchlistFeature: WatchlistFeature;

  beforeEach(() => {
    const mockGlobalBlocking = {
      isBlocked: vi.fn(),
    };
    const mockOrgBlocking = {
      isBlocked: vi.fn(),
    };

    mockWatchlistFeature = {
      globalBlocking: mockGlobalBlocking,
      orgBlocking: mockOrgBlocking,
    } as unknown as WatchlistFeature;

    vi.mocked(getWatchlistFeature).mockResolvedValue(mockWatchlistFeature);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return false if no user in request", async () => {
    const req = { userId: null, user: null } as unknown as NextApiRequest;
    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);

    expect(vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked)).not.toHaveBeenCalled();
  });

  it("should return false if user has no email", async () => {
    const req = { userId: 123, user: { email: null } } as unknown as NextApiRequest;
    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);

    expect(vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked)).not.toHaveBeenCalled();
  });

  it("should return true if user is locked", async () => {
    const req = {
      userId: 123,
      user: {
        locked: true,
        email: "test@example.com",
      },
    } as unknown as NextApiRequest;

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);

    expect(vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked)).not.toHaveBeenCalled();
  });

  it("should return true if user email domain is watchlisted", async () => {
    const req = {
      userId: 123,
      user: {
        locked: false,
        email: "test@blocked.com",
      },
    } as unknown as NextApiRequest;

    vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked).mockResolvedValue({ isBlocked: true });

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);

    expect(vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked)).toHaveBeenCalledWith("test@blocked.com");
  });

  it("should return false if user is not locked and email domain is not watchlisted", async () => {
    const req = {
      userId: 123,
      user: {
        locked: false,
        email: "test@example.com",
      },
    } as unknown as NextApiRequest;

    vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked).mockResolvedValue({ isBlocked: false });

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(false);

    expect(vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked)).toHaveBeenCalledWith("test@example.com");
  });

  it("should handle email domains case-insensitively", async () => {
    const req = {
      userId: 123,
      user: {
        locked: false,
        email: "test@BLOCKED.COM",
      },
    } as unknown as NextApiRequest;

    vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked).mockResolvedValue({ isBlocked: true });

    const result = await isLockedOrBlocked(req);
    expect(result).toBe(true);

    expect(vi.mocked(mockWatchlistFeature.globalBlocking.isBlocked)).toHaveBeenCalledWith("test@blocked.com");
  });
});
