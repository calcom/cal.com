import { describe, expect, test, vi } from "vitest";

import { WatchlistRepository } from "@calcom/features/watchlist/watchlist.repository";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

describe("checkIfFreeEmailDomain", () => {
  test("If gmail should return true", () => {
    expect(checkIfFreeEmailDomain("test@gmail.com")).toBe(true);
  });
  test("If outlook should return true", () => {
    expect(checkIfFreeEmailDomain("test@outlook.com")).toBe(true);
  });
  test("If work email, should return false", () => {
    const spy = vi.spyOn(WatchlistRepository.prototype, "getFreeEmailDomainInWatchlist");
    spy.mockImplementation(() => {
      return null;
    });
    expect(checkIfFreeEmailDomain("test@cal.com")).toBe(false);
  });
  test("If free email domain in watchlist, should return true", () => {
    const spy = vi.spyOn(WatchlistRepository.prototype, "getFreeEmailDomainInWatchlist");
    spy.mockImplementation(() => {
      return { value: "freedomain.com" };
    });
    expect(checkIfFreeEmailDomain("test@freedomain.com")).toBe(true);
  });
});
