import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
import { SeatBookedAuditActionService } from "../SeatBookedAuditActionService";

describe("SeatBookedAuditActionService - getDataRequirements contract", () => {
  let service: SeatBookedAuditActionService;

  beforeEach(() => {
    service = new SeatBookedAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        seatReferenceUid: "seat-123",
        attendeeEmail: "attendee@example.com",
        attendeeName: "John Doe",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
