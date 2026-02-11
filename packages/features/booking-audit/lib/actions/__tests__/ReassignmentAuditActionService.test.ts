import { beforeEach, describe, expect, it } from "vitest";

import { ReassignmentAuditActionService } from "../ReassignmentAuditActionService";
import { createMockEnrichmentDataStore, verifyDataRequirementsContract } from "./contractVerification";

describe("ReassignmentAuditActionService", () => {
  let service: ReassignmentAuditActionService;

  beforeEach(() => {
    service = new ReassignmentAuditActionService();
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

  describe("getDataRequirements", () => {
    it("should return userUuids for organizer change", () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const result = service.getDataRequirements(storedData);

      expect(result.userUuids).toContain("organizer-new");
      expect(result.userUuids).toContain("organizer-old");
    });

    it("should return userUuids for attendee update", () => {
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

      const result = service.getDataRequirements(storedData);

      expect(result.userUuids).toContain("new-rr-host");
      expect(result.userUuids).toContain("old-rr-host");
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

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            { id: 1, uuid: "organizer-new", name: "New Host", email: "new@example.com", avatarUrl: null },
            { id: 2, uuid: "organizer-old", name: "Old Host", email: "old@example.com", avatarUrl: null },
          ],
        },
        { userUuids: ["organizer-new", "organizer-old"] }
      );

      const result = await service.getDisplayTitle({ storedData, dbStore, userTimeZone: "UTC" });

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

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            { id: 1, uuid: "new-rr-host", name: "New RR Host", email: "newrr@example.com", avatarUrl: null },
            { id: 2, uuid: "old-rr-host", name: "Old RR Host", email: "oldrr@example.com", avatarUrl: null },
          ],
        },
        { userUuids: ["new-rr-host", "old-rr-host"] }
      );

      const result = await service.getDisplayTitle({ storedData, dbStore, userTimeZone: "UTC" });

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

      const dbStore = createMockEnrichmentDataStore(
        { users: [] },
        { userUuids: ["organizer-new", "organizer-old"] }
      );

      const result = await service.getDisplayTitle({ storedData, dbStore, userTimeZone: "UTC" });

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

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            { id: 1, uuid: "organizer-new", name: null, email: "new@example.com", avatarUrl: null },
            { id: 2, uuid: "organizer-old", name: "Old Host", email: "old@example.com", avatarUrl: null },
          ],
        },
        { userUuids: ["organizer-new", "organizer-old"] }
      );

      const result = await service.getDisplayTitle({ storedData, dbStore, userTimeZone: "UTC" });

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

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            { id: 1, uuid: "organizer-old", name: "Previous Host", email: "old@example.com", avatarUrl: null },
            { id: 2, uuid: "organizer-new", name: "New Host", email: "new@example.com", avatarUrl: null },
          ],
        },
        { userUuids: ["organizer-old", "organizer-new"] }
      );

      const result = await service.getDisplayFields({ storedData, dbStore });

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

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            { id: 1, uuid: "organizer-old", name: "Previous Host", email: "old@example.com", avatarUrl: null },
            { id: 2, uuid: "organizer-new", name: "New Host", email: "new@example.com", avatarUrl: null },
          ],
        },
        { userUuids: ["organizer-old", "organizer-new"] }
      );

      const result = await service.getDisplayFields({ storedData, dbStore });

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

  describe("getDataRequirements contract verification", () => {
    it("should declare exactly the userUuids accessed for organizer change", async () => {
      const storedData = {
        version: 1,
        fields: {
          organizerUuid: { old: "organizer-old", new: "organizer-new" },
          reassignmentReason: "Host unavailable",
          reassignmentType: "manual",
        },
      };

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(2);
    });

    it("should declare exactly the userUuids accessed for attendee update", async () => {
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

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(2);
    });
  });
});
