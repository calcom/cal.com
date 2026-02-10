import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
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
