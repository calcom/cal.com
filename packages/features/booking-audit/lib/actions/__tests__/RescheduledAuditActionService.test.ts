import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
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
