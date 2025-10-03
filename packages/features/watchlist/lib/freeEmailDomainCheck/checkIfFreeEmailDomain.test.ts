import type { Mock } from "vitest";
import { describe, expect, test, vi, afterEach } from "vitest";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => {
  return {
    getWatchlistRepository: vi.fn().mockReturnValue({
      getFreeEmailDomainInWatchlist: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

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
    const { getWatchlistRepository } = await import("@calcom/features/di/watchlist/containers/watchlist");
    const getWatchlistRepositoryMock = getWatchlistRepository as Mock;

    await checkIfFreeEmailDomain("test@freedomain.com");

    expect(getWatchlistRepositoryMock).toHaveBeenCalled();

    const mockInstance = getWatchlistRepositoryMock.mock.results.at(-1)?.value;

    expect(mockInstance.getFreeEmailDomainInWatchlist).toHaveBeenCalledWith("freedomain.com");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
