import { describe, expect, it } from "vitest";
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
