import { describe, expect, it, beforeEach } from "vitest";

import {
  verifyDataRequirementsContract,
  createMockEnrichmentDataStore,
  createTrackingDbStore,
  createEmptyAccessedData,
} from "./dataRequirementsContractVerification";
import { SeatRescheduledAuditActionService } from "../SeatRescheduledAuditActionService";

describe("SeatRescheduledAuditActionService", () => {
  let service: SeatRescheduledAuditActionService;

  beforeEach(() => {
    service = new SeatRescheduledAuditActionService();
  });

  describe("V2 schema (PII-free)", () => {
    const v2Fields = {
      seatReferenceUid: "seat-456",
      attendeeId: 99,
      startTime: { old: 1700000000000, new: 1700086400000 },
      endTime: { old: 1700003600000, new: 1700090000000 },
      rescheduledToBookingUid: { old: null, new: "new-booking-uid" },
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
      expect(requirements.attendeeIds).toEqual([99]);
    });

    it("should return attendeeId in display JSON for V2", () => {
      const storedData = { version: 2, fields: v2Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toHaveProperty("attendeeId", 99);
    });

    it("should return enriched attendee in display fields for V2", async () => {
      const storedData = { version: 2, fields: v2Fields };
      const requirements = service.getDataRequirements(storedData);
      const dbStore = createMockEnrichmentDataStore(
        { attendees: [{ id: 99, name: "Jane Smith", email: "jane@example.com" }] },
        requirements
      );
      const displayFields = await service.getDisplayFields!({ storedData, dbStore });
      expect(displayFields).toEqual([
        { labelKey: "booking_audit_action.attendee", fieldValue: { type: "rawValue", value: "Jane Smith" } },
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
      seatReferenceUid: "seat-456",
      attendeeEmail: "attendee@example.com",
      startTime: { old: 1700000000000, new: 1700086400000 },
      endTime: { old: 1700003600000, new: 1700090000000 },
      rescheduledToBookingUid: { old: null, new: "new-booking-uid" },
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

    it("should return original V1 data with attendeeEmail in display JSON", () => {
      const storedData = { version: 1, fields: v1Fields };
      const displayJson = service.getDisplayJson({ storedData, userTimeZone: "UTC" });
      expect(displayJson).toHaveProperty("attendeeEmail", "attendee@example.com");
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

describe("SeatRescheduledAuditActionService - getDisplayTitle", () => {
  let service: SeatRescheduledAuditActionService;

  beforeEach(() => {
    service = new SeatRescheduledAuditActionService();
  });

  it("should generate deep link to booking drawer with history tab", async () => {
    const rescheduledToBookingUid = "new-booking-uid-789";
    const storedData = {
      version: 1,
      fields: {
        seatReferenceUid: "seat-456",
        attendeeEmail: "attendee@example.com",
        startTime: { old: 1700000000000, new: 1700100000000 },
        endTime: { old: 1700003600000, new: 1700103600000 },
        rescheduledToBookingUid: { old: null, new: rescheduledToBookingUid },
      },
    };

    const dbStore = createTrackingDbStore(createEmptyAccessedData());
    const result = await service.getDisplayTitle({
      storedData,
      userTimeZone: "UTC",
      dbStore,
    });

    expect(result.components).toBeDefined();
    expect(result.components).toHaveLength(1);
        expect(result.components![0].href).toBe(
          `/bookings?uid=${rescheduledToBookingUid}&activeSegment=history`
        );
  });

  it("should not include components when rescheduledToBookingUid is null", async () => {
    const storedData = {
      version: 1,
      fields: {
        seatReferenceUid: "seat-456",
        attendeeEmail: "attendee@example.com",
        startTime: { old: 1700000000000, new: 1700100000000 },
        endTime: { old: 1700003600000, new: 1700103600000 },
        rescheduledToBookingUid: { old: null, new: null },
      },
    };

    const dbStore = createTrackingDbStore(createEmptyAccessedData());
    const result = await service.getDisplayTitle({
      storedData,
      userTimeZone: "UTC",
      dbStore,
    });

    expect(result.components).toBeUndefined();
  });
});
