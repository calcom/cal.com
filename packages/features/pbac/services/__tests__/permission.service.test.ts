import { describe, it, expect, beforeEach } from "vitest";

import type { PermissionString } from "../../domain/types/permission-registry";
import { CrudAction, PERMISSION_REGISTRY, Resource } from "../../domain/types/permission-registry";
import { PermissionService } from "../permission.service";

describe("PermissionService", () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
  });

  describe("validatePermission", () => {
    it("should validate a valid permission", () => {
      const result = service.validatePermission("eventType.create" as PermissionString);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should reject an invalid permission", () => {
      const result = service.validatePermission("invalid.action" as PermissionString);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid permission: invalid.action");
    });

    it("should reject a malformed permission", () => {
      const result = service.validatePermission("invalid-format" as PermissionString);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid permission format: invalid-format");
    });
  });

  describe("validatePermissions", () => {
    it("should validate multiple valid permissions", () => {
      const permissions = [
        "eventType.create",
        "team.invite",
        "organization.manageBilling",
      ] as PermissionString[];
      const result = service.validatePermissions(permissions);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should reject if any permission is invalid", () => {
      const permissions = [
        "eventType.create",
        "invalid.action",
        "organization.manageBilling",
      ] as PermissionString[];
      const result = service.validatePermissions(permissions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid permission: invalid.action");
    });

    it("should reject if any permission is malformed", () => {
      const permissions = ["eventType.create", "invalid-format", "team.invite"] as PermissionString[];
      const result = service.validatePermissions(permissions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid permission format: invalid-format");
    });
  });

  describe("getAllPermissions", () => {
    it("should return all permissions from registry as domain objects", () => {
      const permissions = service.getAllPermissions();
      const expectedCount = Object.values(PERMISSION_REGISTRY).reduce(
        (count, resource) => count + Object.keys(resource).filter((key) => key !== "_resource").length,
        0
      );
      expect(permissions).toHaveLength(expectedCount);
      expect(permissions[0]).toHaveProperty("resource");
      expect(permissions[0]).toHaveProperty("action");
      expect(permissions[0]).toHaveProperty("description");
      expect(permissions[0]).toHaveProperty("category");
    });
  });

  describe("getPermissionsByCategory", () => {
    it("should return permissions for a specific category as domain objects", () => {
      const eventPermissions = service.getPermissionsByCategory("event");
      expect(eventPermissions.every((p) => p.category === "event")).toBe(true);
      expect(eventPermissions[0]).toMatchObject({
        resource: expect.any(String),
        action: expect.any(String),
        category: "event",
      });
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
          Object.entries(resource)
            .filter(([key]) => key !== "_resource")
            .map(([_, p]) => p?.category)
            .filter(Boolean)
        )
      );
      expect(categories).toHaveLength(uniqueCategories.size);
      expect(categories.every((category) => typeof category === "string")).toBe(true);
    });
  });

  describe("getPermissionsByResource", () => {
    it("should return permissions for a specific resource as domain objects", () => {
      const eventTypePermissions = service.getPermissionsByResource(Resource.EventType);
      expect(eventTypePermissions.every((p) => p.resource === Resource.EventType)).toBe(true);
      expect(eventTypePermissions[0]).toMatchObject({
        resource: Resource.EventType,
        action: expect.any(String),
      });
    });

    it("should return empty array for non-existent resource", () => {
      const permissions = service.getPermissionsByResource("nonexistent" as Resource);
      expect(permissions).toHaveLength(0);
    });
  });

  describe("getPermissionsByAction", () => {
    it("should return permissions for a specific action as domain objects", () => {
      const createPermissions = service.getPermissionsByAction(CrudAction.Create);
      expect(createPermissions.every((p) => p.action === CrudAction.Create)).toBe(true);
      expect(createPermissions[0]).toMatchObject({
        action: CrudAction.Create,
        resource: expect.any(String),
      });
    });

    it("should return empty array for non-existent action", () => {
      const permissions = service.getPermissionsByAction("nonexistent" as CrudAction);
      expect(permissions).toHaveLength(0);
    });
  });
});
