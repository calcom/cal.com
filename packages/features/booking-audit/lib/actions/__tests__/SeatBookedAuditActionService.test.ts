import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract, createMockEnrichmentDataStore } from "./contractVerification";
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
      expect(parsed.fields).toEqual(v2Fields);
    });

    it("should migrate V2 data as-is", () => {
      const result = service.migrateToLatest(v2Fields);
      expect(result.isMigrated).toBe(false);
      expect(result.latestData).toEqual(v2Fields);
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
      expect(displayJson).not.toHaveProperty("attendeeEmail");
      expect(displayJson).not.toHaveProperty("attendeeName");
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
        { labelKey: "booking_audit_action.attendee", value: "John Doe" },
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

    it("should produce versioned data with version 1 for V1 fields", () => {
      const result = service.getVersionedData(v1Fields);
      expect(result.version).toBe(1);
      expect(result.fields).toEqual(v1Fields);
    });

    it("should parse stored V1 data", () => {
      const storedData = { version: 1, fields: v1Fields };
      const parsed = service.parseStored(storedData);
      expect(parsed.version).toBe(1);
      expect(parsed.fields).toEqual(v1Fields);
    });

    it("should migrate V1 data as-is (cannot migrate without DB lookup)", () => {
      const result = service.migrateToLatest(v1Fields);
      expect(result.isMigrated).toBe(false);
      expect(result.latestData).toEqual(v1Fields);
    });

    it("should not declare attendeeIds in data requirements for V1", () => {
      const storedData = { version: 1, fields: v1Fields };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.attendeeIds).toBeUndefined();
    });

    it("should return null attendeeId in display JSON for V1", () => {
      const storedData = { version: 1, fields: v1Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toHaveProperty("attendeeId", null);
      expect(displayJson).not.toHaveProperty("attendeeEmail");
      expect(displayJson).not.toHaveProperty("attendeeName");
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

  describe("migrateToLatest error handling", () => {
    it("should throw for invalid data", () => {
      expect(() => service.migrateToLatest({ invalid: "data" })).toThrow();
    });
  });
});
