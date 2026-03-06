import { beforeEach, describe, expect, it } from "vitest";
import { NoShowUpdatedAuditActionService } from "../NoShowUpdatedAuditActionService";
import {
  createMockEnrichmentDataStore,
  verifyDataRequirementsContract,
} from "./dataRequirementsContractVerification";

describe("NoShowUpdatedAuditActionService", () => {
  let service: NoShowUpdatedAuditActionService;

  beforeEach(() => {
    service = new NoShowUpdatedAuditActionService();
  });

  describe("V2 schema (PII-free)", () => {
    it("should throw error when neither host nor attendees provided", () => {
      const fields = {};
      expect(() => service.getVersionedData(fields)).toThrow(
        "At least one of host or attendeesNoShow must be provided"
      );
    });

    it("should produce versioned data with version 2 (host only)", () => {
      const fields = { host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } } };
      const result = service.getVersionedData(fields);
      expect(result.version).toBe(2);
    });

    it("should produce versioned data with version 2 (attendees only)", () => {
      const fields = {
        attendeesNoShow: [{ attendeeId: 10, noShow: { old: false, new: true } }],
      };
      const result = service.getVersionedData(fields);
      expect(result.version).toBe(2);
    });

    it("should parse stored V2 data", () => {
      const storedData = {
        version: 2,
        fields: { host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } } },
      };
      const parsed = service.parseStored(storedData);
      expect(parsed.version).toBe(2);
    });

    it("should declare userUuids and attendeeIds in data requirements for V2", () => {
      const storedData = {
        version: 2,
        fields: {
          host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } },
          attendeesNoShow: [
            { attendeeId: 10, noShow: { old: false, new: true } },
            { attendeeId: 20, noShow: { old: null, new: true } },
          ],
        },
      };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.userUuids).toEqual(["host-uuid-1"]);
      expect(requirements.attendeeIds).toEqual([10, 20]);
    });

    it("should return attendeeId in display JSON for V2", () => {
      const storedData = {
        version: 2,
        fields: {
          attendeesNoShow: [{ attendeeId: 10, noShow: { old: false, new: true } }],
        },
      };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson.attendeesNoShow).toEqual([{ attendeeId: 10, noShow: { old: false, new: true } }]);
    });

    it("should return both host and attendees in display JSON for V2", () => {
      const storedData = {
        version: 2,
        fields: {
          host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } },
          attendeesNoShow: [
            { attendeeId: 10, noShow: { old: false, new: true } },
            { attendeeId: 20, noShow: { old: null, new: false } },
          ],
        },
      };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson.hostNoShow).toBe(true);
      expect(displayJson.previousHostNoShow).toBe(false);
      expect(displayJson.attendeesNoShow).toEqual([
        { attendeeId: 10, noShow: { old: false, new: true } },
        { attendeeId: 20, noShow: { old: null, new: false } },
      ]);
    });

    it("should return enriched attendee and host in display fields for V2", async () => {
      const storedData = {
        version: 2,
        fields: {
          host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } },
          attendeesNoShow: [{ attendeeId: 10, noShow: { old: false, new: true } }],
        },
      };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            { id: 1, uuid: "host-uuid-1", name: "Host User", email: "host@example.com", avatarUrl: null },
          ],
          attendees: [{ id: 10, name: "Attendee One", email: "att1@example.com" }],
        },
        requirements
      );
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([
        { labelKey: "booking_audit_action.attendees", fieldValue: { type: "rawValues", values: ["Attendee One: Yes"] } },
        { labelKey: "booking_audit_action.host", fieldValue: { type: "rawValue", value: "Host User: Yes" } },
      ]);
    });

    it("should fulfill data requirements contract for V2 (host + attendees)", async () => {
      const storedData = {
        version: 2,
        fields: {
          host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } },
          attendeesNoShow: [{ attendeeId: 10, noShow: { old: false, new: true } }],
        },
      };
      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });

    it("should fulfill data requirements contract for V2 (attendees only)", async () => {
      const storedData = {
        version: 2,
        fields: {
          attendeesNoShow: [{ attendeeId: 10, noShow: { old: false, new: true } }],
        },
      };
      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });
  });

  describe("V1 schema (backward compatibility)", () => {
    it("should throw error when neither host nor attendees provided", () => {
      const storedData = {
        version: 1,
        fields: {},
      };
      expect(() => service.parseStored(storedData)).toThrow(
        "At least one of host or attendeesNoShow must be provided"
      );
    });

    it("should parse stored V1 data", () => {
      const storedData = {
        version: 1,
        fields: { host: { userUuid: "host-uuid-789", noShow: { old: false, new: true } } },
      };
      const parsed = service.parseStored(storedData);
      expect(parsed.version).toBe(1);
    });

    it("should declare only userUuids (no attendeeIds) in data requirements for V1", () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "host-uuid-789", noShow: { old: false, new: true } },
          attendeesNoShow: [{ attendeeEmail: "att@example.com", noShow: { old: false, new: true } }],
        },
      };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.userUuids).toEqual(["host-uuid-789"]);
      expect(requirements.attendeeIds).toBeUndefined();
    });

    it("should return original V1 data with attendeeEmail in display JSON", () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [{ attendeeEmail: "att@example.com", noShow: { old: false, new: true } }],
        },
      };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson.attendeesNoShow).toEqual([
        { attendeeEmail: "att@example.com", noShow: { old: false, new: true } },
      ]);
    });

    it("should return both host and attendees in display JSON for V1", () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "host-uuid-789", noShow: { old: null, new: true } },
          attendeesNoShow: [
            { attendeeEmail: "alice@example.com", noShow: { old: false, new: true } },
            { attendeeEmail: "bob@example.com", noShow: { old: true, new: false } },
          ],
        },
      };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson.hostNoShow).toBe(true);
      expect(displayJson.previousHostNoShow).toBe(null);
      expect(displayJson.attendeesNoShow).toEqual([
        { attendeeEmail: "alice@example.com", noShow: { old: false, new: true } },
        { attendeeEmail: "bob@example.com", noShow: { old: true, new: false } },
      ]);
    });

    it("should fulfill data requirements contract for V1 (host only)", async () => {
      const storedData = {
        version: 1,
        fields: { host: { userUuid: "host-uuid-789", noShow: { old: false, new: true } } },
      };
      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(1);
    });

    it("should not access attendeeIds for V1", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [{ attendeeEmail: "att@example.com", noShow: { old: false, new: true } }],
        },
      };
      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
      expect(accessedData.attendeeIds.size).toBe(0);
    });

    it("should fulfill data requirements contract for V1 (host + attendees)", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "host-uuid-abc", noShow: { old: null, new: true } },
          attendeesNoShow: [{ attendeeEmail: "att@example.com", noShow: { old: false, new: true } }],
        },
      };
      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(1);
    });
  });

  describe("V1 getDisplayTitle", () => {
    it("should return host_no_show_updated key for host-only V1 data", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } },
        },
      };
      const title = await service.getDisplayTitle!({ storedData });
      expect(title).toEqual({ key: "booking_audit_action.host_no_show_updated" });
    });

    it("should return attendee_no_show_updated key for attendee-only V1 data", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [{ attendeeEmail: "att1@example.com", noShow: { old: false, new: true } }],
        },
      };
      const title = await service.getDisplayTitle!({ storedData });
      expect(title).toEqual({ key: "booking_audit_action.attendee_no_show_updated" });
    });

    it("should return no_show_updated key for host+attendee V1 data", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "host-uuid-1", noShow: { old: false, new: true } },
          attendeesNoShow: [{ attendeeEmail: "att1@example.com", noShow: { old: false, new: true } }],
        },
      };
      const title = await service.getDisplayTitle!({ storedData });
      expect(title).toEqual({ key: "booking_audit_action.no_show_updated" });
    });
  });

  describe("V1 getDisplayFields", () => {
    it("should display attendeeEmail directly for attendees-only V1 data", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [
            { attendeeEmail: "att1@example.com", noShow: { old: false, new: true } },
            { attendeeEmail: "att2@example.com", noShow: { old: null, new: false } },
          ],
        },
      };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore({ users: [], attendees: [] }, requirements);
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([
        { labelKey: "booking_audit_action.attendees", fieldValue: { type: "rawValues", values: ["att1@example.com: Yes", "att2@example.com: No"] } },
      ]);
    });

    it("should enrich host via dbStore for host-only V1 data", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "host-uuid-789", noShow: { old: null, new: true } },
        },
      };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            { id: 100, uuid: "host-uuid-789", name: "V1 Host", email: "v1host@example.com", avatarUrl: null },
          ],
          attendees: [],
        },
        requirements
      );
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([{ labelKey: "booking_audit_action.host", fieldValue: { type: "rawValue", value: "V1 Host: Yes" } }]);
    });

    it("should display both host (enriched) and attendees (raw email) for V1 data", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "host-uuid-xyz", noShow: { old: false, new: true } },
          attendeesNoShow: [
            { attendeeEmail: "alice@example.com", noShow: { old: false, new: true } },
            { attendeeEmail: "bob@example.com", noShow: { old: true, new: false } },
          ],
        },
      };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore(
        {
          users: [
            {
              id: 200,
              uuid: "host-uuid-xyz",
              name: "Combined Host",
              email: "host@example.com",
              avatarUrl: null,
            },
          ],
          attendees: [],
        },
        requirements
      );
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([
        { labelKey: "booking_audit_action.attendees", fieldValue: { type: "rawValues", values: ["alice@example.com: Yes", "bob@example.com: No"] } },
        { labelKey: "booking_audit_action.host", fieldValue: { type: "rawValue", value: "Combined Host: Yes" } },
      ]);
    });

    it("should handle missing host user in V1 gracefully", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: { userUuid: "missing-host-uuid", noShow: { old: false, new: true } },
        },
      };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore({ users: [], attendees: [] }, requirements);
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([{ labelKey: "booking_audit_action.host", fieldValue: { type: "rawValue", value: "Unknown: Yes" } }]);
    });
  });
});
