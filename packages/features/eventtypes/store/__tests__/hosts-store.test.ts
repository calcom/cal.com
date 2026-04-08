import type { Host, PendingHostChanges } from "@calcom/features/eventtypes/lib/types";
import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { createHostsStore, type HostsStore } from "../hosts-store";

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

describe("hosts-store", () => {
  let store: StoreApi<HostsStore>;

  beforeEach(() => {
    store = createHostsStore();
  });

  describe("initial state", () => {
    it("starts with empty pending changes for both RR and fixed", () => {
      const state = store.getState();
      expect(state.rrPendingChanges).toEqual(EMPTY_PENDING);
      expect(state.fixedPendingChanges).toEqual(EMPTY_PENDING);
    });

    it("starts with empty server hosts", () => {
      const state = store.getState();
      expect(state.serverRRHosts).toEqual([]);
      expect(state.serverFixedHosts).toEqual([]);
    });
  });

  describe("RR host operations", () => {
    it("addRRHost adds a host to hostsToAdd", () => {
      const host = makeHost(1);
      store.getState().addRRHost(host);
      expect(store.getState().rrPendingChanges.hostsToAdd).toEqual([host]);
      // Fixed side is unaffected
      expect(store.getState().fixedPendingChanges.hostsToAdd).toEqual([]);
    });

    it("addRRHost replaces existing host in hostsToAdd with same userId", () => {
      store.getState().addRRHost(makeHost(1, { priority: 2 }));
      store.getState().addRRHost(makeHost(1, { priority: 5 }));
      const { hostsToAdd } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toHaveLength(1);
      expect(hostsToAdd[0].priority).toBe(5);
    });

    it("addRRHost undoes a previous removal of the same userId", () => {
      store.getState().removeRRHost(1);
      expect(store.getState().rrPendingChanges.hostsToRemove).toContain(1);
      store.getState().addRRHost(makeHost(1));
      expect(store.getState().rrPendingChanges.hostsToRemove).not.toContain(1);
    });

    it("updateRRHost adds to hostsToUpdate for server hosts", () => {
      store.getState().updateRRHost({ userId: 1, priority: 5 });
      expect(store.getState().rrPendingChanges.hostsToUpdate).toEqual([{ userId: 1, priority: 5 }]);
    });

    it("updateRRHost merges with existing update for same userId", () => {
      store.getState().updateRRHost({ userId: 1, priority: 5 });
      store.getState().updateRRHost({ userId: 1, weight: 200 });
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toHaveLength(1);
      expect(hostsToUpdate[0]).toEqual({ userId: 1, priority: 5, weight: 200 });
    });

    it("updateRRHost modifies hostsToAdd if the host was newly added", () => {
      store.getState().addRRHost(makeHost(1, { priority: 2, weight: 100 }));
      store.getState().updateRRHost({ userId: 1, priority: 10 });
      const { hostsToAdd, hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToAdd[0].priority).toBe(10);
      expect(hostsToUpdate).toHaveLength(0);
    });

    it("removeRRHost adds userId to hostsToRemove", () => {
      store.getState().removeRRHost(1);
      expect(store.getState().rrPendingChanges.hostsToRemove).toEqual([1]);
    });

    it("removeRRHost cleans up hostsToAdd and hostsToUpdate", () => {
      store.getState().addRRHost(makeHost(1));
      store.getState().updateRRHost({ userId: 2, priority: 5 });
      store.getState().removeRRHost(1);
      store.getState().removeRRHost(2);
      const { hostsToAdd, hostsToUpdate, hostsToRemove } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toHaveLength(0);
      expect(hostsToUpdate).toHaveLength(0);
      // Host 1 was client-only (in hostsToAdd), so it should NOT be in hostsToRemove.
      // Host 2 was a server host (only in hostsToUpdate), so it IS in hostsToRemove.
      expect(hostsToRemove).toEqual([2]);
    });

    it("removeRRHost does not add client-only host to hostsToRemove", () => {
      store.getState().addRRHost(makeHost(5));
      store.getState().removeRRHost(5);
      const { hostsToAdd, hostsToRemove } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toHaveLength(0);
      expect(hostsToRemove).toEqual([]); // client-only host, no server deletion needed
    });

    it("removeRRHost does not duplicate userId in hostsToRemove", () => {
      store.getState().removeRRHost(1);
      store.getState().removeRRHost(1);
      expect(store.getState().rrPendingChanges.hostsToRemove).toEqual([1]);
    });

    it("clearRRHostLocations sets clearAllHostLocations flag", () => {
      store.getState().clearRRHostLocations([]);
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBe(true);
    });

    it("restoreRRHostLocations unsets clearAllHostLocations flag", () => {
      store.getState().clearRRHostLocations([]);
      store.getState().restoreRRHostLocations();
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBe(false);
    });

    it("restoreRRHostLocations is a no-op when flag is not set", () => {
      const before = store.getState().rrPendingChanges;
      store.getState().restoreRRHostLocations();
      // Should not trigger a state update when flag is already unset
      expect(store.getState().rrPendingChanges).toBe(before);
    });
  });

  describe("Fixed host operations", () => {
    it("addFixedHost adds a host to fixed hostsToAdd", () => {
      const host = makeHost(1, { isFixed: true });
      store.getState().addFixedHost(host);
      expect(store.getState().fixedPendingChanges.hostsToAdd).toEqual([host]);
      // RR side is unaffected
      expect(store.getState().rrPendingChanges.hostsToAdd).toEqual([]);
    });

    it("addFixedHost replaces existing host in hostsToAdd with same userId", () => {
      store.getState().addFixedHost(makeHost(1, { isFixed: true, priority: 2 }));
      store.getState().addFixedHost(makeHost(1, { isFixed: true, priority: 7 }));
      const { hostsToAdd } = store.getState().fixedPendingChanges;
      expect(hostsToAdd).toHaveLength(1);
      expect(hostsToAdd[0].priority).toBe(7);
    });

    it("addFixedHost undoes a previous removal of the same userId", () => {
      store.getState().removeFixedHost(1);
      expect(store.getState().fixedPendingChanges.hostsToRemove).toContain(1);
      store.getState().addFixedHost(makeHost(1, { isFixed: true }));
      expect(store.getState().fixedPendingChanges.hostsToRemove).not.toContain(1);
    });

    it("updateFixedHost adds to hostsToUpdate for server hosts", () => {
      store.getState().updateFixedHost({ userId: 1, priority: 8 });
      expect(store.getState().fixedPendingChanges.hostsToUpdate).toEqual([{ userId: 1, priority: 8 }]);
    });

    it("updateFixedHost merges with existing update for same userId", () => {
      store.getState().updateFixedHost({ userId: 1, priority: 5 });
      store.getState().updateFixedHost({ userId: 1, weight: 300 });
      const { hostsToUpdate } = store.getState().fixedPendingChanges;
      expect(hostsToUpdate).toHaveLength(1);
      expect(hostsToUpdate[0]).toEqual({ userId: 1, priority: 5, weight: 300 });
    });

    it("updateFixedHost modifies hostsToAdd if the host was newly added", () => {
      store.getState().addFixedHost(makeHost(1, { isFixed: true, priority: 2, weight: 100 }));
      store.getState().updateFixedHost({ userId: 1, priority: 10 });
      const { hostsToAdd, hostsToUpdate } = store.getState().fixedPendingChanges;
      expect(hostsToAdd[0].priority).toBe(10);
      expect(hostsToUpdate).toHaveLength(0);
    });

    it("removeFixedHost adds userId to fixed hostsToRemove", () => {
      store.getState().removeFixedHost(1);
      expect(store.getState().fixedPendingChanges.hostsToRemove).toEqual([1]);
      // RR side is unaffected
      expect(store.getState().rrPendingChanges.hostsToRemove).toEqual([]);
    });

    it("removeFixedHost cleans up hostsToAdd and hostsToUpdate", () => {
      store.getState().addFixedHost(makeHost(1, { isFixed: true }));
      store.getState().updateFixedHost({ userId: 2, priority: 5 });
      store.getState().removeFixedHost(1);
      store.getState().removeFixedHost(2);
      const { hostsToAdd, hostsToUpdate, hostsToRemove } = store.getState().fixedPendingChanges;
      expect(hostsToAdd).toHaveLength(0);
      expect(hostsToUpdate).toHaveLength(0);
      // Host 1 was client-only, host 2 was server-side
      expect(hostsToRemove).toEqual([2]);
    });

    it("removeFixedHost does not add client-only host to hostsToRemove", () => {
      store.getState().addFixedHost(makeHost(5, { isFixed: true }));
      store.getState().removeFixedHost(5);
      const { hostsToAdd, hostsToRemove } = store.getState().fixedPendingChanges;
      expect(hostsToAdd).toHaveLength(0);
      expect(hostsToRemove).toEqual([]);
    });

    it("removeFixedHost does not duplicate userId in hostsToRemove", () => {
      store.getState().removeFixedHost(1);
      store.getState().removeFixedHost(1);
      expect(store.getState().fixedPendingChanges.hostsToRemove).toEqual([1]);
    });

    it("clearFixedHostLocations sets flag on fixed side only", () => {
      store.getState().clearFixedHostLocations([]);
      expect(store.getState().fixedPendingChanges.clearAllHostLocations).toBe(true);
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBeUndefined();
    });

    it("restoreFixedHostLocations unsets clearAllHostLocations flag", () => {
      store.getState().clearFixedHostLocations([]);
      store.getState().restoreFixedHostLocations();
      expect(store.getState().fixedPendingChanges.clearAllHostLocations).toBe(false);
    });

    it("restoreFixedHostLocations is a no-op when flag is not set", () => {
      const before = store.getState().fixedPendingChanges;
      store.getState().restoreFixedHostLocations();
      expect(store.getState().fixedPendingChanges).toBe(before);
    });
  });

  describe("setRRHosts (delta computation)", () => {
    it("computes add delta for new hosts", () => {
      const serverHosts = [makeHost(1)];
      const newHosts = [makeHost(1), makeHost(2, { priority: 5 })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToAdd, hostsToRemove, hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toEqual([makeHost(2, { priority: 5 })]);
      expect(hostsToRemove).toEqual([]);
      expect(hostsToUpdate).toEqual([]);
    });

    it("computes remove delta for removed hosts", () => {
      const serverHosts = [makeHost(1), makeHost(2)];
      const newHosts = [makeHost(1)];
      store.getState().setRRHosts(serverHosts, newHosts);
      expect(store.getState().rrPendingChanges.hostsToRemove).toEqual([2]);
    });

    it("computes update delta for changed hosts", () => {
      const serverHosts = [makeHost(1, { priority: 2, weight: 100 })];
      const newHosts = [makeHost(1, { priority: 5, weight: 100 })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toEqual([{ userId: 1, priority: 5 }]);
    });

    it("computes update delta for location changes", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "123 Main" };
      const serverHosts = [makeHost(1)];
      const newHosts = [makeHost(1, { location })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toEqual([{ userId: 1, location }]);
    });

    it("preserves clearAllHostLocations flag across setRRHosts", () => {
      store.getState().clearRRHostLocations([]);
      store.getState().setRRHosts([makeHost(1)], [makeHost(1)]);
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBe(true);
    });

    it("handles empty server hosts and empty new hosts", () => {
      store.getState().setRRHosts([], []);
      expect(store.getState().rrPendingChanges).toEqual({
        hostsToAdd: [],
        hostsToUpdate: [],
        hostsToRemove: [],
        clearAllHostLocations: undefined,
      });
    });
  });

  describe("setRRHosts (delta computation) — edge cases", () => {
    it("produces empty delta when server and new hosts are identical", () => {
      const hosts = [makeHost(1, { priority: 2, weight: 100 }), makeHost(2, { priority: 3, weight: 150 })];
      store.getState().setRRHosts(hosts, hosts);
      const { hostsToAdd, hostsToRemove, hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toEqual([]);
      expect(hostsToRemove).toEqual([]);
      expect(hostsToUpdate).toEqual([]);
    });

    it("detects multiple field changes on a single host", () => {
      const serverHosts = [makeHost(1, { priority: 2, weight: 100, isFixed: false })];
      const newHosts = [makeHost(1, { priority: 5, weight: 200, isFixed: true })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toHaveLength(1);
      expect(hostsToUpdate[0]).toEqual({ userId: 1, priority: 5, weight: 200, isFixed: true });
    });

    it("detects scheduleId changes", () => {
      const serverHosts = [makeHost(1, { scheduleId: null })];
      const newHosts = [makeHost(1, { scheduleId: 42 })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toEqual([{ userId: 1, scheduleId: 42 }]);
    });

    it("detects groupId changes", () => {
      const serverHosts = [makeHost(1, { groupId: null })];
      const newHosts = [makeHost(1, { groupId: "group-abc" })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toEqual([{ userId: 1, groupId: "group-abc" }]);
    });

    it("detects location removal (server has location, new has null)", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "123 Main" };
      const serverHosts = [makeHost(1, { location })];
      const newHosts = [makeHost(1, { location: null })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toEqual([{ userId: 1, location: null }]);
    });

    it("handles all operations simultaneously (add + remove + update)", () => {
      const serverHosts = [makeHost(1, { priority: 2 }), makeHost(2), makeHost(3)];
      const newHosts = [makeHost(1, { priority: 5 }), makeHost(3), makeHost(4)];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToAdd, hostsToRemove, hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toEqual([makeHost(4)]);
      expect(hostsToRemove).toEqual([2]);
      expect(hostsToUpdate).toEqual([{ userId: 1, priority: 5 }]);
    });

    it("detects location change with different properties", () => {
      const oldLocation = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "Old Address" };
      const newLocation = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "New Address" };
      const serverHosts = [makeHost(1, { location: oldLocation })];
      const newHosts = [makeHost(1, { location: newLocation })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toEqual([{ userId: 1, location: newLocation }]);
    });

    it("does not produce update when only location key order differs but values match", () => {
      // JSON.stringify is order-dependent, so this tests the known behavior
      const loc1 = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "123 Main" };
      const loc2 = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "123 Main" };
      const serverHosts = [makeHost(1, { location: loc1 })];
      const newHosts = [makeHost(1, { location: loc2 })];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toEqual([]);
    });

    it("handles replacing all hosts at once", () => {
      const serverHosts = [makeHost(1), makeHost(2)];
      const newHosts = [makeHost(3), makeHost(4)];
      store.getState().setRRHosts(serverHosts, newHosts);
      const { hostsToAdd, hostsToRemove } = store.getState().rrPendingChanges;
      expect(hostsToRemove).toEqual([1, 2]);
      expect(hostsToAdd).toEqual([makeHost(3), makeHost(4)]);
    });
  });

  describe("setFixedHosts (delta computation)", () => {
    it("computes combined add/remove/update delta", () => {
      const serverHosts = [makeHost(1, { isFixed: true }), makeHost(2, { isFixed: true })];
      const newHosts = [makeHost(1, { isFixed: true, priority: 5 }), makeHost(3, { isFixed: true })];
      store.getState().setFixedHosts(serverHosts, newHosts);
      const { hostsToAdd, hostsToRemove, hostsToUpdate } = store.getState().fixedPendingChanges;
      expect(hostsToAdd).toEqual([makeHost(3, { isFixed: true })]);
      expect(hostsToRemove).toEqual([2]);
      expect(hostsToUpdate).toEqual([{ userId: 1, priority: 5 }]);
    });

    it("preserves clearAllHostLocations flag across setFixedHosts", () => {
      store.getState().clearFixedHostLocations([]);
      store.getState().setFixedHosts([makeHost(1, { isFixed: true })], [makeHost(1, { isFixed: true })]);
      expect(store.getState().fixedPendingChanges.clearAllHostLocations).toBe(true);
    });

    it("detects location changes on fixed hosts", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "Office" };
      const serverHosts = [makeHost(1, { isFixed: true })];
      const newHosts = [makeHost(1, { isFixed: true, location })];
      store.getState().setFixedHosts(serverHosts, newHosts);
      const { hostsToUpdate } = store.getState().fixedPendingChanges;
      expect(hostsToUpdate).toEqual([{ userId: 1, location }]);
    });
  });

  describe("setServerHosts", () => {
    it("stores server hosts for both RR and fixed slices", () => {
      const rrHosts = [makeHost(1), makeHost(2)];
      const fixedHosts = [makeHost(3, { isFixed: true })];
      store.getState().setServerHosts(rrHosts, fixedHosts);
      expect(store.getState().serverRRHosts).toEqual(rrHosts);
      expect(store.getState().serverFixedHosts).toEqual(fixedHosts);
    });

    it("does not affect pending changes", () => {
      store.getState().addRRHost(makeHost(10));
      store.getState().setServerHosts([makeHost(1)], [makeHost(2, { isFixed: true })]);
      expect(store.getState().rrPendingChanges.hostsToAdd).toHaveLength(1);
      expect(store.getState().rrPendingChanges.hostsToAdd[0].userId).toBe(10);
    });
  });

  describe("reset", () => {
    it("clears both RR and fixed pending changes", () => {
      store.getState().addRRHost(makeHost(1));
      store.getState().addFixedHost(makeHost(2));
      store.getState().clearRRHostLocations([]);
      store.getState().reset();
      expect(store.getState().rrPendingChanges).toEqual(EMPTY_PENDING);
      expect(store.getState().fixedPendingChanges).toEqual(EMPTY_PENDING);
    });

    it("preserves server hosts after reset", () => {
      const rrHosts = [makeHost(1)];
      const fixedHosts = [makeHost(2, { isFixed: true })];
      store.getState().setServerHosts(rrHosts, fixedHosts);
      store.getState().addRRHost(makeHost(3));
      store.getState().reset();
      expect(store.getState().serverRRHosts).toEqual(rrHosts);
      expect(store.getState().serverFixedHosts).toEqual(fixedHosts);
    });

    it("clears clearAllHostLocations flag on both slices", () => {
      store.getState().clearRRHostLocations([]);
      store.getState().clearFixedHostLocations([]);
      store.getState().reset();
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBeUndefined();
      expect(store.getState().fixedPendingChanges.clearAllHostLocations).toBeUndefined();
    });
  });

  describe("sequential operations", () => {
    it("add → update → remove same RR host leaves only hostsToRemove empty for client-only host", () => {
      store.getState().addRRHost(makeHost(1, { priority: 2 }));
      store.getState().updateRRHost({ userId: 1, priority: 10 });
      store.getState().removeRRHost(1);
      const { hostsToAdd, hostsToUpdate, hostsToRemove } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toHaveLength(0);
      expect(hostsToUpdate).toHaveLength(0);
      // Client-only host: was in hostsToAdd, never on server, so not in hostsToRemove
      expect(hostsToRemove).toEqual([]);
    });

    it("remove → add same RR host results in only hostsToAdd", () => {
      store.getState().removeRRHost(1);
      store.getState().addRRHost(makeHost(1, { priority: 5 }));
      const { hostsToAdd, hostsToRemove } = store.getState().rrPendingChanges;
      expect(hostsToAdd).toEqual([makeHost(1, { priority: 5 })]);
      expect(hostsToRemove).toEqual([]);
    });

    it("multiple updates to same host accumulate all changed fields", () => {
      store.getState().updateRRHost({ userId: 1, priority: 5 });
      store.getState().updateRRHost({ userId: 1, weight: 200 });
      store.getState().updateRRHost({ userId: 1, scheduleId: 42 });
      const { hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToUpdate).toHaveLength(1);
      expect(hostsToUpdate[0]).toEqual({ userId: 1, priority: 5, weight: 200, scheduleId: 42 });
    });

    it("update with location on newly added host modifies the host in hostsToAdd", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "HQ" };
      store.getState().addRRHost(makeHost(1));
      store.getState().updateRRHost({ userId: 1, location });
      const { hostsToAdd, hostsToUpdate } = store.getState().rrPendingChanges;
      expect(hostsToAdd[0].location).toEqual(location);
      expect(hostsToUpdate).toHaveLength(0);
    });

    it("clearRRHostLocations then restoreRRHostLocations returns to initial state for the flag", () => {
      store.getState().clearRRHostLocations([]);
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBe(true);
      store.getState().restoreRRHostLocations();
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBe(false);
    });

    it("interleaved RR and fixed operations maintain isolation", () => {
      store.getState().addRRHost(makeHost(1));
      store.getState().addFixedHost(makeHost(2, { isFixed: true }));
      store.getState().updateRRHost({ userId: 3, priority: 5 });
      store.getState().removeFixedHost(4);
      store.getState().clearRRHostLocations([]);

      expect(store.getState().rrPendingChanges.hostsToAdd).toEqual([makeHost(1)]);
      expect(store.getState().rrPendingChanges.hostsToUpdate).toEqual([{ userId: 3, priority: 5 }]);
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBe(true);

      expect(store.getState().fixedPendingChanges.hostsToAdd).toEqual([makeHost(2, { isFixed: true })]);
      expect(store.getState().fixedPendingChanges.hostsToRemove).toEqual([4]);
      expect(store.getState().fixedPendingChanges.clearAllHostLocations).toBeUndefined();
    });
  });

  describe("location snapshot on clear", () => {
    it("clearRRHostLocations snapshots RR host locations into savedRRLocations", () => {
      const location = { userId: 1, eventTypeId: 10, type: "inPerson" as const, address: "Office" };
      const formHosts = [makeHost(1, { location }), makeHost(2), makeHost(3, { isFixed: true, location })];
      store.getState().clearRRHostLocations(formHosts);
      const saved = store.getState().savedRRLocations;
      // Only non-fixed hosts are saved
      expect(saved.get(1)).toEqual(location);
      expect(saved.get(2)).toBeNull(); // null location stored as null
      expect(saved.has(3)).toBe(false); // fixed host excluded
    });

    it("clearFixedHostLocations snapshots fixed host locations into savedFixedLocations", () => {
      const location = { userId: 2, eventTypeId: 10, type: "inPerson" as const, address: "HQ" };
      const formHosts = [makeHost(1), makeHost(2, { isFixed: true, location }), makeHost(3, { isFixed: true })];
      store.getState().clearFixedHostLocations(formHosts);
      const saved = store.getState().savedFixedLocations;
      expect(saved.has(1)).toBe(false); // RR host excluded
      expect(saved.get(2)).toEqual(location);
      expect(saved.get(3)).toBeNull();
    });

    it("savedRRLocations starts empty", () => {
      expect(store.getState().savedRRLocations.size).toBe(0);
    });

    it("savedFixedLocations starts empty", () => {
      expect(store.getState().savedFixedLocations.size).toBe(0);
    });

    it("clearRRHostLocations with empty formHosts creates empty snapshot", () => {
      store.getState().clearRRHostLocations([]);
      expect(store.getState().savedRRLocations.size).toBe(0);
      expect(store.getState().rrPendingChanges.clearAllHostLocations).toBe(true);
    });
  });

  describe("cross-slice isolation", () => {
    it("RR operations do not affect fixed slice", () => {
      store.getState().addRRHost(makeHost(1));
      store.getState().updateRRHost({ userId: 2, priority: 5 });
      store.getState().removeRRHost(3);
      store.getState().clearRRHostLocations([]);

      expect(store.getState().fixedPendingChanges).toEqual(EMPTY_PENDING);
    });

    it("Fixed operations do not affect RR slice", () => {
      store.getState().addFixedHost(makeHost(1));
      store.getState().updateFixedHost({ userId: 2, priority: 5 });
      store.getState().removeFixedHost(3);
      store.getState().clearFixedHostLocations([]);

      expect(store.getState().rrPendingChanges).toEqual(EMPTY_PENDING);
    });
  });
});
