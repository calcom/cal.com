import { describe, expect, test, vi } from "vitest";

import { WatchlistType } from "@calcom/prisma/enums";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

vi.mock("@calcom/features/watchlist/watchlist.repository", () => ({
  getFreeEmailDomainInWatchlist: vi.fn().mockImplementation((emailDomain) => {
    if (emailDomain !== "freedomain.com") return false;
    return {
      id: "2",
      type: WatchlistType.DOMAIN,
      vale: "freedomain.com",
      description: "Free email domain",
      createdAt: new Date(),
      createdById: 2,
      updatedAt: new Date(),
      updatedById: 2,
    };
  }),
}));

describe("checkIfFreeEmailDomain", () => {
  test("If gmail should return true", () => {
    expect(checkIfFreeEmailDomain("test@gmail.com")).toBe(true);
  });
  test("If outlook should return true", () => {
    expect(checkIfFreeEmailDomain("test@outlook.com")).toBe(true);
  });
  test("If work email, should return false", () => {
    expect(checkIfFreeEmailDomain("test@cal.com")).toBe(false);
  });
});
