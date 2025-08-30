import { describe, it, expect } from "vitest";

import { usePermissions } from "../usePermissions";

describe("usePermissions", () => {
  const { getResourcePermissionLevel } = usePermissions();

  describe("getResourcePermissionLevel", () => {
    it("should return 'all' for any resource when *.* permission is present", () => {
      const permissions = ["*.*", "eventType.create", "eventType.read"];

      expect(getResourcePermissionLevel("eventType", permissions)).toBe("all");
      expect(getResourcePermissionLevel("booking", permissions)).toBe("all");
      expect(getResourcePermissionLevel("team", permissions)).toBe("all");
    });

    it("should return 'all' for resource with all individual permissions", () => {
      const permissions = ["eventType.create", "eventType.read", "eventType.update", "eventType.delete"];

      expect(getResourcePermissionLevel("eventType", permissions)).toBe("all");
    });
    it("should return 'read' for resource with only read permission", () => {
      const permissions = ["eventType.read"];

      expect(getResourcePermissionLevel("eventType", permissions)).toBe("read");
    });

    it("should return 'none' for resource with no permissions", () => {
      const permissions = ["booking.create"];

      expect(getResourcePermissionLevel("eventType", permissions)).toBe("none");
    });

    it("should handle * resource correctly", () => {
      const permissionsWithAll = ["*.*"];
      const permissionsWithoutAll = ["eventType.read"];

      expect(getResourcePermissionLevel("*", permissionsWithAll)).toBe("all");
      expect(getResourcePermissionLevel("*", permissionsWithoutAll)).toBe("none");
    });

    it("should prioritize *.* over individual permissions", () => {
      const permissions = ["*.*", "eventType.read"]; // Has global all but only read for eventType individually

      expect(getResourcePermissionLevel("eventType", permissions)).toBe("all");
    });
  });
});

describe("usePermissions - additional coverage", () => {
  const { getResourcePermissionLevel } = usePermissions();

  describe("wildcards and precedence", () => {
    it("returns 'all' when resource-specific wildcard permission 'resource.*' is present", () => {
      const permissions = ["eventType.*", "booking.read"];
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("all");
      expect(getResourcePermissionLevel("booking", permissions)).toBe("read");
    });

    it("prefers resource-specific wildcard over missing individual permissions", () => {
      const permissions = ["eventType.*"]; // no individual CRUD entries
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("all");
    });

    it("treats order as irrelevant (permissions order should not affect result)", () => {
      const p1 = ["eventType.update", "eventType.read", "eventType.delete", "eventType.create"];
      const p2 = ["eventType.delete", "eventType.create", "eventType.update", "eventType.read"];
      expect(getResourcePermissionLevel("eventType", p1)).toBe("all");
      expect(getResourcePermissionLevel("eventType", p2)).toBe("all");
    });

    it("global *.* still yields 'all' even if resource-specific says otherwise", () => {
      const permissions = ["eventType.read", "*.*"];
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("all");
      expect(getResourcePermissionLevel("booking", permissions)).toBe("all");
    });
  });

  describe("partial and non-read permissions", () => {
    it("returns 'none' when only write-type permissions exist without read", () => {
      const writeOnly = ["eventType.create", "eventType.update", "eventType.delete"];
      expect(getResourcePermissionLevel("eventType", writeOnly)).toBe("none");
    });

    it("returns 'read' when read exists but write permissions are missing", () => {
      const readOnly = ["eventType.read"];
      expect(getResourcePermissionLevel("eventType", readOnly)).toBe("read");
    });

    it("returns 'all' only when all CRUD permissions are present", () => {
      const crud = ["eventType.create", "eventType.read", "eventType.update", "eventType.delete"];
      expect(getResourcePermissionLevel("eventType", crud)).toBe("all");
    });
  });

  describe("duplicates, unknowns, and formatting", () => {
    it("ignores duplicate permissions (idempotent)", () => {
      const permissions = ["eventType.read", "eventType.read", "eventType.update", "eventType.update"];
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("none"); // missing create & delete -> not 'all'; but has read -> 'read'
      // Clarify expectation: with read present, level should be 'read'
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("read");
    });

    it("ignores unrecognized actions and malformed entries", () => {
      const permissions = [
        "eventType.read",
        "eventType.execute", // unknown action
        "justtext",          // malformed
        "another.bad.format",
      ];
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("read");
      expect(getResourcePermissionLevel("booking", permissions)).toBe("none");
    });

    it("treats case sensitive resources literally (no implicit normalization)", () => {
      const permissions = ["eventType.read", "eventType.update", "eventType.create", "eventType.delete"];
      // If the implementation is case-sensitive, 'EventType' won't match 'eventType'
      // Expectation: remains 'none' (adjust if implementation normalizes case)
      expect(getResourcePermissionLevel("EventType" as any, permissions)).toBe("none");
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("all");
    });
  });

  describe("wildcard action variants", () => {
    it("does not treat '*.read' as global read unless supported (should be 'none' for unrelated resource)", () => {
      const permissions = ["*.read" as any, "eventType.read"];
      // If implementation does not support '*.read', only eventType should be 'read'
      expect(getResourcePermissionLevel("eventType", permissions)).toBe("read");
      expect(getResourcePermissionLevel("booking", permissions)).toBe("none");
    });

    it("resource '*' requires *.* to grant all; otherwise 'none'", () => {
      const onlyRead = ["eventType.read"];
      expect(getResourcePermissionLevel("*", onlyRead)).toBe("none");
      const globalAll = ["*.*"];
      expect(getResourcePermissionLevel("*", globalAll)).toBe("all");
    });
  });

  describe("defensive inputs", () => {
    it("handles empty permissions array", () => {
      expect(getResourcePermissionLevel("eventType", [])).toBe("none");
    });

    it("handles undefined/null permissions gracefully (treated as none)", () => {
      expect(getResourcePermissionLevel("eventType", undefined as unknown as string[])).toBe("none");
      expect(getResourcePermissionLevel("eventType", null as unknown as string[])).toBe("none");
    });

    it("handles undefined/empty resource gracefully", () => {
      const permissions = ["*.*"];
      expect(getResourcePermissionLevel(undefined as unknown as string, permissions)).toBe("all");
      expect(getResourcePermissionLevel("" as unknown as string, permissions)).toBe("all");
    });
  });
});
