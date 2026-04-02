import { beforeEach, describe, expect, it } from "vitest";
import { RescheduleRequestedAuditActionService } from "../RescheduleRequestedAuditActionService";
import { verifyDataRequirementsContract } from "./contractVerification";

describe("RescheduleRequestedAuditActionService - getDataRequirements contract", () => {
  let service: RescheduleRequestedAuditActionService;

  beforeEach(() => {
    service = new RescheduleRequestedAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        rescheduleReason: "Need to change time",
        rescheduledRequestedBy: "attendee",
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
