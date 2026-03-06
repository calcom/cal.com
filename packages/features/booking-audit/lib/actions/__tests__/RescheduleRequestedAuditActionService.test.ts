import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract, createMockEnrichmentDataStore } from "./dataRequirementsContractVerification";
import { RescheduleRequestedAuditActionService } from "../RescheduleRequestedAuditActionService";

describe("RescheduleRequestedAuditActionService", () => {
  let service: RescheduleRequestedAuditActionService;

  beforeEach(() => {
    service = new RescheduleRequestedAuditActionService();
  });

  describe("V2 schema (PII-free)", () => {
    const v2Fields = {
      rescheduleReason: "Need to change time",
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

    it("should not declare userUuids in data requirements for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.userUuids).toBeUndefined();
    });

    it("should return only reason in display JSON for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toEqual({ reason: "Need to change time" });
      expect(displayJson).not.toHaveProperty("requestedByUserUuid");
    });

    it("should return empty display fields for V2", async () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore({}, requirements);
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([]);
    });

    it("should fulfill data requirements contract for V2", async () => {
      const storedData = { version: 2, fields: v2Fields };
      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });
  });

  describe("V1 schema (backward compatibility)", () => {
    const v1Fields = {
      rescheduleReason: "Need to change time",
      rescheduledRequestedBy: "attendee@example.com",
    };

    it("should parse stored V1 data", () => {
      const storedData = { version: 1, fields: v1Fields };
      const parsed = service.parseStored(storedData);
      expect(parsed.version).toBe(1);
    });

    it("should not declare userUuids in data requirements for V1", () => {
      const storedData = { version: 1, fields: v1Fields };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.userUuids).toBeUndefined();
    });

    it("should return original V1 data with requestedBy in display JSON", () => {
      const storedData = { version: 1, fields: v1Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toHaveProperty("requestedBy", "attendee@example.com");
      expect(displayJson).not.toHaveProperty("requestedByUserUuid");
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
