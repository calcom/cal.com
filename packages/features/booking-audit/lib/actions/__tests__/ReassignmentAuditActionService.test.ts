import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
        organizerUuid: { old: "organizer-old", new: "organizer-new" },
        reassignmentReason: "Host unavailable",
        reassignmentType: "manual" as const,
      };

      const result = service.getVersionedData(fields);

      expect(result).toEqual({
        version: 1,
        fields,
      });
    });

    it("should handle roundRobin reassignment type with attendee update", () => {
      const fields = {
        organizerUuid: { old: "fixed-host", new: "fixed-host" },
        hostAttendeeUpdated: {
          id: 123,
          withUserUuid: { old: "old-rr-host", new: "new-rr-host" },
        },
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
        organizerUuid: { old: "organizer-old", new: "organizer-new" },
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
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const result = service.parseStored(storedData);

      expect(result.version).toBe(1);
      expect(result.fields).toEqual({
        organizerUuid: { old: "organizer-old", new: "organizer-new" },
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
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
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
        organizerUuid: { old: "organizer-old", new: "organizer-new" },
        reassignmentReason: "Host unavailable",
        reassignmentType: "manual" as const,
      };

      const result = service.migrateToLatest(fields);

      expect(result.isMigrated).toBe(false);
      expect(result.latestData).toEqual(fields);
    });
  });

  describe("getDisplayTitle", () => {
    it("should return translation key with host name for manual reassignment (organizer changed)", async () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue({ uuid: "organizer-new", name: "New Host" });

      const result = await service.getDisplayTitle({ storedData });

      expect(mockUserRepository.findByUuid).toHaveBeenCalledWith({ uuid: "organizer-new" });
      expect(result).toEqual({
        key: "booking_audit_action.booking_reassigned_to_host",
        params: { host: "New Host" },
      });
    });

    it("should return host name when attendee was updated (fixed-host scenario)", async () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "fixed-host", new: "fixed-host" },
          hostAttendeeUpdated: {
            id: 123,
            withUserUuid: { old: "old-rr-host", new: "new-rr-host" },
          },
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue({ uuid: "new-rr-host", name: "New RR Host" });

      const result = await service.getDisplayTitle({ storedData });

      expect(mockUserRepository.findByUuid).toHaveBeenCalledWith({ uuid: "new-rr-host" });
      expect(result).toEqual({
        key: "booking_audit_action.booking_reassigned_to_host",
        params: { host: "New RR Host" },
      });
    });

    it("should return 'Unknown' when user not found", async () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
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
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: null,
          reassignmentType: "manual",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue({ uuid: "organizer-new", name: null });

      const result = await service.getDisplayTitle({ storedData });

      expect(result).toEqual({
        key: "booking_audit_action.booking_reassigned_to_host",
        params: { host: "Unknown" },
      });
    });
  });

  describe("getDisplayJson", () => {
    it("should return display data for manual reassignment (organizer changed)", () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const result = service.getDisplayJson({ storedData, userTimeZone: "UTC" });

      expect(result).toEqual({
        newOrganizerUuid: "organizer-new",
        previousOrganizerUuid: "organizer-old",
        reassignmentReason: "Host unavailable",
      });
    });

    it("should return display data for fixed-host reassignment (attendee updated)", () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "fixed-host-uuid", new: "fixed-host-uuid" },
          hostAttendeeUpdated: {
            id: 123,
            withUserUuid: { old: "old-rr-host-uuid", new: "new-rr-host-uuid" },
          },
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      const result = service.getDisplayJson({ storedData, userTimeZone: "UTC" });

      expect(result).toEqual({
        newOrganizerUuid: "fixed-host-uuid",
        previousOrganizerUuid: "fixed-host-uuid",
        hostAttendeeIdUpdated: 123,
        hostAttendeeUserUuidNew: "new-rr-host-uuid",
        hostAttendeeUserUuidOld: "old-rr-host-uuid",
        reassignmentReason: null,
      });
    });
  });

  describe("getDisplayFields", () => {
    it("should return assignment type field for manual reassignment", async () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue({ uuid: "organizer-old", name: "Previous Host" });

      const result = await service.getDisplayFields({ storedData });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.assignment_type",
          valueKey: "booking_audit_action.assignment_type_manual",
        },
        {
          labelKey: "booking_audit_action.previous_assignee",
          valueKey: "Previous Host",
        },
      ]);
    });

    it("should return assignment type field for round robin reassignment", async () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: null,
          reassignmentType: "roundRobin",
        },
      };

      mockUserRepository.findByUuid.mockResolvedValue({ uuid: "organizer-old", name: "Previous Host" });

      const result = await service.getDisplayFields({ storedData });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.assignment_type",
          valueKey: "booking_audit_action.assignment_type_round_robin",
        },
        {
          labelKey: "booking_audit_action.previous_assignee",
          valueKey: "Previous Host",
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
