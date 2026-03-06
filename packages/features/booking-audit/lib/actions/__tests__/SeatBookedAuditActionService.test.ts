import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract, createMockEnrichmentDataStore } from "./dataRequirementsContractVerification";
import { SeatBookedAuditActionService } from "../SeatBookedAuditActionService";

describe("SeatBookedAuditActionService", () => {
  let service: SeatBookedAuditActionService;

  beforeEach(() => {
    service = new SeatBookedAuditActionService();
  });

  describe("V2 schema (PII-free)", () => {
    const v2Fields = {
      seatReferenceUid: "seat-123",
      attendeeId: 42,
      startTime: 1700000000000,
      endTime: 1700003600000,
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

    it("should declare attendeeId in data requirements for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.attendeeIds).toEqual([42]);
    });

    it("should return attendeeId in display JSON for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toHaveProperty("attendeeId", 42);
    });

    it("should return enriched attendee in display fields for V2", async () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore(
        { attendees: [{ id: 42, name: "John Doe", email: "john@example.com" }] },
        requirements
      );
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([
        { labelKey: "booking_audit_action.attendee", fieldValue: { type: "rawValue", value: "John Doe" } },
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
      seatReferenceUid: "seat-123",
      attendeeEmail: "attendee@example.com",
      attendeeName: "John Doe",
      startTime: 1700000000000,
      endTime: 1700003600000,
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

    it("should return original V1 data with attendeeEmail and attendeeName in display JSON", () => {
      const storedData = { version: 1, fields: v1Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toHaveProperty("attendeeEmail", "attendee@example.com");
      expect(displayJson).toHaveProperty("attendeeName", "John Doe");
      expect(displayJson).not.toHaveProperty("attendeeId");
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
