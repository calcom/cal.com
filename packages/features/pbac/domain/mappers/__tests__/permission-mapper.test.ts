import { describe, expect, it } from "vitest";
import type { Permission } from "../../models/Permission";
import type { PermissionString } from "../../types/permission-registry";
import { CrudAction, Resource } from "../../types/permission-registry";
import { PermissionMapper } from "../PermissionMapper";

describe("PermissionMapper", () => {
  describe("toDomain", () => {
    it("should map database permissions to domain model", () => {
      const dbPermissions = [
        {
          teamId: 1,
          role: {
            id: "role1",
            permissions: [
              { resource: "eventType", action: "create" },
              { resource: "team", action: "invite" },
            ],
          },
        },
        {
          teamId: 2,
          role: {
            id: "role2",
            permissions: [
              { resource: "organization", action: "manageBilling" },
              { resource: "booking", action: "read" },
            ],
          },
        },
      ];

      const result = PermissionMapper.toDomain(dbPermissions);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        teamId: 1,
        roleId: "role1",
        permissions: [
          { resource: "eventType", action: "create" },
          { resource: "team", action: "invite" },
        ],
      });
      expect(result[1]).toMatchObject({
        teamId: 2,
        roleId: "role2",
        permissions: [
          { resource: "organization", action: "manageBilling" },
          { resource: "booking", action: "read" },
        ],
      });
    });

    it("should filter out invalid permissions", () => {
      const dbPermissions = [
        {
          teamId: 1,
          role: {
            id: "role1",
            permissions: [
              { resource: null, action: "create" },
              { resource: "team", action: null },
              { resource: "eventType", action: "create" },
            ],
          },
        },
      ];

      const result = PermissionMapper.toDomain(dbPermissions);

      expect(result).toHaveLength(1);
      expect(result[0].permissions).toHaveLength(1);
      expect(result[0].permissions[0]).toMatchObject({
        resource: "eventType",
        action: "create",
      });
    });

    it("should filter out entries without required fields", () => {
      const dbPermissions = [
        {
          teamId: 1,
          role: null,
        },
        {
          teamId: 2,
          role: {
            id: null,
            permissions: [],
          },
        },
        {
          teamId: 3,
          role: {
            id: "role3",
            permissions: [{ resource: "eventType", action: "create" }],
          },
        },
      ];

      const result = PermissionMapper.toDomain(dbPermissions);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        teamId: 3,
        roleId: "role3",
      });
    });
  });

  describe("toPermissionString", () => {
    it("should convert a permission object to string format", () => {
      const permission: Permission = {
        resource: Resource.EventType,
        action: CrudAction.Create,
      };

      const result = PermissionMapper.toPermissionString(permission);
      expect(result).toBe("eventType.create");
    });
  });

  describe("fromPermissionString", () => {
    it("should convert a permission string to object format", () => {
      const permissionString = "eventType.create" as PermissionString;

      const result = PermissionMapper.fromPermissionString(permissionString);
      expect(result).toMatchObject({
        resource: Resource.EventType,
        action: CrudAction.Create,
      });
    });

    it("should throw error for invalid permission string format", () => {
      const invalidPermissionString = "invalid-format" as PermissionString;

      expect(() => PermissionMapper.fromPermissionString(invalidPermissionString)).toThrow();
    });
  });
});
