import type { RolePermission } from "@prisma/client";
import { describe, it, expect } from "vitest";

import { PermissionDiffService } from "../permission-diff.service";

describe("PermissionDiffService", () => {
  const service = new PermissionDiffService();

  describe("calculateDiff", () => {
    it("should calculate permissions to add and remove", () => {
      const existingPermissions = [
        { id: "1", roleId: "role1", resource: "booking", action: "create" },
        { id: "2", roleId: "role1", resource: "booking", action: "read" },
      ] as RolePermission[];

      const newPermissions = ["booking.read", "booking.update", "event.create"];

      const result = service.calculateDiff(newPermissions, existingPermissions);

      expect(result.toAdd).toEqual([
        { resource: "booking", action: "update" },
        { resource: "event", action: "create" },
      ]);

      expect(result.toRemove).toEqual([{ id: "1", roleId: "role1", resource: "booking", action: "create" }]);
    });

    it("should handle empty new permissions", () => {
      const existingPermissions = [
        { id: "1", roleId: "role1", resource: "booking", action: "create" },
      ] as RolePermission[];

      const result = service.calculateDiff([], existingPermissions);

      expect(result.toAdd).toEqual([]);
      expect(result.toRemove).toEqual(existingPermissions);
    });

    it("should handle empty existing permissions", () => {
      const newPermissions = ["booking.create", "booking.read"];

      const result = service.calculateDiff(newPermissions, []);

      expect(result.toAdd).toEqual([
        { resource: "booking", action: "create" },
        { resource: "booking", action: "read" },
      ]);
      expect(result.toRemove).toEqual([]);
    });

    it("should filter out internal _resource permissions", () => {
      const existingPermissions = [
        { id: "1", roleId: "role1", resource: "booking", action: "create" },
      ] as RolePermission[];

      const newPermissions = ["booking.create", "booking._resource", "event.create"];

      const result = service.calculateDiff(newPermissions, existingPermissions);

      expect(result.toAdd).toEqual([{ resource: "event", action: "create" }]);
      expect(result.toRemove).toEqual([]);
    });

    it("should handle identical permissions with no changes needed", () => {
      const existingPermissions = [
        { id: "1", roleId: "role1", resource: "booking", action: "create" },
        { id: "2", roleId: "role1", resource: "booking", action: "read" },
      ] as RolePermission[];

      const newPermissions = ["booking.create", "booking.read"];

      const result = service.calculateDiff(newPermissions, existingPermissions);

      expect(result.toAdd).toEqual([]);
      expect(result.toRemove).toEqual([]);
    });
  });
});
