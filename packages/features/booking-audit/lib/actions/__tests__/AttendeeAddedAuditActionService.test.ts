import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract, createMockEnrichmentDataStore } from "./dataRequirementsContractVerification";
import { AttendeeAddedAuditActionService } from "../AttendeeAddedAuditActionService";

describe("AttendeeAddedAuditActionService", () => {
  let service: AttendeeAddedAuditActionService;

  beforeEach(() => {
    service = new AttendeeAddedAuditActionService();
  });

  describe("V2 schema (PII-free)", () => {
    const v2Fields = {
      addedAttendeeIds: [10, 20],
    };

    it("should produce versioned data with version 2", () => {
      const result = service.getVersionedData(v2Fields);
      expect(result.version).toBe(2);
      expect(result.fields).toEqual(v2Fields);
    });

    it("should parse stored V2 data", () => {
      const storedData = { version: 2, fields: v2Fields };
      const parsed = service.parseStored(storedData);
      expect(parsed.version).toBe(2);
    });

    it("should declare attendeeIds in data requirements for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.attendeeIds).toEqual([10, 20]);
    });

    it("should return addedAttendeeIds in display JSON for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toEqual({ addedAttendeeIds: [10, 20] });
    });

    it("should return enriched attendee names in display fields for V2", async () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore(
        {
          attendees: [
            { id: 10, name: "Alice", email: "alice@example.com" },
            { id: 20, name: "Bob", email: "bob@example.com" },
          ],
        },
        requirements
      );
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([
        { labelKey: "booking_audit_action.added_attendees", fieldValue: { type: "rawValues", values: ["Alice", "Bob"] } },
      ]);
    });

    it("should fulfill data requirements contract for V2", async () => {
      const storedData = { version: 2, fields: v2Fields };
      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });
  });

  describe("V1 schema (backward compatibility)", () => {
    const v1Fields = {
      added: ["new-attendee@example.com"],
    };

    it("should parse stored V1 data", () => {
      const storedData = { version: 1, fields: v1Fields };
      const parsed = service.parseStored(storedData);
      expect(parsed.version).toBe(1);
    });

    it("should not declare attendeeIds in data requirements for V1", () => {
      const storedData = { version: 1, fields: v1Fields };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.attendeeIds).toBeUndefined();
    });

    it("should return original V1 data with addedAttendees in display JSON", () => {
      const storedData = { version: 1, fields: v1Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toEqual({ addedAttendees: ["new-attendee@example.com"] });
    });

    it("should return empty display fields for V1", async () => {
      const storedData = { version: 1, fields: v1Fields };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore({}, requirements);
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([]);
    });

    it("should not access any dbStore methods for V1", async () => {
      const storedData = { version: 1, fields: v1Fields };
      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
      expect(accessedData.attendeeIds.size).toBe(0);
    });
  });
});
