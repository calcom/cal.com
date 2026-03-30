import { describe, it, expect } from "vitest";
import { isAssignmentForTheSamePool, isAssignmentForLockedAttribute, isAssignmentSame, doesSupportMultipleValues, buildSlugFromValue, hasOptions, canSetValueBeyondOptions } from "./assignValueToUserUtils";
import { AttributeType } from "@calcom/prisma/enums";

describe("assignValueToUserUtils", () => {
  describe("isAssignmentForTheSamePool", () => {
    it("returns false when dsync updater but assignment was updated by a Cal.com user", () => {
      const result = isAssignmentForTheSamePool({
        assignment: { createdByDSyncId: "d1", updatedByDSyncId: null, createdById: null, updatedById: 1 },
        updater: { dsyncId: "d1" },
      });
      expect(result).toBe(false);
    });

    it("returns true when dsync updater and assignment created by dsync", () => {
      const result = isAssignmentForTheSamePool({
        assignment: { createdByDSyncId: "d1", updatedByDSyncId: null, createdById: null, updatedById: null },
        updater: { dsyncId: "d1" },
      });
      expect(result).toBe(true);
    });

    it("returns true when non-dsync updater and assignment not created by dsync", () => {
      const result = isAssignmentForTheSamePool({
        assignment: { createdByDSyncId: null, updatedByDSyncId: null, createdById: 1, updatedById: null },
        updater: { userId: 1 },
      });
      expect(result).toBe(true);
    });
  });

  describe("isAssignmentForLockedAttribute", () => {
    it("returns true for locked attribute", () => {
      expect(isAssignmentForLockedAttribute({ assignment: { attributeOption: { attribute: { isLocked: true } } } })).toBe(true);
    });
  });

  describe("isAssignmentSame", () => {
    it("compares labels case-insensitively", () => {
      expect(isAssignmentSame({ existingAssignment: { attributeOption: { label: "Test" } }, newOption: { label: "test" } })).toBe(true);
    });
  });

  describe("doesSupportMultipleValues", () => {
    it("returns true for MULTI_SELECT", () => {
      expect(doesSupportMultipleValues({ attribute: { type: AttributeType.MULTI_SELECT } })).toBe(true);
    });
    it("returns false for SINGLE_SELECT", () => {
      expect(doesSupportMultipleValues({ attribute: { type: AttributeType.SINGLE_SELECT } })).toBe(false);
    });
  });

  describe("hasOptions", () => {
    it("returns true for MULTI_SELECT and SINGLE_SELECT", () => {
      expect(hasOptions({ attribute: { type: AttributeType.MULTI_SELECT } })).toBe(true);
      expect(hasOptions({ attribute: { type: AttributeType.SINGLE_SELECT } })).toBe(true);
    });
    it("returns false for TEXT", () => {
      expect(hasOptions({ attribute: { type: AttributeType.TEXT } })).toBe(false);
    });
  });

  describe("canSetValueBeyondOptions", () => {
    it("returns true for TEXT type", () => {
      expect(canSetValueBeyondOptions({ attribute: { type: AttributeType.TEXT } })).toBe(true);
    });
    it("returns false for SINGLE_SELECT type", () => {
      expect(canSetValueBeyondOptions({ attribute: { type: AttributeType.SINGLE_SELECT } })).toBe(false);
    });
  });

  describe("buildSlugFromValue", () => {
    it("slugifies the value", () => {
      const result = buildSlugFromValue({ value: "Hello World" });
      expect(result).toBe("hello-world");
    });
  });
});
