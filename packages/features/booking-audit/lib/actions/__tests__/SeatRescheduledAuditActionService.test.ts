import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract, createTrackingDbStore, createEmptyAccessedData } from "./contractVerification";
import { SeatRescheduledAuditActionService } from "../SeatRescheduledAuditActionService";

describe("SeatRescheduledAuditActionService - getDataRequirements contract", () => {
  let service: SeatRescheduledAuditActionService;

  beforeEach(() => {
    service = new SeatRescheduledAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        seatReferenceUid: "seat-456",
        attendeeEmail: "attendee@example.com",
        startTime: { old: Date.now(), new: Date.now() + 86400000 },
        endTime: { old: Date.now() + 3600000, new: Date.now() + 90000000 },
        rescheduledToBookingUid: { old: null, new: "new-booking-uid" },
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
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
