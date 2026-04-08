import type { Host, PendingHostChanges } from "@calcom/features/eventtypes/lib/types";
import { describe, expect, it } from "vitest";
import { applyPendingChanges } from "../use-all-hosts";

function makeHost(userId: number, overrides: Partial<Host> = {}): Host {
  return {
    userId,
    isFixed: false,
    priority: 2,
    weight: 100,
    groupId: null,
    location: null,
    ...overrides,
  };
}

const EMPTY_PENDING: PendingHostChanges = {
  hostsToAdd: [],
  hostsToUpdate: [],
  hostsToRemove: [],
};

describe("applyPendingChanges", () => {
  describe("no-op", () => {
    it("returns the same array when pending changes are empty", () => {
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, EMPTY_PENDING);
      expect(result).toBe(hosts); // same reference — no copy
    });

    it("returns empty array when server hosts are empty and no pending changes", () => {
      const result = applyPendingChanges([], EMPTY_PENDING);
      expect(result).toEqual([]);
    });
  });

  describe("hostsToRemove", () => {
    it("removes hosts by userId", () => {
      const hosts = [makeHost(1), makeHost(2), makeHost(3)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToRemove: [2],
      });
      expect(result.map((h) => h.userId)).toEqual([1, 3]);
    });

    it("removes multiple hosts at once", () => {
      const hosts = [makeHost(1), makeHost(2), makeHost(3), makeHost(4)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToRemove: [1, 3],
      });
      expect(result.map((h) => h.userId)).toEqual([2, 4]);
    });

    it("ignores removal of non-existent userId", () => {
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToRemove: [999],
      });
      expect(result.map((h) => h.userId)).toEqual([1, 2]);
    });
  });

  describe("hostsToUpdate", () => {
    it("updates host location", () => {
      const location = {
        userId: 1,
        eventTypeId: 10,
        type: "inPerson" as const,
        address: "123 Main St",
      };
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, location }],
      });
      expect(result[0].location).toEqual(location);
      expect(result[1].location).toBeNull(); // unchanged
    });

    it("updates host priority and weight", () => {
      const hosts = [makeHost(1, { priority: 2, weight: 100 })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, priority: 5, weight: 200 }],
      });
      expect(result[0].priority).toBe(5);
      expect(result[0].weight).toBe(200);
    });

    it("updates isFixed flag", () => {
      const hosts = [makeHost(1, { isFixed: false })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, isFixed: true }],
      });
      expect(result[0].isFixed).toBe(true);
    });

    it("updates scheduleId and groupId", () => {
      const hosts = [makeHost(1, { scheduleId: null, groupId: null })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, scheduleId: 42, groupId: "group-1" }],
      });
      expect(result[0].scheduleId).toBe(42);
      expect(result[0].groupId).toBe("group-1");
    });

    it("does not modify fields that are not in the update", () => {
      const hosts = [makeHost(1, { priority: 3, weight: 150 })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, priority: 5 }],
      });
      expect(result[0].priority).toBe(5);
      expect(result[0].weight).toBe(150); // unchanged
    });

    it("ignores update for non-existent userId", () => {
      const hosts = [makeHost(1)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 999, priority: 5 }],
      });
      expect(result[0].priority).toBe(2); // unchanged
    });
  });

  describe("hostsToAdd", () => {
    it("adds a new host", () => {
      const hosts = [makeHost(1)];
      const newHost = makeHost(2, { priority: 5 });
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToAdd: [newHost],
      });
      expect(result).toHaveLength(2);
      expect(result[1].userId).toBe(2);
      expect(result[1].priority).toBe(5);
    });

    it("does not add duplicate if userId already in server hosts", () => {
      const hosts = [makeHost(1)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToAdd: [makeHost(1, { priority: 99 })],
      });
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe(2); // original value, not overwritten
    });

    it("adds multiple hosts", () => {
      const hosts = [makeHost(1)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToAdd: [makeHost(5), makeHost(6)],
      });
      expect(result.map((h) => h.userId)).toEqual([1, 5, 6]);
    });
  });

  describe("clearAllHostLocations", () => {
    it("nulls out all host locations", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "123 Main" };
      const hosts = [makeHost(1, { location }), makeHost(2, { location: { ...location, userId: 2 } })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        clearAllHostLocations: true,
      });
      expect(result[0].location).toBeNull();
      expect(result[1].location).toBeNull();
    });

    it("does not null locations when clearAllHostLocations is false", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "123 Main" };
      const hosts = [makeHost(1, { location })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        clearAllHostLocations: false,
      });
      // With clearAllHostLocations=false and no other changes, returns same reference
      expect(result).toBe(hosts);
    });

    it("clearAllHostLocations overrides explicit location updates", () => {
      const oldLocation = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "Old" };
      const newLocation = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "New" };
      const hosts = [
        makeHost(1, { location: oldLocation }),
        makeHost(2, { location: { ...oldLocation, userId: 2 } }),
      ];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, location: newLocation }],
        clearAllHostLocations: true,
      });
      // clearAllHostLocations always wins — even explicit location updates are nulled
      expect(result[0].location).toBeNull();
      expect(result[1].location).toBeNull();
    });
  });

  describe("clearAllHostLocations — edge cases", () => {
    it("nulls locations on hosts that have no existing location (no-op per host)", () => {
      const hosts = [makeHost(1), makeHost(2)]; // both have location: null
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        clearAllHostLocations: true,
      });
      expect(result[0].location).toBeNull();
      expect(result[1].location).toBeNull();
    });

    it("nulls locations on newly added hosts when clearAllHostLocations is true", () => {
      const location = { userId: 5, eventTypeId: 10, type: "inPerson" as const, address: "HQ" };
      const hosts = [makeHost(1)];
      const result = applyPendingChanges(hosts, {
        hostsToAdd: [makeHost(5, { location })],
        hostsToUpdate: [],
        hostsToRemove: [],
        clearAllHostLocations: true,
      });
      // The newly added host keeps its location since clearAllHostLocations only
      // affects the map step (existing hosts), not the add step
      expect(result).toHaveLength(2);
      expect(result[0].location).toBeNull(); // existing host nulled
    });

    it("clearAllHostLocations with only hostsToRemove still triggers location clearing", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "Main" };
      const hosts = [makeHost(1, { location }), makeHost(2, { location: { ...location, userId: 2 } })];
      const result = applyPendingChanges(hosts, {
        hostsToAdd: [],
        hostsToUpdate: [],
        hostsToRemove: [2],
        clearAllHostLocations: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].location).toBeNull();
    });
  });

  describe("hostsToUpdate — edge cases", () => {
    it("update on a removed host has no effect (removal happens first)", () => {
      const hosts = [makeHost(1, { priority: 2 }), makeHost(2, { priority: 3 })];
      const result = applyPendingChanges(hosts, {
        hostsToRemove: [1],
        hostsToUpdate: [{ userId: 1, priority: 10 }],
        hostsToAdd: [],
      });
      // Host 1 is removed, so the update is ignored
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(2);
    });

    it("last update wins when multiple updates target same userId", () => {
      const hosts = [makeHost(1, { priority: 2 })];
      // Map uses userId as key, so the last entry for userId=1 overwrites previous
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [
          { userId: 1, priority: 5 },
          { userId: 1, priority: 10 },
        ],
      });
      expect(result[0].priority).toBe(10);
    });

    it("partial update preserves all non-updated fields", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "123 Main" };
      const hosts = [
        makeHost(1, { priority: 3, weight: 150, isFixed: true, scheduleId: 42, groupId: "g1", location }),
      ];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, priority: 5 }],
      });
      expect(result[0].priority).toBe(5);
      expect(result[0].weight).toBe(150);
      expect(result[0].isFixed).toBe(true);
      expect(result[0].scheduleId).toBe(42);
      expect(result[0].groupId).toBe("g1");
      expect(result[0].location).toEqual(location);
    });

    it("updates multiple different hosts in one delta", () => {
      const hosts = [
        makeHost(1, { priority: 2 }),
        makeHost(2, { priority: 3 }),
        makeHost(3, { priority: 4 }),
      ];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [
          { userId: 1, priority: 10 },
          { userId: 3, weight: 500 },
        ],
      });
      expect(result[0].priority).toBe(10);
      expect(result[1].priority).toBe(3); // unchanged
      expect(result[2].weight).toBe(500);
      expect(result[2].priority).toBe(4); // unchanged
    });

    it("sets location to null (explicit removal)", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "Main" };
      const hosts = [makeHost(1, { location })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToUpdate: [{ userId: 1, location: null }],
      });
      expect(result[0].location).toBeNull();
    });
  });

  describe("hostsToAdd — edge cases", () => {
    it("adds hosts to an empty baseline", () => {
      const result = applyPendingChanges([], {
        ...EMPTY_PENDING,
        hostsToAdd: [makeHost(1), makeHost(2, { priority: 5 })],
      });
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(1);
      expect(result[1].priority).toBe(5);
    });

    it("does not add host with same userId as a surviving (non-removed) host", () => {
      const hosts = [makeHost(1, { priority: 2 })];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToAdd: [makeHost(1, { priority: 99 })],
      });
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe(2); // original preserved
    });

    it("deduplicates multiple adds with same userId (first one wins)", () => {
      const result = applyPendingChanges([], {
        ...EMPTY_PENDING,
        hostsToAdd: [makeHost(1, { priority: 5 }), makeHost(1, { priority: 10 })],
      });
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe(5); // first add wins
    });
  });

  describe("hostsToRemove — edge cases", () => {
    it("removes all hosts leaving empty array", () => {
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        hostsToRemove: [1, 2],
      });
      expect(result).toEqual([]);
    });

    it("removing all then adding results in only added hosts", () => {
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        hostsToRemove: [1, 2],
        hostsToUpdate: [],
        hostsToAdd: [makeHost(3, { priority: 7 })],
      });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(3);
      expect(result[0].priority).toBe(7);
    });
  });

  describe("combined operations", () => {
    it("applies remove + update + add in one delta", () => {
      const hosts = [makeHost(1), makeHost(2, { priority: 2 }), makeHost(3)];
      const result = applyPendingChanges(hosts, {
        hostsToRemove: [3],
        hostsToUpdate: [{ userId: 2, priority: 10 }],
        hostsToAdd: [makeHost(4, { weight: 300 })],
      });
      expect(result.map((h) => h.userId)).toEqual([1, 2, 4]);
      expect(result.find((h) => h.userId === 2)?.priority).toBe(10);
      expect(result.find((h) => h.userId === 4)?.weight).toBe(300);
    });

    it("remove then add same userId — host is re-added", () => {
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        hostsToRemove: [2],
        hostsToUpdate: [],
        hostsToAdd: [makeHost(2, { priority: 99 })],
      });
      expect(result.map((h) => h.userId)).toEqual([1, 2]);
      expect(result.find((h) => h.userId === 2)?.priority).toBe(99);
    });

    it("remove + update + add + clearAllHostLocations combined", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "Main" };
      const hosts = [
        makeHost(1, { location }),
        makeHost(2, { location: { ...location, userId: 2 } }),
        makeHost(3),
      ];
      const result = applyPendingChanges(hosts, {
        hostsToRemove: [3],
        hostsToUpdate: [{ userId: 2, priority: 10 }],
        hostsToAdd: [makeHost(4)],
        clearAllHostLocations: true,
      });
      expect(result.map((h) => h.userId)).toEqual([1, 2, 4]);
      // All existing hosts have locations nulled
      expect(result[0].location).toBeNull();
      expect(result[1].location).toBeNull();
      // Updated host still gets priority change
      expect(result[1].priority).toBe(10);
    });

    it("update + add with no overlap preserves order", () => {
      const hosts = [makeHost(1), makeHost(2), makeHost(3)];
      const result = applyPendingChanges(hosts, {
        hostsToRemove: [],
        hostsToUpdate: [{ userId: 2, weight: 999 }],
        hostsToAdd: [makeHost(4), makeHost(5)],
      });
      expect(result.map((h) => h.userId)).toEqual([1, 2, 3, 4, 5]);
      expect(result[1].weight).toBe(999);
    });

    it("clearAllHosts removes all baseline hosts", () => {
      const hosts = [makeHost(1), makeHost(2), makeHost(3)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        clearAllHosts: true,
      });
      expect(result).toEqual([]);
    });

    it("clearAllHosts with hostsToAdd returns only added hosts", () => {
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        hostsToAdd: [makeHost(5, { priority: 7 }), makeHost(6)],
        hostsToUpdate: [],
        hostsToRemove: [],
        clearAllHosts: true,
      });
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(5);
      expect(result[0].priority).toBe(7);
      expect(result[1].userId).toBe(6);
    });

    it("clearAllHosts ignores hostsToRemove and hostsToUpdate", () => {
      const hosts = [makeHost(1, { priority: 2 }), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        hostsToAdd: [makeHost(3)],
        hostsToUpdate: [{ userId: 1, priority: 10 }],
        hostsToRemove: [2],
        clearAllHosts: true,
      });
      // clearAllHosts short-circuits — only hostsToAdd returned
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(3);
    });

    it("clearAllHosts=false does not clear hosts", () => {
      const hosts = [makeHost(1), makeHost(2)];
      const result = applyPendingChanges(hosts, {
        ...EMPTY_PENDING,
        clearAllHosts: false,
      });
      // clearAllHosts=false with no other changes returns same reference
      expect(result).toBe(hosts);
    });

    it("clearAllHosts on empty baseline returns empty", () => {
      const result = applyPendingChanges([], {
        ...EMPTY_PENDING,
        clearAllHosts: true,
      });
      expect(result).toEqual([]);
    });

    it("handles large batch operations correctly", () => {
      const hosts = Array.from({ length: 50 }, (_, i) => makeHost(i + 1, { priority: 2 }));
      const result = applyPendingChanges(hosts, {
        hostsToRemove: [1, 10, 20, 30, 40, 50],
        hostsToUpdate: [
          { userId: 5, priority: 10 },
          { userId: 15, weight: 500 },
          { userId: 25, isFixed: true },
        ],
        hostsToAdd: [makeHost(51), makeHost(52)],
      });
      // 50 - 6 removed + 2 added = 46
      expect(result).toHaveLength(46);
      expect(result.find((h) => h.userId === 5)?.priority).toBe(10);
      expect(result.find((h) => h.userId === 15)?.weight).toBe(500);
      expect(result.find((h) => h.userId === 25)?.isFixed).toBe(true);
      expect(result.find((h) => h.userId === 1)).toBeUndefined();
      expect(result.find((h) => h.userId === 51)).toBeDefined();
    });
  });
});
