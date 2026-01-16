import { describe, it, expect, beforeEach, vi } from "vitest";

import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import { ReassignmentAuditActionService } from "../ReassignmentAuditActionService";

describe("ReassignmentAuditActionService", () => {
  let service: ReassignmentAuditActionService;
  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
    };
    service = new ReassignmentAuditActionService(mockUserRepository as unknown as UserRepository);
  });

  describe("getVersionedData", () => {
    it("should wrap fields with version number", () => {
      const fields = {
        assignedToId: { old: 1, new: 2 },
        assignedById: 3,
        reassignmentReason: "Host unavailable",
        reassignmentType: "manual" as const,
        userPrimaryEmail: { old: "old@example.com", new: "new@example.com" },
        hostName: { old: "Old Host", new: "New Host" },
      };

      const result = service.getVersionedData(fields);

      expect(result).toEqual({
        version: 1,
        fields,
      });
    });

    it("should handle roundRobin reassignment type", () => {
      const fields = {
        assignedToId: { old: 1, new: 2 },
        assignedById: 3,
        reassignmentReason: null,
        reassignmentType: "roundRobin" as const,
        userPrimaryEmail: { old: "old@example.com", new: "new@example.com" },
        hostName: { old: "Old Host", new: "New Host" },
      };

      const result = service.getVersionedData(fields);

      expect(result).toEqual({
        version: 1,
        fields,
      });
    });

    it("should handle optional fields being undefined", () => {
      const fields = {
        assignedToId: { old: 1, new: 2 },
        assignedById: 3,
        reassignmentReason: null,
        reassignmentType: "manual" as const,
      };

      const result = service.getVersionedData(fields);

      expect(result).toEqual({
        version: 1,
        fields,
      });
    });
  });

  describe("parseStored", () => {
    it("should parse valid stored data", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
          userPrimaryEmail: { old: "old@example.com", new: "new@example.com" },
          hostName: { old: "Old Host", new: "New Host" },
        },
      };

      const result = service.parseStored(storedData);

      expect(result.version).toBe(1);
      expect(result.fields.assignedToId).toEqual({ old: 1, new: 2 });
      expect(result.fields.assignedById).toBe(3);
      expect(result.fields.reassignmentReason).toBe("Host unavailable");
      expect(result.fields.reassignmentType).toBe("manual");
    });

    it("should throw error for invalid data", () => {
      const invalidData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          // Missing required fields
        },
      };

      expect(() => service.parseStored(invalidData)).toThrow();
    });
  });

  describe("getVersion", () => {
    it("should return version from stored data", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: null,
          reassignmentType: "manual",
        },
      };

      const result = service.getVersion(storedData);

      expect(result).toBe(1);
    });
  });

  describe("migrateToLatest", () => {
    it("should return data as-is for V1 (no migration needed)", () => {
      const fields = {
        assignedToId: { old: 1, new: 2 },
        assignedById: 3,
        reassignmentReason: "Host unavailable",
        reassignmentType: "manual" as const,
      };

      const result = service.migrateToLatest(fields);

      expect(result.isMigrated).toBe(false);
      expect(result.latestData).toEqual(fields);
    });
  });

  describe("getDisplayTitle", () => {
    it("should return translation key with host name for manual reassignment", async () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      mockUserRepository.findById.mockResolvedValue({ id: 2, name: "New Host" });

      const result = await service.getDisplayTitle({ storedData });

      expect(mockUserRepository.findById).toHaveBeenCalledWith({ id: 2 });
      expect(result).toEqual({
        key: "booking_audit_action.booking_reassigned_to_host",
        params: { host: "New Host" },
      });
    });

    it("should return 'Unknown' when user not found", async () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.getDisplayTitle({ storedData });

      expect(result).toEqual({
        key: "booking_audit_action.booking_reassigned_to_host",
        params: { host: "Unknown" },
      });
    });

    it("should return 'Unknown' when user has no name", async () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: null,
          reassignmentType: "manual",
        },
      };

      mockUserRepository.findById.mockResolvedValue({ id: 2, name: null });

      const result = await service.getDisplayTitle({ storedData });

      expect(result).toEqual({
        key: "booking_audit_action.booking_reassigned_to_host",
        params: { host: "Unknown" },
      });
    });
  });

  describe("getDisplayJson", () => {
    it("should return display data for manual reassignment", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const result = service.getDisplayJson({ storedData, userTimeZone: "UTC" });

      expect(result).toEqual({
        newAssignedToId: 2,
        reassignmentReason: "Host unavailable",
      });
    });

    it("should return null reassignmentReason when not provided", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      const result = service.getDisplayJson({ storedData, userTimeZone: "UTC" });

      expect(result).toEqual({
        newAssignedToId: 2,
        reassignmentReason: null,
      });
    });
  });

  describe("getDisplayFields", () => {
    it("should return assignment type field for manual reassignment", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const result = service.getDisplayFields(storedData);

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.assignment_type",
          valueKey: "booking_audit_action.assignment_type_manual",
        },
      ]);
    });

    it("should return assignment type field for round robin reassignment", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToId: { old: 1, new: 2 },
          assignedById: 3,
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      const result = service.getDisplayFields(storedData);

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.assignment_type",
          valueKey: "booking_audit_action.assignment_type_round_robin",
        },
      ]);
    });
  });

  describe("TYPE constant", () => {
    it("should have correct type value", () => {
      expect(ReassignmentAuditActionService.TYPE).toBe("REASSIGNMENT");
    });
  });
});
