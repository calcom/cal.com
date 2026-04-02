import { BadRequestException } from "@nestjs/common";
import { OrgPermissionStringValidator } from "./org-permission-string.validator";

describe("PermissionStringValidator", () => {
  let validator: OrgPermissionStringValidator;

  beforeEach(() => {
    validator = new OrgPermissionStringValidator();
  });

  describe("validate", () => {
    it("should return true for valid permission strings", () => {
      const validPermissions = [
        "eventType.read",
        "eventType.create",
        "eventType.update",
        "eventType.delete",
        "booking.read",
        "booking.update",
        "role.create",
        "role.read",
        "role.update",
        "role.delete",
        "team.read",
        "team.invite",
        "organization.read",
        "organization.listMembers",
        // no wildcards here
      ];

      validPermissions.forEach((permission) => {
        expect(validator.validate(permission)).toBe(true);
      });
    });

    it("should throw for invalid permission strings", () => {
      const invalidPermissions = [
        "invalid", // no dot
        "invalid.", // no action
        ".invalid", // no resource
        "invalid.action", // invalid resource
        "eventType.invalid", // invalid action
        "event-type.read", // wrong format (should be eventType)
        "", // empty string
        "eventType..read", // double dot
        "eventType.read.extra", // too many parts
      ];

      invalidPermissions.forEach((permission) => {
        expect(() => validator.validate(permission)).toThrow(BadRequestException);
      });
    });

    it("should throw for wildcard permission strings", () => {
      const wildcardPermissions = ["*", "*.read", "eventType.*"];

      wildcardPermissions.forEach((permission) => {
        expect(() => validator.validate(permission)).toThrow(BadRequestException);
      });
    });
  });

  describe("defaultMessage", () => {
    it("should return appropriate error message", () => {
      const message = validator.defaultMessage();
      expect(message).toContain("Permission must be a valid permission string");
      expect(message).toContain("resource.action");
    });
  });
});
