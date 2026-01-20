import { describe, it, expect, beforeEach, vi } from "vitest";

import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import { ReassignmentAuditActionService } from "../ReassignmentAuditActionService";

describe("ReassignmentAuditActionService", () => {
  let service: ReassignmentAuditActionService;
  let mockUserRepository: {
    findByUuid: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUserRepository = {
      findByUuid: vi.fn(),
    };
    service = new ReassignmentAuditActionService(mockUserRepository as unknown as UserRepository);
  });

  describe("getVersionedData", () => {
    it("should wrap fields with version number", () => {
      const fields = {
        assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
        reassignmentReason: "Host unavailable",
        reassignmentType: "manual" as const,
      };

      const result = service.getVersionedData(fields);

      expect(result).toEqual({
        version: 1,
        fields,
      });
    });

    it("should handle roundRobin reassignment type", () => {
      const fields = {
        assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
        reassignmentReason: null,
        reassignmentType: "roundRobin" as const,
      };

      const result = service.getVersionedData(fields);

      expect(result).toEqual({
        version: 1,
        fields,
      });
    });

    it("should handle null reassignment reason", () => {
      const fields = {
        assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
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
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const result = service.parseStored(storedData);

      expect(result.version).toBe(1);
      expect(result.fields).toEqual({
        assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
        reassignmentReason: "Host unavailable",
        reassignmentType: "manual",
      });
    });

    it("should throw error for invalid data", () => {
      const invalidData = {
        version: 1,
        fields: {
          reassignmentReason: "Host unavailable",
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
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
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
        assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
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
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue({ uuid: "new-uuid-456", name: "New Host" });

      const result = await service.getDisplayTitle({ storedData });

      expect(mockUserRepository.findByUuid).toHaveBeenCalledWith({ uuid: "new-uuid-456" });
      expect(result).toEqual({
        key: "booking_audit_action.booking_reassigned_to_host",
        params: { host: "New Host" },
      });
    });

    it("should return 'Unknown' when user not found", async () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue(null);

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
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
          reassignmentReason: null,
          reassignmentType: "manual",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue({ uuid: "new-uuid-456", name: null });

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
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const result = service.getDisplayJson({ storedData, userTimeZone: "UTC" });

      expect(result).toEqual({
        newAssignedToUuid: "new-uuid-456",
        reassignmentReason: "Host unavailable",
      });
    });

    it("should return null reassignmentReason when not provided", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      const result = service.getDisplayJson({ storedData, userTimeZone: "UTC" });

      expect(result).toEqual({
        newAssignedToUuid: "new-uuid-456",
        reassignmentReason: null,
      });
    });
  });

  describe("getDisplayFields", () => {
    it("should return assignment type field for manual reassignment", () => {
      const storedData = {
        version: 1,
        fields: {
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
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
          assignedToUuid: { old: "old-uuid-123", new: "new-uuid-456" },
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
