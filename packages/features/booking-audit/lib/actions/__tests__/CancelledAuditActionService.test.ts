import { describe, expect, it, beforeEach } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import { verifyDataRequirementsContract } from "./dataRequirementsContractVerification";
import { CancelledAuditActionService } from "../CancelledAuditActionService";

describe("CancelledAuditActionService", () => {
  let service: CancelledAuditActionService;

  beforeEach(() => {
    service = new CancelledAuditActionService();
  });

  describe("V2 schema (PII-free)", () => {
    const v2Fields = {
      cancellationReason: "Schedule conflict",
      status: { old: BookingStatus.ACCEPTED, new: BookingStatus.CANCELLED },
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

    it("should return empty userUuids in data requirements", () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      expect(requirements.userUuids).toEqual([]);
    });

    it("should return display JSON without cancelledBy for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toEqual({
        cancellationReason: "Schedule conflict",
        previousStatus: BookingStatus.ACCEPTED,
        newStatus: BookingStatus.CANCELLED,
      });
      expect(displayJson).not.toHaveProperty("cancelledBy");
    });

    it("should fulfill data requirements contract for V2", async () => {
      const storedData = { version: 2, fields: v2Fields };
      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });
  });

  describe("V1 schema (backward compatibility)", () => {
    const v1Fields = {
      cancellationReason: "User requested cancellation",
      cancelledBy: "user@example.com",
      status: { old: BookingStatus.ACCEPTED, new: BookingStatus.CANCELLED },
    };

    it("should parse stored V1 data", () => {
      const storedData = { version: 1, fields: v1Fields };
      const parsed = service.parseStored(storedData);
      expect(parsed.version).toBe(1);
    });

    it("should return original V1 data with cancelledBy in display JSON", () => {
      const storedData = { version: 1, fields: v1Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toEqual({
        cancellationReason: "User requested cancellation",
        cancelledBy: "user@example.com",
        previousStatus: BookingStatus.ACCEPTED,
        newStatus: BookingStatus.CANCELLED,
      });
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
