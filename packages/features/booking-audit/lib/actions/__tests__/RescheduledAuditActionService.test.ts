import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract, createTrackingDbStore, createEmptyAccessedData } from "./contractVerification";
import { RescheduledAuditActionService } from "../RescheduledAuditActionService";

describe("RescheduledAuditActionService - getDataRequirements contract", () => {
  let service: RescheduledAuditActionService;

  beforeEach(() => {
    service = new RescheduledAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        startTime: { old: Date.now(), new: Date.now() + 86400000 },
        endTime: { old: Date.now() + 3600000, new: Date.now() + 90000000 },
        rescheduledToUid: { old: null, new: "new-booking-uid" },
        rescheduledBy: "user",
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});

describe("RescheduledAuditActionService - getDisplayTitle", () => {
  let service: RescheduledAuditActionService;

  beforeEach(() => {
    service = new RescheduledAuditActionService();
  });

  it("should generate deep link to booking drawer with history tab", async () => {
    const rescheduledToUid = "new-booking-uid-123";
    const storedData = {
      version: 1,
      fields: {
        startTime: { old: 1700000000000, new: 1700100000000 },
        endTime: { old: 1700003600000, new: 1700103600000 },
        rescheduledToUid: { old: null, new: rescheduledToUid },
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
          `/bookings?uid=${rescheduledToUid}&activeSegment=history`
        );
  });

  it("should not include components when rescheduledToUid is null", async () => {
    const storedData = {
      version: 1,
      fields: {
        startTime: { old: 1700000000000, new: 1700100000000 },
        endTime: { old: 1700003600000, new: 1700103600000 },
        rescheduledToUid: { old: null, new: null },
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

describe("RescheduledAuditActionService - getDisplayTitleForRescheduledFromLog", () => {
  let service: RescheduledAuditActionService;

  beforeEach(() => {
    service = new RescheduledAuditActionService();
  });

  it("should generate deep link to original booking's history tab", () => {
    const fromRescheduleUid = "original-booking-uid-456";
    const storedData = {
      version: 1,
      fields: {
        startTime: { old: 1700000000000, new: 1700100000000 },
        endTime: { old: 1700003600000, new: 1700103600000 },
        rescheduledToUid: { old: null, new: "some-uid" },
      },
    };

    const result = service.getDisplayTitleForRescheduledFromLog({
      fromRescheduleUid,
      userTimeZone: "UTC",
      storedData,
    });


    expect(result.components).toBeDefined();
    expect(result.components).toHaveLength(1);
        expect(result.components![0].href).toBe(
          `/bookings?uid=${fromRescheduleUid}&activeSegment=history`
        );
  });
});
