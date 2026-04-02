import { describe, expect, it } from "vitest";
import {
  CrudAction,
  CustomAction,
  isValidPermissionString,
  parsePermissionString,
  Resource,
} from "../permission-registry";

describe("Permission Registry Utilities", () => {
  describe("parsePermissionString", () => {
    it("should parse simple permission strings correctly", () => {
      const result = parsePermissionString("eventType.create");
      expect(result.resource).toBe("eventType");
      expect(result.action).toBe("create");
    });

    it("should parse nested resource permission strings correctly", () => {
      const result = parsePermissionString("organization.attributes.create");
      expect(result.resource).toBe("organization.attributes");
      expect(result.action).toBe("create");
    });

    it("should handle wildcard permissions", () => {
      const result = parsePermissionString("*.create");
      expect(result.resource).toBe("*");
      expect(result.action).toBe("create");
    });

    it("should handle custom actions", () => {
      const result = parsePermissionString("team.invite");
      expect(result.resource).toBe("team");
      expect(result.action).toBe("invite");
    });

    it("should handle deeply nested resources", () => {
      const result = parsePermissionString("organization.attributes.nested.action");
      expect(result.resource).toBe("organization.attributes.nested");
      expect(result.action).toBe("action");
    });
  });

  describe("isValidPermissionString", () => {
    it("should validate basic permission strings", () => {
      expect(isValidPermissionString("eventType.create")).toBe(true);
      expect(isValidPermissionString("team.read")).toBe(true);
      expect(isValidPermissionString("organization.update")).toBe(true);
    });

    it("should validate nested resource permissions", () => {
      expect(isValidPermissionString("organization.attributes.create")).toBe(true);
      expect(isValidPermissionString("organization.attributes.read")).toBe(true);
      expect(isValidPermissionString("organization.attributes.update")).toBe(true);
      expect(isValidPermissionString("organization.attributes.delete")).toBe(true);
    });

    it("should validate wildcard permissions", () => {
      expect(isValidPermissionString("*.create")).toBe(true);
      expect(isValidPermissionString("eventType.*")).toBe(true);
      expect(isValidPermissionString("*.*")).toBe(true);
    });

    it("should validate custom actions", () => {
      expect(isValidPermissionString("team.invite")).toBe(true);
      expect(isValidPermissionString("team.remove")).toBe(true);
      expect(isValidPermissionString("team.changeMemberRole")).toBe(true);
      expect(isValidPermissionString("organization.manageBilling")).toBe(true);
      expect(isValidPermissionString("booking.readTeamBookings")).toBe(true);
    });

    it("should validate _resource special case", () => {
      expect(isValidPermissionString("eventType._resource")).toBe(true);
      expect(isValidPermissionString("team._resource")).toBe(true);
      expect(isValidPermissionString("organization._resource")).toBe(true);
    });

    it("should reject invalid resource names", () => {
      expect(isValidPermissionString("invalidResource.create")).toBe(false);
      expect(isValidPermissionString("unknown.read")).toBe(false);
    });

    it("should reject invalid action names", () => {
      expect(isValidPermissionString("eventType.invalidAction")).toBe(false);
      expect(isValidPermissionString("team.unknownAction")).toBe(false);
    });

    it("should reject malformed permission strings", () => {
      expect(isValidPermissionString("invalidformat")).toBe(false);
      expect(isValidPermissionString("")).toBe(false);
      expect(isValidPermissionString("eventType.")).toBe(false);
      expect(isValidPermissionString(".create")).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(isValidPermissionString(null)).toBe(false);
      expect(isValidPermissionString(undefined)).toBe(false);
      expect(isValidPermissionString(123)).toBe(false);
      expect(isValidPermissionString({})).toBe(false);
      expect(isValidPermissionString([])).toBe(false);
    });

    it("should validate all CRUD actions", () => {
      Object.values(CrudAction).forEach((action) => {
        expect(isValidPermissionString(`eventType.${action}`)).toBe(true);
      });
    });

    it("should validate all custom actions for appropriate resources", () => {
      expect(isValidPermissionString(`team.${CustomAction.Invite}`)).toBe(true);
      expect(isValidPermissionString(`team.${CustomAction.Remove}`)).toBe(true);
      expect(isValidPermissionString(`team.${CustomAction.ChangeMemberRole}`)).toBe(true);
      expect(isValidPermissionString(`organization.${CustomAction.ManageBilling}`)).toBe(true);
      expect(isValidPermissionString(`booking.${CustomAction.ReadTeamBookings}`)).toBe(true);
    });

    it("should validate all resources", () => {
      Object.values(Resource).forEach((resource) => {
        expect(isValidPermissionString(`${resource}.read`)).toBe(true);
      });
    });
  });
});
