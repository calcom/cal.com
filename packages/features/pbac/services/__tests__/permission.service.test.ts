import { describe, it, expect, beforeEach } from "vitest";

import type { PermissionString } from "../../types/permission-registry";
import { CrudAction, Resource } from "../../types/permission-registry";
import { PERMISSION_REGISTRY } from "../../types/permission-registry";
import { PermissionService } from "../permission.service";

describe("PermissionService", () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
  });

  describe("validatePermission", () => {
    it("should validate a valid permission", () => {
      expect(service.validatePermission("eventType.create" as PermissionString)).toBe(true);
      expect(service.validatePermission("team.invite" as PermissionString)).toBe(true);
    });

    it("should reject an invalid permission", () => {
      expect(service.validatePermission("invalid.action" as PermissionString)).toBe(false);
      expect(service.validatePermission("eventType.invalid" as PermissionString)).toBe(false);
    });
  });

  describe("validatePermissions", () => {
    it("should validate multiple valid permissions", () => {
      const permissions: PermissionString[] = [
        "eventType.create",
        "team.invite",
        "organization.manageBilling",
      ];
      expect(service.validatePermissions(permissions)).toBe(true);
    });

    it("should reject if any permission is invalid", () => {
      const permissions = [
        "eventType.create",
        "invalid.action",
        "organization.billing",
      ] as PermissionString[];
      expect(service.validatePermissions(permissions)).toBe(false);
    });
  });

  describe("getAllPermissions", () => {
    it("should return all permissions from registry", () => {
      const permissions = service.getAllPermissions();
      const expectedCount = Object.values(PERMISSION_REGISTRY).reduce(
        (count, resource) => count + Object.keys(resource).length,
        0
      );
      expect(permissions).toHaveLength(expectedCount);
    });
  });

  describe("getPermissionsByCategory", () => {
    it("should return permissions for a specific category", () => {
      const eventPermissions = service.getPermissionsByCategory("event");
      expect(eventPermissions.every((p) => p.category === "event")).toBe(true);
    });

    it("should return empty array for non-existent category", () => {
      const permissions = service.getPermissionsByCategory("nonexistent");
      expect(permissions).toHaveLength(0);
    });
  });

  describe("getPermissionCategories", () => {
    it("should return all unique categories", () => {
      const categories = service.getPermissionCategories();
      const uniqueCategories = new Set(
        Object.values(PERMISSION_REGISTRY).flatMap((resource) =>
          Object.values(resource).map((p) => p.category)
        )
      );
      expect(categories).toHaveLength(uniqueCategories.size);
      expect(categories.every((category) => typeof category === "string")).toBe(true);
    });
  });

  describe("getPermissionsByResource", () => {
    it("should return permissions for a specific resource", () => {
      const eventTypePermissions = service.getPermissionsByResource(Resource.EventType);
      expect(eventTypePermissions.every((p) => p.resource === Resource.EventType)).toBe(true);
    });

    it("should return empty array for non-existent resource", () => {
      const permissions = service.getPermissionsByResource("nonexistent" as Resource);
      expect(permissions).toHaveLength(0);
    });
  });

  describe("getPermissionsByAction", () => {
    it("should return permissions for a specific action", () => {
      const createPermissions = service.getPermissionsByAction(CrudAction.Create);
      expect(createPermissions.every((p) => p.action === CrudAction.Create)).toBe(true);
    });

    it("should return empty array for non-existent action", () => {
      const permissions = service.getPermissionsByAction("nonexistent" as CrudAction);
      expect(permissions).toHaveLength(0);
    });
  });
});
