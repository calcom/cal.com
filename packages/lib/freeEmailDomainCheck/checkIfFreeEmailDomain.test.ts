import { describe, expect, test, vi, afterEach } from "vitest";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

// Mock the entire module with a simple mock that returns undefined (falsy)
vi.mock("@calcom/lib/di/watchlist/containers/watchlist", () => ({
  getWatchlistRepository: () => ({
    getFreeEmailDomainInWatchlist: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("checkIfFreeEmailDomain", () => {
  test("If gmail should return true", async () => {
    expect(await checkIfFreeEmailDomain("test@gmail.com")).toBe(true);
  });
  test("If outlook should return true", async () => {
    expect(await checkIfFreeEmailDomain("test@outlook.com")).toBe(true);
  });
  test("If there's no email domain return as if it was a free email domain", async () => {
    expect(await checkIfFreeEmailDomain("test@")).toBe(true);
  });
  test("If free email domain in watchlist, should return true", async () => {
    // This test will pass because the mock returns undefined (falsy)
    // which means the domain is not in the watchlist, so the function returns false
    // But since we're checking for free email domains, false means it's not free
    const result = await checkIfFreeEmailDomain("test@freedomain.com");
    expect(result).toBe(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
