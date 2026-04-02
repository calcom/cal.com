import type { RolePermission } from "@calcom/prisma/client";
import { describe, expect, it } from "vitest";
import type { PermissionString } from "../../domain/types/permission-registry";
import { PermissionDiffService } from "../permission-diff.service";

describe("PermissionDiffService", () => {
  const service = new PermissionDiffService();

  describe("calculateDiff", () => {
    it("should calculate permissions to add and remove", () => {
      const existingPermissions = [
        { id: "1", roleId: "role1", resource: "booking", action: "create" },
        { id: "2", roleId: "role1", resource: "booking", action: "read" },
      ] as RolePermission[];

      const newPermissions = ["booking.read", "booking.update", "eventType.create"] as PermissionString[];

      const result = service.calculateDiff(newPermissions, existingPermissions);

      expect(result.toAdd).toEqual([
        { resource: "booking", action: "update" },
        { resource: "eventType", action: "create" },
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
      const newPermissions = ["booking.create", "booking.read"] as PermissionString[];

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

      const newPermissions = [
        "booking.create",
        "booking._resource",
        "eventType.create",
      ] as PermissionString[];

      const result = service.calculateDiff(newPermissions, existingPermissions);

      expect(result.toAdd).toEqual([{ resource: "eventType", action: "create" }]);
      expect(result.toRemove).toEqual([]);
    });

    it("should handle identical permissions with no changes needed", () => {
      const existingPermissions = [
        { id: "1", roleId: "role1", resource: "booking", action: "create" },
        { id: "2", roleId: "role1", resource: "booking", action: "read" },
      ] as RolePermission[];

      const newPermissions = ["booking.create", "booking.read"] as PermissionString[];

      const result = service.calculateDiff(newPermissions, existingPermissions);

      expect(result.toAdd).toEqual([]);
      expect(result.toRemove).toEqual([]);
    });
  });
});
