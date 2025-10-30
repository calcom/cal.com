import type { Mock } from "vitest";
import { describe, expect, test, vi, afterEach } from "vitest";

import { WatchlistRepository } from "@calcom/features/watchlist/watchlist.repository";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

vi.mock("@calcom/features/watchlist/watchlist.repository", () => {
  return {
    WatchlistRepository: vi.fn().mockImplementation(() => ({
      getFreeEmailDomainInWatchlist: vi.fn().mockResolvedValue(undefined),
    })),
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
    const WatchlistRepoMock = WatchlistRepository as Mock;

    await checkIfFreeEmailDomain("test@freedomain.com");

    expect(WatchlistRepoMock).toHaveBeenCalled();

    const mockInstance = WatchlistRepoMock.mock.results.at(-1)?.value;

    expect(mockInstance.getFreeEmailDomainInWatchlist).toHaveBeenCalledWith("freedomain.com");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
