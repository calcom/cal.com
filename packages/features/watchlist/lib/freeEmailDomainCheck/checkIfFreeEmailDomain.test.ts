import type { Mock } from "vitest";
import { describe, expect, test, vi, afterEach } from "vitest";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => {
  return {
    getWatchlistFeature: vi.fn().mockReturnValue({
      globalBlocking: {
        isFreeEmailDomain: vi.fn().mockResolvedValue(true),
      },
    }),
  };
});

describe("checkIfFreeEmailDomain", () => {
  test("If gmail should return true", async () => {
    expect(await checkIfFreeEmailDomain({ email: "test@gmail.com" })).toBe(true);
  });
  test("If outlook should return true", async () => {
    expect(await checkIfFreeEmailDomain({ email: "test@outlook.com" })).toBe(true);
  });
  test("If there's no email domain return as if it was a free email domain", async () => {
    expect(await checkIfFreeEmailDomain({ email: "test@" })).toBe(true);
  });
  test("If free email domain in watchlist, should return true", async () => {
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    const getWatchlistFeatureMock = getWatchlistFeature as Mock;

    const result = await checkIfFreeEmailDomain({ email: "test@freedomain.com" });

    expect(getWatchlistFeatureMock).toHaveBeenCalled();

    const mockInstance = getWatchlistFeatureMock.mock.results.at(-1)?.value;

    expect(mockInstance.globalBlocking.isFreeEmailDomain).toHaveBeenCalledWith("freedomain.com");
    expect(result).toBe(true);
  });

  test("If non-free email domain, should return false", async () => {
    const { getWatchlistFeature } = await import("@calcom/features/di/watchlist/containers/watchlist");
    const getWatchlistFeatureMock = getWatchlistFeature as Mock;

    getWatchlistFeatureMock.mockReturnValueOnce({
      globalBlocking: {
        isFreeEmailDomain: vi.fn().mockResolvedValue(false),
      },
    });

    const result = await checkIfFreeEmailDomain({ email: "test@corporatedomain.com" });

    expect(getWatchlistFeatureMock).toHaveBeenCalled();

    const mockInstance = getWatchlistFeatureMock.mock.results.at(-1)?.value;

    expect(mockInstance.globalBlocking.isFreeEmailDomain).toHaveBeenCalledWith("corporatedomain.com");
    expect(result).toBe(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
