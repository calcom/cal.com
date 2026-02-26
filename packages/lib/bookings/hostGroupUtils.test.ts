import { describe, expect, it } from "vitest";

import { DEFAULT_GROUP_ID } from "@calcom/lib/constants";

import { getHostsFromOtherGroups, groupHostsByGroupId, sortHosts } from "./hostGroupUtils";

describe("groupHostsByGroupId", () => {
  it("groups hosts into default group when no hostGroups provided", () => {
    const hosts = [{ name: "Alice" }, { name: "Bob" }];
    const result = groupHostsByGroupId({ hosts });
    expect(result[DEFAULT_GROUP_ID]).toHaveLength(2);
  });

  it("groups hosts by their groupId when hostGroups exist", () => {
    const hosts = [
      { name: "Alice", groupId: "g1" },
      { name: "Bob", groupId: "g2" },
      { name: "Charlie", groupId: "g1" },
    ];
    const hostGroups = [{ id: "g1" }, { id: "g2" }];
    const result = groupHostsByGroupId({ hosts, hostGroups });
    expect(result["g1"]).toHaveLength(2);
    expect(result["g2"]).toHaveLength(1);
  });

  it("puts hosts without groupId into default group when hostGroups exist", () => {
    const hosts = [{ name: "Alice", groupId: null }, { name: "Bob" }];
    const hostGroups = [{ id: "g1" }];
    const result = groupHostsByGroupId({ hosts, hostGroups });
    // Hosts without groupId don't match any group, so they go nowhere
    expect(result["g1"]).toHaveLength(0);
  });

  it("returns empty groups for empty hosts array", () => {
    const result = groupHostsByGroupId({ hosts: [] });
    expect(result[DEFAULT_GROUP_ID]).toEqual([]);
  });

  it("ignores hosts with groupIds not in hostGroups", () => {
    const hosts = [{ name: "Alice", groupId: "nonexistent" }];
    const hostGroups = [{ id: "g1" }];
    const result = groupHostsByGroupId({ hosts, hostGroups });
    expect(result["g1"]).toHaveLength(0);
  });

  it("handles empty hostGroups array (uses default)", () => {
    const hosts = [{ name: "Alice" }];
    const result = groupHostsByGroupId({ hosts, hostGroups: [] });
    expect(result[DEFAULT_GROUP_ID]).toHaveLength(1);
  });
});

describe("getHostsFromOtherGroups", () => {
  it("returns hosts not in the specified group", () => {
    const hosts = [
      { name: "Alice", groupId: "g1" },
      { name: "Bob", groupId: "g2" },
      { name: "Charlie", groupId: "g1" },
    ] as const;
    const result = getHostsFromOtherGroups(hosts, "g1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bob");
  });

  it("returns hosts with groupId when passed null groupId", () => {
    const hosts = [
      { name: "Alice", groupId: "g1" },
      { name: "Bob", groupId: null },
    ] as const;
    const result = getHostsFromOtherGroups(hosts, null);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("returns hosts without groupId as belonging to other group", () => {
    const hosts = [
      { name: "Alice", groupId: "g1" },
      { name: "Bob" },
    ] as const;
    const result = getHostsFromOtherGroups(hosts, "g1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bob");
  });

  it("returns empty array when all hosts are in the same group", () => {
    const hosts = [
      { name: "Alice", groupId: "g1" },
      { name: "Bob", groupId: "g1" },
    ] as const;
    const result = getHostsFromOtherGroups(hosts, "g1");
    expect(result).toHaveLength(0);
  });
});

describe("sortHosts", () => {
  it("sorts by weight descending when weights enabled and weights differ", () => {
    const hostA = { priority: 1, weight: 200 };
    const hostB = { priority: 1, weight: 100 };
    // weightB - weightA = 100 - 200 = -100 (A first)
    expect(sortHosts(hostA, hostB, true)).toBe(-100);
  });

  it("sorts by priority descending when weights enabled but weights equal", () => {
    const hostA = { priority: 1, weight: 100 };
    const hostB = { priority: 3, weight: 100 };
    // priorityB - priorityA = 3 - 1 = 2 (B first)
    expect(sortHosts(hostA, hostB, true)).toBe(2);
  });

  it("sorts by priority descending when weights disabled", () => {
    const hostA = { priority: 1, weight: 200 };
    const hostB = { priority: 3, weight: 100 };
    expect(sortHosts(hostA, hostB, false)).toBe(2);
  });

  it("uses default weight 100 when weight is null", () => {
    const hostA = { priority: 2, weight: null };
    const hostB = { priority: 2, weight: null };
    // Both default to 100, equal weights → sort by priority
    expect(sortHosts(hostA, hostB, true)).toBe(0);
  });

  it("uses default priority 2 when priority is null", () => {
    const hostA = { priority: null, weight: 100 };
    const hostB = { priority: null, weight: 100 };
    expect(sortHosts(hostA, hostB, true)).toBe(0);
  });
});
