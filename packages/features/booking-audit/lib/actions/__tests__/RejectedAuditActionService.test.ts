import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
import { RejectedAuditActionService } from "../RejectedAuditActionService";

describe("RejectedAuditActionService - getDataRequirements contract", () => {
  let service: RejectedAuditActionService;

  beforeEach(() => {
    service = new RejectedAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        rejectionReason: "Schedule conflict",
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
