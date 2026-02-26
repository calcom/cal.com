import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}));

import {
  addRecentImpersonation,
  clearRecentImpersonations,
  getRecentImpersonations,
} from "./recentImpersonations";

describe("recentImpersonations", () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    vi.spyOn(Date, "now").mockReturnValue(1000000);
  });

  describe("getRecentImpersonations", () => {
    it("returns empty array when nothing stored", () => {
      mockGetItem.mockReturnValue(null);
      expect(getRecentImpersonations()).toEqual([]);
    });

    it("returns parsed data from localStorage", () => {
      const data = [{ username: "alice", timestamp: 100 }];
      mockGetItem.mockReturnValue(JSON.stringify(data));
      expect(getRecentImpersonations()).toEqual(data);
    });

    it("returns empty array on invalid JSON", () => {
      mockGetItem.mockReturnValue("not-json");
      expect(getRecentImpersonations()).toEqual([]);
    });

    it("reads from correct storage key", () => {
      mockGetItem.mockReturnValue(null);
      getRecentImpersonations();
      expect(mockGetItem).toHaveBeenCalledWith("cal-recent-impersonations");
    });
  });

  describe("addRecentImpersonation", () => {
    it("adds new entry to the front", () => {
      mockGetItem.mockReturnValue("[]");
      addRecentImpersonation("Alice");
      expect(mockSetItem).toHaveBeenCalledWith(
        "cal-recent-impersonations",
        JSON.stringify([{ username: "alice", timestamp: 1000000 }])
      );
    });

    it("trims and lowercases username", () => {
      mockGetItem.mockReturnValue("[]");
      addRecentImpersonation("  Bob  ");
      const stored = JSON.parse(mockSetItem.mock.calls[0][1] as string);
      expect(stored[0].username).toBe("bob");
    });

    it("does nothing for empty username", () => {
      mockGetItem.mockReturnValue("[]");
      addRecentImpersonation("   ");
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it("deduplicates existing username and moves to front", () => {
      const existing = [
        { username: "alice", timestamp: 500 },
        { username: "bob", timestamp: 400 },
      ];
      mockGetItem.mockReturnValue(JSON.stringify(existing));
      addRecentImpersonation("bob");
      const stored = JSON.parse(mockSetItem.mock.calls[0][1] as string);
      expect(stored[0].username).toBe("bob");
      expect(stored[0].timestamp).toBe(1000000);
      expect(stored[1].username).toBe("alice");
      expect(stored).toHaveLength(2);
    });

    it("limits to 5 entries", () => {
      const existing = Array.from({ length: 5 }, (_, i) => ({
        username: `user${i}`,
        timestamp: i,
      }));
      mockGetItem.mockReturnValue(JSON.stringify(existing));
      addRecentImpersonation("newuser");
      const stored = JSON.parse(mockSetItem.mock.calls[0][1] as string);
      expect(stored).toHaveLength(5);
      expect(stored[0].username).toBe("newuser");
    });
  });

  describe("clearRecentImpersonations", () => {
    it("removes the storage key", () => {
      clearRecentImpersonations();
      expect(mockRemoveItem).toHaveBeenCalledWith("cal-recent-impersonations");
    });
  });
});
