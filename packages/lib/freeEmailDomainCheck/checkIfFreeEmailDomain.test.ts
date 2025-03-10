import { describe, expect, test, vi } from "vitest";

import { WatchlistRepository } from "@calcom/features/watchlist/watchlist.repository";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

describe("checkIfFreeEmailDomain", () => {
  test("If gmail should return true", async () => {
    expect(await checkIfFreeEmailDomain("test@gmail.com")).toBe(true);
  });
  test("If outlook should return true", async () => {
    expect(await checkIfFreeEmailDomain("test@outlook.com")).toBe(true);
  });
  test("If work email, should return false", async () => {
    const spy = vi.spyOn(WatchlistRepository.prototype, "getFreeEmailDomainInWatchlist");
    spy.mockImplementation(() => {
      return null;
    });
    expect(await checkIfFreeEmailDomain("test@cal.com")).toBe(false);
  });
  test("If free email domain in watchlist, should return true", async () => {
    const spy = vi.spyOn(WatchlistRepository.prototype, "getFreeEmailDomainInWatchlist");
    spy.mockImplementation(() => {
      return { value: "freedomain.com" };
    });
    expect(await checkIfFreeEmailDomain("test@freedomain.com")).toBe(true);
  });
});
